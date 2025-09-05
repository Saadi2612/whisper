from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timedelta
import asyncio
from typing import List, Optional, Dict
import re

# Import services and models
from services.supadata_service import SuperdataService
from services.llm_service import LLMService
from services.youtube_service import YouTubeService
from services.auth_service import AuthService
from services.scheduler_service import SchedulerService
from services.video_qa_service import VideoQAService
from services.transcript_formatter import TranscriptFormatterService
from models.video_models import (
    VideoProcessRequest, ProcessedVideo, VideoListResponse, 
    VideoProcessResponse, ChannelFollowRequest, FollowedChannel, SearchQuery,
    VideoAnalysis, ChartData, ChartPoint, TimelinePoint, VideoMetric
)
from models.auth_models import (
    UserRegister, UserLogin, User, UserResponse, UserSettings, SettingsUpdate
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize services
supadata_service = SuperdataService()
llm_service = LLMService()
youtube_service = YouTubeService()
auth_service = AuthService(db)
scheduler_service = SchedulerService(db, supadata_service, llm_service, youtube_service)
qa_service = VideoQAService()
transcript_formatter = TranscriptFormatterService()

# Security
security = HTTPBearer(auto_error=False)

# Create the main app
app = FastAPI(title="Whisper Dashboard API", version="1.0.0")

# Create API router
api_router = APIRouter(prefix="/api")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """Get current user from JWT token"""
    if not credentials:
        return None
    
    payload = auth_service.verify_token(credentials.credentials)
    if not payload:
        return None
    
    return payload.get('user_id')

async def require_auth(user_id: str = Depends(get_current_user)) -> str:
    """Require authentication"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id

# Optional authentication (for mixed endpoints)
async def optional_auth(user_id: str = Depends(get_current_user)) -> Optional[str]:
    """Optional authentication - returns None if not authenticated"""
    return user_id

# Helper functions
def extract_video_info(url: str) -> dict:
    """Extract basic video info from URL"""
    video_id = supadata_service.extract_video_id(url)
    
    # Try to get the channel name from the URL if available
    # This is a fallback - the real channel info should come from YouTube API
    return {
        'video_id': video_id,
        'title': f"Processing video...",
        'channel_name': "Processing...",
        'thumbnail': f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg" if video_id else None,
        'published_at': "Recently",
        'duration': "Unknown"
    }

async def process_channel_videos(channel_id: str, channel_name: str) -> List[ProcessedVideo]:
    """
    Fetch and process recent videos from a channel
    """
    try:
        # Get recent videos from YouTube
        videos_result = await youtube_service.get_channel_videos(channel_id, max_results=5)
        
        if videos_result['status'] != 'success':
            logger.error(f"Failed to get videos for channel {channel_name}: {videos_result.get('error')}")
            return []
        
        processed_videos = []
        
        for video_info in videos_result['videos']:
            try:
                # Check if already processed
                existing = await db.processed_videos.find_one({"video_id": video_info['video_id']})
                if existing:
                    processed_videos.append(ProcessedVideo(**existing))
                    continue
                
                logger.info(f"Processing video: {video_info['title']}")
                
                # Get transcript
                transcript_result = await supadata_service.get_video_transcript(
                    video_info['url'], 
                    lang='en', 
                    text=True
                )
                
                if transcript_result['status'] != 'completed':
                    logger.warning(f"Failed to get transcript for {video_info['title']}: {transcript_result.get('error')}")
                    continue
                
                # Generate AI analysis
                analysis_result = await llm_service.generate_video_summary(
                    transcript_result['content'],
                    title=video_info['title'],
                    channel_name=channel_name
                )
                
                if analysis_result['status'] != 'success':
                    logger.warning(f"Failed to generate analysis for {video_info['title']}: {analysis_result.get('error')}")
                    continue
                
                # Generate chart data
                chart_data = await llm_service.generate_chart_data(analysis_result['analysis'])
                
                # Create processed video
                processed_video = ProcessedVideo(
                    url=video_info['url'],
                    video_id=video_info['video_id'],
                    title=video_info['title'],
                    channel_name=channel_name,
                    channel_avatar=videos_result['channel_info']['avatar'],
                    thumbnail=video_info['thumbnail'],
                    published_at=youtube_service.format_publish_date(video_info['published_at']),
                    transcript=transcript_result['content'],
                    analysis=VideoAnalysis(**analysis_result['analysis']),
                    chart_data=ChartData(**chart_data),
                    language=transcript_result['lang']
                )
                
                # Save to database
                await db.processed_videos.insert_one(processed_video.dict())
                processed_videos.append(processed_video)
                
                logger.info(f"Successfully processed: {video_info['title']}")
                
            except Exception as e:
                logger.error(f"Error processing individual video {video_info.get('title', 'Unknown')}: {str(e)}")
                continue
        
        return processed_videos
        
    except Exception as e:
        logger.error(f"Error processing channel videos: {str(e)}")
        return []

async def generate_mock_channel_data(channel_name: str) -> dict:
    """Generate mock channel data for demo"""
    avatars = [
        "https://i.pravatar.cc/100?img=12",
        "https://i.pravatar.cc/100?img=22",
        "https://i.pravatar.cc/100?img=33",
        "https://i.pravatar.cc/100?img=44",
        "https://i.pravatar.cc/100?img=55"
    ]
    
    return {
        'channel_avatar': avatars[hash(channel_name) % len(avatars)],
        'subscriber_count': f"{(hash(channel_name) % 900) + 100}K subscribers"
    }

# Authentication Routes

@api_router.post("/auth/register", response_model=UserResponse)
async def register_user(user_data: UserRegister):
    """Register a new user"""
    try:
        result = await auth_service.create_user(
            email=user_data.email,
            password=user_data.password,
            name=user_data.name
        )
        
        if result['status'] == 'success':
            return UserResponse(
                status="success",
                user=User(**result['user']),
                token=result['token']
            )
        else:
            return UserResponse(
                status="error",
                error=result['error']
            )
            
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/login", response_model=UserResponse)
async def login_user(user_data: UserLogin):
    """Login user"""
    try:
        result = await auth_service.authenticate_user(
            email=user_data.email,
            password=user_data.password
        )
        
        if result['status'] == 'success':
            return UserResponse(
                status="success",
                user=User(**result['user']),
                token=result['token']
            )
        else:
            raise HTTPException(status_code=401, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_current_user_info(user_id: str = Depends(require_auth)):
    """Get current user information"""
    try:
        user = await auth_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"user": user}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/logout")
async def logout_user():
    """Logout user (client-side token removal)"""
    return {"status": "success", "message": "Logged out successfully"}

# Settings Routes

@api_router.get("/settings")
async def get_user_settings(user_id: str = Depends(require_auth)):
    """Get user settings"""
    try:
        user = await auth_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"settings": user.get('settings', {})}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/settings")
async def update_user_settings(settings: SettingsUpdate, user_id: str = Depends(require_auth)):
    """Update user settings"""
    try:
        from bson import ObjectId
        
        # Build update data
        update_data = {}
        if settings.auto_process_channels is not None:
            update_data['settings.auto_process_channels'] = settings.auto_process_channels
        if settings.notification_email is not None:
            update_data['settings.notification_email'] = settings.notification_email
        if settings.process_frequency is not None:
            update_data['settings.process_frequency'] = settings.process_frequency
        
        # Update user settings
        await db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_data}
        )
        
        return {"status": "success", "message": "Settings updated"}
        
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# API Routes

@api_router.get("/")
async def root():
    return {"message": "Whisper Dashboard API is running"}

@api_router.post("/videos/process", response_model=VideoProcessResponse)
async def process_video(request: VideoProcessRequest, background_tasks: BackgroundTasks, user_id: str = Depends(optional_auth)):
    """Process a YouTube video to get transcript and AI analysis"""
    try:
        # Validate URL
        if not supadata_service.is_supported_platform(request.url):
            raise HTTPException(status_code=400, detail="Unsupported video platform")
        
        # Check if video already exists for this user
        video_id = supadata_service.extract_video_id(request.url)
        query_filter = {"video_id": video_id}
        if user_id:
            query_filter["user_id"] = user_id
        
        existing_video = await db.processed_videos.find_one(query_filter)
        
        if existing_video:
            return VideoProcessResponse(
                status="success",
                video=ProcessedVideo(**existing_video)
            )
        
        logger.info(f"Processing video: {request.url}")
        
        # Get video info from YouTube API first
        try:
            # Extract video ID and get video details
            video_info_result = await youtube_service.get_video_details(video_id)
            
            if video_info_result['status'] == 'success':
                video_details = video_info_result['video']
                channel_info = video_details['channel']
            else:
                # Fallback to basic info
                video_details = {
                    'title': f"Video {video_id[:8]}",
                    'description': '',
                    'thumbnail': f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
                    'published_at': 'Recently',
                    'duration': 'Unknown'
                }
                channel_info = {
                    'name': 'Unknown Channel',
                    'avatar': 'https://i.pravatar.cc/100?img=1'
                }
        except Exception as e:
            logger.warning(f"Failed to get video details from YouTube API: {str(e)}")
            # Use fallback
            video_details = extract_video_info(request.url)
            channel_info = {
                'name': 'Unknown Channel', 
                'avatar': 'https://i.pravatar.cc/100?img=1'
            }
        
        # Get transcript from Supadata
        transcript_result = await supadata_service.get_video_transcript(
            request.url, 
            lang=request.language, 
            text=False  # Get timestamped version
        )
        
        if transcript_result['status'] != 'completed':
            return VideoProcessResponse(
                status="error",
                error=transcript_result.get('error', 'Failed to get transcript')
            )
        
        transcript_content = transcript_result['content']
        logger.info(f"Got transcript: {len(transcript_content)} characters")
        
        # Format the transcript for better readability
        try:
            format_result = await transcript_formatter.format_transcript(transcript_content)
            if format_result['status'] == 'success':
                formatted_transcript = format_result['formatted_transcript']
                logger.info("Transcript formatted successfully")
            else:
                formatted_transcript = transcript_content
                logger.warning(f"Transcript formatting failed: {format_result.get('error')}")
        except Exception as e:
            formatted_transcript = transcript_content
            logger.warning(f"Transcript formatting error: {str(e)}")
        
        # Generate AI analysis using original transcript
        analysis_result = await llm_service.generate_video_summary(
            transcript_content,  # Use original for analysis
            title=video_details.get('title', 'Unknown Title'),
            channel_name=channel_info.get('name', 'Unknown Channel')
        )
        
        if analysis_result['status'] != 'success':
            # Create basic analysis if comprehensive analysis fails
            logger.warning(f"Comprehensive analysis failed, creating basic analysis: {analysis_result.get('error')}")
            analysis_data = {
                'content_type': 'general',
                'executive_summary': f"Analysis of video '{video_details.get('title', 'Unknown Title')}' from {channel_info.get('name', 'Unknown Channel')}. The video content has been transcribed and is available for viewing.",
                'key_insights': ['Video content has been successfully transcribed', 'Full transcript is available for review'],
                'topics': ['video', 'content'],
                'metrics': [],
                'key_quotes': [],
                'actionable_takeaways': ['Watch the video or read the transcript for more insights'],
                'estimated_read_time': '3 minutes',
                'dynamic_sections': [],
                'entities': {'people': [], 'companies': [], 'products': [], 'locations': []},
                'confidence_score': 0.7
            }
        else:
            analysis_data = analysis_result['analysis']
        
        # Generate chart data - with fallback for new structure
        try:
            chart_data = await llm_service.generate_chart_data(analysis_data)
            
            # Ensure backward compatibility
            if 'keyPoints' not in chart_data:
                chart_data['keyPoints'] = chart_data.get('topicStrengths', [])
            if 'timeline' not in chart_data:
                chart_data['timeline'] = []
            
        except Exception as e:
            logger.warning(f"Chart generation failed, using fallback: {str(e)}")
            chart_data = {
                'keyPoints': [{'label': 'Content', 'score': 85}],
                'timeline': [],
                'charts': [],
                'topicStrengths': [{'label': 'Analysis', 'score': 80}],
                'contentType': 'general'
            }
        
        # Create processed video object with real data
        processed_video = ProcessedVideo(
            url=request.url,
            video_id=video_id,
            title=video_details.get('title', f"Video {video_id[:8]}"),
            channel_name=channel_info.get('name', 'Unknown Channel'),
            channel_avatar=channel_info.get('avatar', 'https://i.pravatar.cc/100?img=1'),
            thumbnail=video_details.get('thumbnail'),
            published_at=video_details.get('published_at', 'Recently'),
            duration=video_details.get('duration'),
            transcript=formatted_transcript,  # Use formatted transcript for display
            analysis=VideoAnalysis(**analysis_data),
            chart_data=ChartData(**chart_data),
            language=transcript_result['lang']
        )
        
        # Add user_id if authenticated
        video_dict = processed_video.dict()
        if user_id:
            video_dict['user_id'] = user_id
        
        # Save to database
        await db.processed_videos.insert_one(video_dict)
        
        logger.info(f"Video processed successfully: {processed_video.id}")
        
        return VideoProcessResponse(
            status="success",
            video=processed_video
        )
        
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/videos", response_model=VideoListResponse)
async def get_videos(page: int = 1, limit: int = 20, user_id: str = Depends(optional_auth)):
    """Get list of processed videos"""
    try:
        skip = (page - 1) * limit
        
        # Filter by user if authenticated
        query_filter = {}
        if user_id:
            query_filter['user_id'] = user_id
        
        videos_cursor = db.processed_videos.find(query_filter).sort("processed_at", -1).skip(skip).limit(limit)
        videos_list = await videos_cursor.to_list(length=limit)
        
        total = await db.processed_videos.count_documents(query_filter)
        
        videos = [ProcessedVideo(**video) for video in videos_list]
        
        return VideoListResponse(
            videos=videos,
            total=total,
            page=page,
            limit=limit
        )
        
    except Exception as e:
        logger.error(f"Error getting videos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/channels/follow")
async def follow_channel(request: ChannelFollowRequest, background_tasks: BackgroundTasks, user_id: str = Depends(optional_auth)):
    """Follow a YouTube channel and automatically process recent videos"""
    try:
        channel_url = request.channel_url.strip()
        
        # Extract channel identifier
        channel_identifier = youtube_service.extract_channel_id_from_url(channel_url)
        if not channel_identifier:
            if '@' in channel_url:
                channel_identifier = '@' + channel_url.split('@')[-1]
            else:
                channel_identifier = channel_url.split('/')[-1]
        
        # Get real channel info from YouTube API
        channel_info_result = await youtube_service.get_channel_info(channel_identifier)
        
        if channel_info_result['status'] != 'success':
            raise HTTPException(status_code=400, detail=f"Failed to find channel: {channel_info_result.get('error')}")
        
        channel_info = channel_info_result['channel']
        
        # Create a user_id for non-authenticated users (demo mode)
        effective_user_id = user_id or "demo_user"
        
        # Check if already following for this user
        existing = await db.followed_channels.find_one({
            "channel_id": channel_info['id'],
            "user_id": effective_user_id
        })
        
        if existing:
            return {"status": "already_following", "channel": FollowedChannel(**existing)}
        
        # Create followed channel record
        followed_channel = FollowedChannel(
            channel_name=channel_info['name'],
            channel_url=channel_url,
            channel_id=channel_info['id'],
            avatar_url=channel_info['avatar'],
            subscriber_count=f"{int(channel_info['subscriber_count']):,} subscribers" if channel_info['subscriber_count'].isdigit() else channel_info['subscriber_count'],
            video_count=int(channel_info['video_count']) if channel_info['video_count'].isdigit() else 0
        )
        
        # Add user_id to the channel data
        channel_dict = followed_channel.dict()
        channel_dict['user_id'] = effective_user_id
        
        # Save to database
        await db.followed_channels.insert_one(channel_dict)
        
        # Process recent videos from this channel in the background
        background_tasks.add_task(
            scheduler_service.process_channel_videos_for_user,
            effective_user_id,
            channel_info['id'],
            channel_info['name']
        )
        
        logger.info(f"User {effective_user_id} started following channel: {channel_info['name']}")
        
        return {"status": "success", "channel": followed_channel}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error following channel: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/channels/following")
async def get_following_channels(user_id: str = Depends(optional_auth)):
    """Get list of followed channels"""
    try:
        # Use demo_user for non-authenticated users
        effective_user_id = user_id or "demo_user"
        
        channels_cursor = db.followed_channels.find({"user_id": effective_user_id}).sort("followed_at", -1)
        channels_list = await channels_cursor.to_list(length=100)
        
        channels = [FollowedChannel(**channel) for channel in channels_list]
        
        return {"channels": channels, "total": len(channels)}
        
    except Exception as e:
        logger.error(f"Error getting followed channels: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/stats")
async def get_user_stats(user_id: str = Depends(optional_auth)):
    """Get user statistics"""
    try:
        # Use demo_user for non-authenticated users
        effective_user_id = user_id or "demo_user"
        
        query_filter = {'user_id': effective_user_id}
        
        total_videos = await db.processed_videos.count_documents(query_filter)
        total_channels = await db.followed_channels.count_documents(query_filter)
        
        # Calculate estimated time saved (mock calculation)
        estimated_hours = total_videos * 0.75  # Assume 45 minutes saved per video
        
        return {
            "videos_processed": total_videos,
            "hours_saved": f"{estimated_hours:.0f}h",
            "channels_followed": total_channels,
            "total_transcripts": total_videos
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/videos/{video_id}", response_model=ProcessedVideo)
async def get_video(video_id: str):
    """Get a specific video by ID"""
    try:
        video = await db.processed_videos.find_one({"id": video_id})
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        return ProcessedVideo(**video)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting video {video_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/channels/follow")
async def follow_channel(request: ChannelFollowRequest, background_tasks: BackgroundTasks):
    """Follow a YouTube channel and automatically process recent videos"""
    try:
        channel_url = request.channel_url.strip()
        
        # Extract channel identifier
        channel_identifier = youtube_service.extract_channel_id_from_url(channel_url)
        if not channel_identifier:
            # If no ID found, try to use the URL as is or extract from end
            if '@' in channel_url:
                channel_identifier = channel_url.split('@')[-1]
            else:
                channel_identifier = channel_url.split('/')[-1]
        
        # Get real channel info from YouTube API
        channel_info_result = await youtube_service.get_channel_info(channel_identifier)
        
        if channel_info_result['status'] != 'success':
            raise HTTPException(status_code=400, detail=f"Failed to find channel: {channel_info_result.get('error')}")
        
        channel_info = channel_info_result['channel']
        
        # Check if already following
        existing = await db.followed_channels.find_one({"channel_id": channel_info['id']})
        if existing:
            return {"status": "already_following", "channel": FollowedChannel(**existing)}
        
        # Create followed channel record
        followed_channel = FollowedChannel(
            channel_name=channel_info['name'],
            channel_url=channel_url,
            channel_id=channel_info['id'],
            avatar_url=channel_info['avatar'],
            subscriber_count=f"{int(channel_info['subscriber_count']):,} subscribers" if channel_info['subscriber_count'].isdigit() else channel_info['subscriber_count'],
            video_count=int(channel_info['video_count']) if channel_info['video_count'].isdigit() else 0
        )
        
        # Save to database
        await db.followed_channels.insert_one(followed_channel.dict())
        
        # Process recent videos from this channel in the background
        background_tasks.add_task(
            process_channel_videos,
            channel_info['id'],
            channel_info['name']
        )
        
        logger.info(f"Started processing videos for channel: {channel_info['name']}")
        
        return {"status": "success", "channel": followed_channel}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error following channel: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/channels/following")
async def get_following_channels():
    """Get list of followed channels"""
    try:
        channels_cursor = db.followed_channels.find().sort("followed_at", -1)
        channels_list = await channels_cursor.to_list(length=100)
        
        channels = [FollowedChannel(**channel) for channel in channels_list]
        
        return {"channels": channels, "total": len(channels)}
        
    except Exception as e:
        logger.error(f"Error getting followed channels: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/search/videos")
async def search_videos(q: str, page: int = 1, limit: int = 20):
    """Search processed videos"""
    try:
        skip = (page - 1) * limit
        
        # Create search query
        search_filter = {
            "$or": [
                {"title": {"$regex": q, "$options": "i"}},
                {"channel_name": {"$regex": q, "$options": "i"}},
                {"analysis.topics": {"$regex": q, "$options": "i"}},
                {"analysis.executive_summary": {"$regex": q, "$options": "i"}}
            ]
        }
        
        videos_cursor = db.processed_videos.find(search_filter).sort("processed_at", -1).skip(skip).limit(limit)
        videos_list = await videos_cursor.to_list(length=limit)
        
        total = await db.processed_videos.count_documents(search_filter)
        
        videos = [ProcessedVideo(**video) for video in videos_list]
        
        return VideoListResponse(
            videos=videos,
            total=total,
            page=page,
            limit=limit
        )
        
    except Exception as e:
        logger.error(f"Error searching videos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/channels/refresh-videos")
async def refresh_videos_from_followed_channels(background_tasks: BackgroundTasks):
    """Refresh videos from all followed channels"""
    try:
        # Get all followed channels
        channels_cursor = db.followed_channels.find()
        channels_list = await channels_cursor.to_list(length=100)
        
        processed_count = 0
        
        for channel_data in channels_list:
            if channel_data.get('channel_id'):
                # Process videos in background
                background_tasks.add_task(
                    process_channel_videos,
                    channel_data['channel_id'],
                    channel_data['channel_name']
                )
                processed_count += 1
        
        return {
            "status": "success", 
            "message": f"Started processing videos from {processed_count} channels",
            "channels_processed": processed_count
        }
        
    except Exception as e:
        logger.error(f"Error refreshing videos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/stats")
async def get_user_stats():
    """Get user statistics"""
    try:
        total_videos = await db.processed_videos.count_documents({})
        total_channels = await db.followed_channels.count_documents({})
        
        # Calculate estimated time saved (mock calculation)
        estimated_hours = total_videos * 0.75  # Assume 45 minutes saved per video
        
        return {
            "videos_processed": total_videos,
            "hours_saved": f"{estimated_hours:.0f}h",
            "channels_followed": total_channels,
            "total_transcripts": total_videos
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/videos/{video_id}/ask")
async def ask_question_about_video(video_id: str, question: Dict[str, str], user_id: str = Depends(optional_auth)):
    """Ask a follow-up question about a specific video"""
    try:
        # Find the video
        query_filter = {"id": video_id}
        if user_id:
            query_filter["user_id"] = user_id
        
        video = await db.processed_videos.find_one(query_filter)
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Answer the question
        answer_result = await qa_service.answer_question(
            question.get('question', ''),
            {
                'title': video.get('title', ''),
                'transcript': video.get('transcript', ''),
                'analysis': video.get('analysis', {})
            }
        )
        
        if answer_result['status'] == 'success':
            return {
                'answer': answer_result['answer'],
                'question': answer_result['question'],
                'confidence': answer_result['confidence']
            }
        else:
            raise HTTPException(status_code=500, detail=answer_result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error answering question: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/videos/{video_id}/suggested-questions")
async def get_suggested_questions(video_id: str, user_id: str = Depends(optional_auth)):
    """Get suggested follow-up questions for a video"""
    try:
        # Find the video
        query_filter = {"id": video_id}
        if user_id:
            query_filter["user_id"] = user_id
        
        video = await db.processed_videos.find_one(query_filter)
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Generate suggested questions
        suggested_questions = await qa_service.get_suggested_questions(video.get('analysis', {}))
        
        return {
            'questions': suggested_questions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting suggested questions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the API router
app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Whisper Dashboard API")
    
    # Start the background scheduler for automatic video processing
    scheduler_service.start_scheduler()
    logger.info("Background video processing scheduler started")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Cleanup on shutdown"""
    scheduler_service.stop_scheduler()
    client.close()
    logger.info("Application shutdown complete")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)