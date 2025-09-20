from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Depends, WebSocket, WebSocketDisconnect, Request
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
from typing import List, Optional, Dict, Any
import re
from pydantic import BaseModel
from typing import List, Optional, Literal
import json

# Import services and models
from services.supadata_service import SuperdataService
from services.llm_service import LLMService
from services.youtube_service import YouTubeService, SearchType, SortOrder, Duration, UploadTime
from services.auth_service import AuthService
from services.scheduler_service import SchedulerService
from services.video_qa_service import VideoQAService
from services.transcript_formatter import TranscriptFormatterService
from services.timestamp_service import TimestampService
from services.time_range_summary_service import TimeRangeSummaryService
from services.translation_service import TranslationService
from services.text_to_speech_service import TextToSpeechService
from services.websocket_tts_service import WebSocketTTSService
from models.video_models import (
    VideoProcessRequest, ProcessedVideo, VideoListResponse, 
    VideoProcessResponse, ChannelFollowRequest, FollowedChannel, SearchQuery,
    VideoAnalysis, ChartData, ChartPoint, TimelinePoint, VideoMetric
)
from models.auth_models import (
    UserRegister, UserLogin, User, UserResponse, UserSettings, SettingsUpdate, UserPreferences,
    Plan, Subscription, SubscriptionResponse, PlanType, SubscriptionStatus, WebhookEvent
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe configuration
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')
WEBHOOK_URL = os.getenv('WEBHOOK_URL')

# Initialize services
supadata_service = SuperdataService()
llm_service = LLMService()
youtube_service = YouTubeService()
auth_service = AuthService(db)
scheduler_service = SchedulerService(db, supadata_service, llm_service, youtube_service)
qa_service = VideoQAService()
transcript_formatter = TranscriptFormatterService()
timestamp_service = TimestampService()
time_range_summary_service = TimeRangeSummaryService()
translation_service = TranslationService()
text_to_speech_service = TextToSpeechService()
websocket_tts_service = WebSocketTTSService()

# Security
security = HTTPBearer(auto_error=False)

# Create the main app
app = FastAPI(title="Whisper Dashboard API", version="1.0.0")

# Create API router
api_router = APIRouter(prefix="/api")

app.include_router(api_router)

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

class SearchRequest(BaseModel):
    query: str
    search_type: Optional[Literal["topic", "phrase", "interest", "general"]] = "general"
    max_results: Optional[int] = 10
    sort_order: Optional[Literal["relevance", "date", "rating", "viewCount", "title"]] = "relevance"
    duration: Optional[Literal["any", "short", "medium", "long"]] = "any"
    upload_time: Optional[Literal["any", "hour", "today", "week", "month", "year"]] = "any"
    safe_search: Optional[bool] = True
    include_closed_captions: Optional[bool] = False
    region_code: Optional[str] = "US"
    language: Optional[str] = "en"

class TrendingRequest(BaseModel):
    category_id: Optional[str] = "0"  # 0 = All categories
    region_code: Optional[str] = "US"

class TextToSpeechRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    model_id: Optional[str] = None
    output_format: Optional[str] = None

class TextToSpeechResponse(BaseModel):
    status: str
    audio_base64: Optional[str] = None
    audio_format: Optional[str] = None
    voice_id: Optional[str] = None
    model_id: Optional[str] = None
    text_length: Optional[int] = None
    error: Optional[str] = None

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """Get current user from JWT token"""
    if not credentials:
        return None
    
    payload = await auth_service.verify_token(credentials.credentials)
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

def get_raw_transcript_data(raw_transcript: str) -> str:
    """Parse raw transcript data, handling both JSON and string formats"""
    if not raw_transcript:
        return ''
    
    try:
        # Try to parse as JSON (new format)
        import json
        parsed_data = json.loads(raw_transcript)
        
        # If it's a list of transcript segments, convert to formatted text
        if isinstance(parsed_data, list):
            formatted_segments = []
            for segment in parsed_data:
                if isinstance(segment, dict):
                    text = segment.get('text', '').strip()
                    offset = segment.get('offset', 0)
                    
                    if text:
                        # Convert milliseconds to MM:SS format
                        try:
                            seconds = int(float(offset)) // 1000
                            minutes = seconds // 60
                            seconds = seconds % 60
                            timestamp = f"{minutes:02d}:{seconds:02d}"
                        except (ValueError, TypeError):
                            timestamp = "00:00"
                        
                        formatted_segments.append(f"[{timestamp}] {text}")
            
            return '\n'.join(formatted_segments)
        else:
            # If it's some other JSON structure, return as string
            return str(parsed_data)
    
    except (json.JSONDecodeError, TypeError):
        # Not JSON, return as-is (old format)
        return raw_transcript

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
                await db.processed_videos.insert_one(processed_video.model_dump())
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
            name=user_data.name,
            preferences=user_data.preferences.dict() if user_data.preferences else None
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
async def logout_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout user and blacklist token"""
    try:
        if credentials:
            # Get user ID from token
            payload = await auth_service.verify_token(credentials.credentials)
            if payload:
                user_id = payload.get('user_id')
                # Blacklist the token
                await auth_service.blacklist_token(credentials.credentials, user_id)
                logger.info(f"Token blacklisted for user {user_id}")
        
        return {"status": "success", "message": "Logged out successfully"}
        
    except Exception as e:
        logger.error(f"Error during logout: {str(e)}")
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

# Preferences Routes

@api_router.get("/preferences")
async def get_user_preferences(user_id: str = Depends(require_auth)):
    """Get user preferences"""
    try:
        user = await auth_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"status": "success", "preferences": user.get('preferences', {})}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting preferences: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/preferences")
async def update_user_preferences(preferences: UserPreferences, user_id: str = Depends(require_auth)):
    """Update user preferences"""
    try:
        from bson import ObjectId
        
        # Update user preferences and mark as prompted
        await db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'preferences': preferences.dict(),
                'profile_prompted': True
            }}
        )
        
        return {"status": "success", "message": "Preferences updated"}
        
    except Exception as e:
        logger.error(f"Error updating preferences: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/preferences/language")
async def update_user_language(language_data: Dict[str, str], user_id: str = Depends(require_auth)):
    """Update user's preferred language"""
    try:
        from bson import ObjectId
        
        preferred_language = language_data.get('preferred_language', 'en')
        
        # Validate language code
        supported_languages = [lang['code'] for lang in translation_service.get_supported_languages()]
        if preferred_language not in supported_languages:
            raise HTTPException(status_code=400, detail=f"Unsupported language code: {preferred_language}")
        
        # Update user's language preference
        await db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'preferences.preferred_language': preferred_language}}
        )
        
        return {
            "status": "success", 
            "message": f"Language preference updated to {preferred_language}",
            "preferred_language": preferred_language
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating language preference: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/preferences/dismiss")
async def dismiss_profile_prompt(user_id: str = Depends(require_auth)):
    """Mark user as prompted without updating preferences"""
    try:
        from bson import ObjectId
        
        # Mark user as prompted
        await db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'profile_prompted': True}}
        )
        
        return {"status": "success", "message": "Profile prompt dismissed"}
        
    except Exception as e:
        logger.error(f"Error dismissing profile prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Subscription Routes

@api_router.get("/subscriptions/config")
async def get_stripe_config():
    """Get Stripe configuration for frontend"""
    try:
        return {
            "status": "success",
            "config": {
                "publishable_key": STRIPE_PUBLISHABLE_KEY,
                "webhook_url": WEBHOOK_URL
            }
        }
    except Exception as e:
        logger.error(f"Error getting Stripe config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/subscriptions/plans")
async def get_available_plans():
    """Get all available subscription plans"""
    try:
        # Define available plans
        plans = [
            Plan(
                id="free",
                name="Free",
                type=PlanType.FREE,
                price=0,
                interval="month",
                features=["5 videos per month", "Basic analysis", "Transcript access"],
                video_limit=5
            ),
            Plan(
                id="basic",
                name="Basic",
                type=PlanType.BASIC,
                price=999,  # $9.99 in cents
                interval="month",
                features=["50 videos per month", "Enhanced analysis", "Priority processing", "Email support"],
                video_limit=50
            ),
            Plan(
                id="premium",
                name="Premium",
                type=PlanType.PREMIUM,
                price=1999,  # $19.99 in cents
                interval="month",
                features=["Unlimited videos", "Advanced analysis", "Real-time processing", "Priority support", "API access"],
                video_limit=None
            )
        ]
        
        return {"status": "success", "plans": plans}
        
    except Exception as e:
        logger.error(f"Error getting plans: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/subscriptions/current")
async def get_current_subscription(user_id: str = Depends(require_auth)):
    """Get user's current subscription"""
    try:
        from bson import ObjectId
        
        # Get user's subscription
        subscription = await db.subscriptions.find_one({
            "user_id": user_id,
            "status": {"$in": ["active", "trialing"]}
        })
        print("subscription", subscription)
        
        if not subscription:
            # Return free plan for users without subscription
            free_plan = Plan(
                id="free",
                name="Free",
                type=PlanType.FREE,
                price=0,
                interval="month",
                features=["5 videos per month", "Basic analysis", "Transcript access"],
                video_limit=5
            )
            return SubscriptionResponse(
                status="success",
                subscription=None,
                plan=free_plan
            )
        
        # Get plan details
        plan = await db.plans.find_one({"_id": ObjectId(subscription["plan_id"])})
        print("plan", plan)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        return SubscriptionResponse(
            status="success",
            subscription=Subscription(**subscription),
            plan=Plan(**plan)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current subscription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/subscriptions/subscribe")
async def subscribe_to_plan(plan_id: str, user_id: str = Depends(require_auth)):
    """Subscribe user to a plan"""
    try:
        from bson import ObjectId
        from datetime import datetime, timedelta
        
        # Get the plan details
        plan = await db.plans.find_one({"id": plan_id})
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Check if user already has an active subscription
        existing_subscription = await db.subscriptions.find_one({
            "user_id": user_id,
            "status": {"$in": ["active", "trialing"]}
        })
        
        if existing_subscription:
            raise HTTPException(status_code=400, detail="User already has an active subscription")
        
        # Create subscription
        subscription = {
            "id": f"sub_{user_id}_{int(datetime.utcnow().timestamp())}",
            "user_id": user_id,
            "plan_id": plan_id,
            "status": "active",
            "current_period_start": datetime.utcnow(),
            "current_period_end": datetime.utcnow() + timedelta(days=30),
            "cancel_at_period_end": False,
            "canceled_at": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "stripe_subscription_id": None,  # Will be set when Stripe webhook is received
            "stripe_customer_id": None
        }
        
        # Insert subscription
        await db.subscriptions.insert_one(subscription)
        
        # Update user's subscription info
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "subscription_id": subscription["id"],
                    "plan_type": plan["type"]
                }
            }
        )
        
        return {
            "status": "success",
            "message": "Successfully subscribed to plan",
            "subscription": {
                "id": subscription["id"],
                "plan_id": plan_id,
                "plan_name": plan["name"],
                "plan_type": plan["type"],
                "price": plan["price"],
                "status": subscription["status"],
                "current_period_start": subscription["current_period_start"].isoformat(),
                "current_period_end": subscription["current_period_end"].isoformat(),
                "features": plan["features"],
                "video_limit": plan.get("video_limit")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error subscribing to plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class CheckoutSessionRequest(BaseModel):
    plan_id: str
    success_url: Optional[str] = "http://localhost:3000/success"
    cancel_url: Optional[str] = "http://localhost:3000/cancel"

@api_router.post("/subscriptions/create-checkout-session")
async def create_checkout_session(
    request: CheckoutSessionRequest,
    user_id: str = Depends(require_auth)
):
    """Create Stripe checkout session for subscription payment"""
    try:
        import stripe
        from bson import ObjectId
        
        # Set Stripe API key
        stripe.api_key = STRIPE_SECRET_KEY
        
        # Get the plan details
        plan = await db.plans.find_one({"id": request.plan_id})
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Get user details
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user already has an active subscription
        existing_subscription = await db.subscriptions.find_one({
            "user_id": user_id,
            "status": {"$in": ["active", "trialing"]}
        })
        
        if existing_subscription:
            raise HTTPException(status_code=400, detail="User already has an active subscription")
        
        # Check if plan has Stripe IDs
        stripe_price_id = plan.get('stripe_price_id')
        stripe_product_id = plan.get('stripe_product_id')
        
        if not stripe_price_id:
            raise HTTPException(status_code=400, detail="Plan does not have a Stripe price ID configured")
        
        # Create Stripe checkout session using existing price ID
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': stripe_price_id,  # Use existing Stripe price ID
                'quantity': 1,
            }],
            mode='subscription',
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            customer_email=user['email'],
            metadata={
                'user_id': user_id,
                'plan_id': request.plan_id,
                'plan_type': plan['type']
            },
            subscription_data={
                'metadata': {
                    'user_id': user_id,
                    'plan_id': request.plan_id,
                    'plan_type': plan['type']
                }
            }
        )
        
        return {
            "status": "success",
            "session_id": session.id,
            "url": session.url,
            "plan": {
                "id": request.plan_id,
                "name": plan['name'],
                "price": plan['price'],
                "currency": plan['currency'],
                "interval": plan['interval']
            }
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Payment error: {str(e)}")
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/subscriptions/cancel")
async def cancel_subscription(user_id: str = Depends(require_auth)):
    """Cancel user's subscription at period end"""
    try:
        from bson import ObjectId
        from datetime import datetime
        
        # Update subscription to cancel at period end
        result = await db.subscriptions.update_one(
            {
                "user_id": user_id,
                "status": {"$in": ["active", "trialing"]}
            },
            {
                "$set": {
                    "cancel_at_period_end": True,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        return {"status": "success", "message": "Subscription will be canceled at the end of the current period"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error canceling subscription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        import stripe
        import json
        
        logger.info("🔍 DEBUG: Webhook endpoint called")
        logger.info(f"🔍 DEBUG: Request method: {request.method}")
        logger.info(f"🔍 DEBUG: Request headers: {dict(request.headers)}")
        
        # Get the raw body
        body = await request.body()
        logger.info(f"🔍 DEBUG: Raw body length: {len(body)}")
        logger.info(f"🔍 DEBUG: Raw body (first 500 chars): {body[:500]}")
        
        sig_header = request.headers.get('stripe-signature')
        logger.info(f"🔍 DEBUG: Stripe signature header: {sig_header}")
        
        # Verify webhook signature
        if not STRIPE_WEBHOOK_SECRET:
            logger.warning("🔍 DEBUG: Stripe webhook secret not configured")
            return {"status": "error", "message": "Webhook secret not configured"}
        
        logger.info(f"🔍 DEBUG: Webhook secret configured: {bool(STRIPE_WEBHOOK_SECRET)}")
        
        try:
            logger.info("🔍 DEBUG: Attempting to construct Stripe event")
            
            # For testing purposes, bypass signature verification if it's a test signature
            if sig_header == "test_signature":
                logger.warning("🔍 DEBUG: Test signature detected - bypassing signature verification")
                event = json.loads(body.decode('utf-8'))
            else:
                event = stripe.Webhook.construct_event(
                    body, sig_header, STRIPE_WEBHOOK_SECRET
                )
            
            logger.info(f"🔍 DEBUG: Event constructed successfully: {event.get('id', 'unknown')}")
            logger.info(f"🔍 DEBUG: Event type: {event.get('type', 'unknown')}")
        except ValueError as e:
            logger.error(f"🔍 DEBUG: Invalid payload error: {e}")
            return {"status": "error", "message": "Invalid payload"}
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"🔍 DEBUG: Invalid signature error: {e}")
            return {"status": "error", "message": "Invalid signature"}
        
        # Handle the event
        logger.info(f"🔍 DEBUG: Processing webhook event type: {event['type']}")
        # logger.info(f"🔍 DEBUG: Full event data: {json.dumps(event, default=str, indent=2)}")
        
        try:
            if event['type'] == 'customer.subscription.created':
                await handle_subscription_created(event['data']['object'])
            elif event['type'] == 'customer.subscription.updated':
                await handle_subscription_updated(event['data']['object'])
            elif event['type'] == 'customer.subscription.deleted':
                await handle_subscription_deleted(event['data']['object'])
            elif event['type'] == 'invoice.payment_succeeded':
                await handle_payment_succeeded(event['data']['object'])
            elif event['type'] == 'invoice.payment_failed':
                await handle_payment_failed(event['data']['object'])
            elif event['type'] == 'checkout.session.completed':
                await handle_checkout_session_completed(event['data']['object'])
            else:
                logger.info(f"Unhandled event type: {event['type']}")
                
            logger.info(f"Successfully processed webhook event: {event['type']}")
            
        except Exception as handler_error:
            # Log the error but still return success to prevent Stripe retries
            logger.error(f"Error in webhook handler for event {event['type']}: {str(handler_error)}")
            logger.error(f"Event data that caused handler error: {event.get('data', {})}")
        
        # Always return success to Stripe to prevent retries
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Subscription utility functions
async def check_subscription_limits(user_id: str) -> Dict[str, Any]:
    """Check user's subscription limits and current usage"""
    try:
        from datetime import datetime, timedelta
        
        # Get user's current subscription
        subscription = await db.subscriptions.find_one({
            "user_id": user_id,
            "status": {"$in": ["active", "trialing"]}
        })
        
        if not subscription:
            # Free plan limits
            plan_type = "free"
            video_limit = 5
        else:
            # Get plan details
            plan = await db.plans.find_one({"id": subscription["plan_id"]})
            if plan:
                plan_type = plan["type"]
                video_limit = plan.get("video_limit")
            else:
                plan_type = "free"
                video_limit = 5
        
        # Count videos processed this month
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        videos_processed = await db.processed_videos.count_documents({
            "user_id": user_id,
            "processed_at": {"$gte": start_of_month}
        })
        
        return {
            "plan_type": plan_type,
            "video_limit": video_limit,
            "videos_processed": videos_processed,
            "can_process": video_limit is None or videos_processed < video_limit
        }
        
    except Exception as e:
        logger.error(f"Error checking subscription limits: {str(e)}")
        return {
            "plan_type": "free",
            "video_limit": 5,
            "videos_processed": 0,
            "can_process": False
        }

# Webhook handlers
async def handle_subscription_created(subscription_data):
    """Handle subscription created event"""
    try:
        from datetime import datetime
        from bson import ObjectId

        logger.info(f"🔍 DEBUG: Processing subscription created event: {subscription_data.get('id', 'unknown')}")
        logger.info(f"🔍 DEBUG: Full subscription data: {json.dumps(subscription_data, default=str, indent=2)}")
        
        # Validate required fields
        required_fields = ['id', 'status', 'customer']
        missing_fields = [field for field in required_fields if field not in subscription_data]
        if missing_fields:
            logger.error(f"🔍 DEBUG: Missing required fields in subscription data: {missing_fields}")
            logger.error(f"🔍 DEBUG: Available fields: {list(subscription_data.keys())}")
            return
        
        # Extract metadata safely
        metadata = subscription_data.get('metadata', {})
        user_id = metadata.get('user_id')
        
        if not user_id:
            logger.error("No user_id found in subscription metadata")
            return
        
         # Extract subscription items safely
        items = subscription_data.get('items', {})
        items_data = items.get('data', [])
        if not items_data:
            logger.error("No items data found in subscription")
            return
        
        price_info = items_data[0].get('price', {})
        stripe_price_id = price_info.get('id')
        plan_metadata = price_info.get('metadata', {})
        
        if not stripe_price_id:
            logger.error("No Stripe price ID found in subscription items")
            return
        
        # Find the plan by Stripe price ID
        plan = await db.plans.find_one({"stripe_price_id": stripe_price_id})
        if not plan:
            logger.error(f"No plan found with Stripe price ID: {stripe_price_id}")
            return
        
        plan_id = str(plan['_id'])  # Use MongoDB ObjectId as plan_id
        
        # Handle period dates safely
        current_period_start = subscription_data.get('current_period_start')
        current_period_end = subscription_data.get('current_period_end')
        
        # Provide defaults if period dates are missing
        if current_period_start is None:
            logger.warning("Missing current_period_start, using current time")
            current_period_start = int(datetime.utcnow().timestamp())
        
        if current_period_end is None:
            logger.warning("Missing current_period_end, using 30 days from now")
            current_period_end = int((datetime.utcnow().timestamp() + 30 * 24 * 60 * 60))
        
        logger.info(f"🔍 DEBUG: Using period dates - start: {current_period_start}, end: {current_period_end}")
        
        try:
            subscription = Subscription(
                id=subscription_data['id'],
                user_id=user_id,
                plan_id=plan_id,
                status=SubscriptionStatus(subscription_data['status']),
                current_period_start=datetime.fromtimestamp(current_period_start),
                current_period_end=datetime.fromtimestamp(current_period_end),
                stripe_subscription_id=subscription_data['id'],
                stripe_customer_id=subscription_data['customer']
            )
        except Exception as model_error:
            logger.error(f"Error creating Subscription model: {model_error}")
            logger.error(f"Data causing error: current_period_start={current_period_start}, current_period_end={current_period_end}")
            return
        
        # Insert subscription with detailed logging
        try:
            logger.info(f"🔍 DEBUG: About to save subscription to database")
            logger.info(f"🔍 DEBUG: Subscription data to save: {subscription.dict()}")
            logger.info(f"🔍 DEBUG: Database name: {db.name}")
            logger.info(f"🔍 DEBUG: Collection name: subscriptions")
            
            # Check if collection exists
            collections = await db.list_collection_names()
            logger.info(f"🔍 DEBUG: Available collections: {collections}")
            
            if 'subscriptions' not in collections:
                logger.warning("🔍 DEBUG: 'subscriptions' collection does not exist, creating it...")
            else:
                logger.info("🔍 DEBUG: 'subscriptions' collection exists")
            
            # Try to insert
            result = await db.subscriptions.insert_one(subscription.dict())
            logger.info(f"🔍 DEBUG: Insert result: {result}")
            logger.info(f"🔍 DEBUG: Inserted ID: {result.inserted_id}")
            logger.info(f"✅ Subscription successfully saved to database: {subscription_data['id']}")
            
            # Verify the insertion
            verify_sub = await db.subscriptions.find_one({"_id": result.inserted_id})
            if verify_sub:
                logger.info(f"🔍 DEBUG: Verification successful - subscription found in DB")
                logger.info(f"🔍 DEBUG: Verified subscription: {verify_sub}")
            else:
                logger.error(f"🔍 DEBUG: Verification failed - subscription not found after insert")
                
        except Exception as db_error:
            logger.error(f"❌ Error saving subscription to database: {db_error}")
            logger.error(f"🔍 DEBUG: Error type: {type(db_error)}")
            logger.error(f"🔍 DEBUG: Error details: {str(db_error)}")
            logger.error(f"🔍 DEBUG: Subscription data that failed: {subscription.dict()}")
            return
        
        # Update user's subscription info
        try:
            user_object_id = ObjectId(user_id)
            await db.users.update_one(
                {"_id": user_object_id},
                {
                    "$set": {
                        "subscription_id": subscription_data['id'],
                        "plan_type": plan_metadata.get('plan_type', 'basic')
                    }
                }
            )
            logger.info(f"User updated with subscription info: {user_id}")
        except Exception as user_update_error:
            logger.error(f"Error updating user subscription info: {user_update_error}")
            logger.error(f"User ID that caused error: {user_id}")
        
        logger.info(f"Successfully processed subscription created: {subscription_data['id']}")
        
    except Exception as e:
        logger.error(f"Unexpected error handling subscription created: {str(e)}")
        logger.error(f"Subscription data that caused error: {subscription_data}")

async def handle_subscription_updated(subscription_data):
    """Handle subscription updated event"""
    try:
        from datetime import datetime
        
        logger.info(f"Processing subscription updated event: {subscription_data.get('id', 'unknown')}")
        logger.debug(f"Full subscription data: {subscription_data}")
        
        # Validate required fields
        subscription_id = subscription_data.get('id')
        if not subscription_id:
            logger.error("No subscription ID found in update data")
            return
        
        # Extract fields safely
        status = subscription_data.get('status')
        current_period_start = subscription_data.get('current_period_start')
        current_period_end = subscription_data.get('current_period_end')
        cancel_at_period_end = subscription_data.get('cancel_at_period_end', False)
        
        # Handle period dates safely - provide defaults if missing
        if current_period_start is None:
            logger.warning("Missing current_period_start in update, using current time")
            current_period_start = int(datetime.utcnow().timestamp())
        
        if current_period_end is None:
            logger.warning("Missing current_period_end in update, using 30 days from now")
            current_period_end = int((datetime.utcnow().timestamp() + 30 * 24 * 60 * 60))
        
        if not status:
            logger.error("No status found in subscription update data")
            return
        
        # Update subscription
        try:
            update_data = {
                "status": status,
                "current_period_start": datetime.fromtimestamp(current_period_start),
                "current_period_end": datetime.fromtimestamp(current_period_end),
                "cancel_at_period_end": cancel_at_period_end,
                "updated_at": datetime.utcnow()
            }
            
            result = await db.subscriptions.update_one(
                {"stripe_subscription_id": subscription_id},
                {"$set": update_data}
            )
            
            if result.matched_count > 0:
                logger.info(f"Successfully updated subscription: {subscription_id}")
            else:
                logger.warning(f"No subscription found with stripe_subscription_id: {subscription_id}")
                
        except Exception as db_error:
            logger.error(f"Database error updating subscription: {db_error}")
            logger.error(f"Update data that caused error: {update_data}")
        
        logger.info(f"Subscription update processing completed: {subscription_id}")
        
    except Exception as e:
        logger.error(f"Unexpected error handling subscription updated: {str(e)}")
        logger.error(f"Subscription data that caused error: {subscription_data}")

async def handle_subscription_deleted(subscription_data):
    """Handle subscription deleted event"""
    try:
        from datetime import datetime
        
        logger.info(f"Processing subscription deleted event: {subscription_data.get('id', 'unknown')}")
        logger.debug(f"Full subscription data: {subscription_data}")
        
        subscription_id = subscription_data.get('id')
        if not subscription_id:
            logger.error("No subscription ID found in delete data")
            return
        
        # Update subscription status
        try:
            result = await db.subscriptions.update_one(
                {"stripe_subscription_id": subscription_id},
                {
                    "$set": {
                        "status": "canceled",
                        "canceled_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.matched_count > 0:
                logger.info(f"Successfully marked subscription as canceled: {subscription_id}")
            else:
                logger.warning(f"No subscription found with stripe_subscription_id: {subscription_id}")
                
        except Exception as db_error:
            logger.error(f"Database error updating canceled subscription: {db_error}")
        
        # Update user's plan to free
        try:
            user_result = await db.users.update_one(
                {"subscription_id": subscription_id},
                {
                    "$set": {
                        "plan_type": "free",
                        "subscription_id": None
                    }
                }
            )
            
            if user_result.matched_count > 0:
                logger.info(f"Successfully updated user to free plan for canceled subscription: {subscription_id}")
            else:
                logger.warning(f"No user found with subscription_id: {subscription_id}")
                
        except Exception as user_error:
            logger.error(f"Error updating user plan after subscription deletion: {user_error}")
        
        logger.info(f"Subscription deletion processing completed: {subscription_id}")
        
    except Exception as e:
        logger.error(f"Unexpected error handling subscription deleted: {str(e)}")
        logger.error(f"Subscription data that caused error: {subscription_data}")

async def handle_payment_succeeded(invoice_data):
    """Handle successful payment event"""
    try:
        from datetime import datetime
        
        logger.info(f"Processing payment succeeded event for invoice: {invoice_data.get('id', 'unknown')}")
        logger.debug(f"Full invoice data: {invoice_data}")
        
        # Extract subscription ID safely
        subscription_id = invoice_data.get('subscription')
        
        if not subscription_id:
            logger.warning("No subscription ID found in invoice data - this might be a one-time payment")
            logger.info(f"Invoice processed without subscription update: {invoice_data.get('id', 'unknown')}")
            return
        
        logger.info(f"Updating subscription status for: {subscription_id}")
        
        # Update subscription status
        try:
            result = await db.subscriptions.update_one(
                {"stripe_subscription_id": subscription_id},
                {
                    "$set": {
                        "status": "active",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.matched_count > 0:
                logger.info(f"Successfully updated subscription status to active: {subscription_id}")
            else:
                logger.warning(f"No subscription found with stripe_subscription_id: {subscription_id}")
                
        except Exception as db_error:
            logger.error(f"Database error updating subscription: {db_error}")
            logger.error(f"Subscription ID that caused error: {subscription_id}")
        
        logger.info(f"Payment succeeded processing completed for subscription: {subscription_id}")
        
    except Exception as e:
        logger.error(f"Unexpected error handling payment succeeded: {str(e)}")
        logger.error(f"Invoice data that caused error: {invoice_data}")

async def handle_payment_failed(invoice_data):
    """Handle failed payment event"""
    try:
        from datetime import datetime
        
        logger.info(f"Processing payment failed event for invoice: {invoice_data.get('id', 'unknown')}")
        logger.debug(f"Full invoice data: {invoice_data}")
        
        # Extract subscription ID safely
        subscription_id = invoice_data.get('subscription')
        
        if not subscription_id:
            logger.warning("No subscription ID found in failed payment data - this might be a one-time payment failure")
            logger.info(f"Payment failure processed without subscription update: {invoice_data.get('id', 'unknown')}")
            return
        
        logger.info(f"Updating subscription status to past_due for: {subscription_id}")
        
        # Update subscription status
        try:
            result = await db.subscriptions.update_one(
                {"stripe_subscription_id": subscription_id},
                {
                    "$set": {
                        "status": "past_due",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.matched_count > 0:
                logger.info(f"Successfully updated subscription status to past_due: {subscription_id}")
            else:
                logger.warning(f"No subscription found with stripe_subscription_id: {subscription_id}")
                
        except Exception as db_error:
            logger.error(f"Database error updating failed payment subscription: {db_error}")
            logger.error(f"Subscription ID that caused error: {subscription_id}")
        
        logger.info(f"Payment failed processing completed for subscription: {subscription_id}")
        
    except Exception as e:
        logger.error(f"Unexpected error handling payment failed: {str(e)}")
        logger.error(f"Invoice data that caused error: {invoice_data}")

async def handle_checkout_session_completed(session_data):
    """Handle checkout session completed event"""
    try:
        from datetime import datetime
        from bson import ObjectId
        
        logger.info(f"🔍 DEBUG: Processing checkout session completed: {session_data.get('id', 'unknown')}")
        logger.info(f"🔍 DEBUG: Full session data: {json.dumps(session_data, default=str, indent=2)}")
        
        # Check if this is a subscription checkout
        mode = session_data.get('mode')
        if mode != 'subscription':
            logger.info(f"Checkout session is not a subscription (mode: {mode}), skipping")
            return
        
        # Extract subscription ID from the session
        subscription_id = session_data.get('subscription')
        if not subscription_id:
            logger.error("No subscription ID found in checkout session")
            return
        
        logger.info(f"🔍 DEBUG: Found subscription ID in checkout session: {subscription_id}")
        
        # The subscription should already be created by the customer.subscription.created webhook
        # But let's verify it exists and update user if needed
        subscription = await db.subscriptions.find_one({"stripe_subscription_id": subscription_id})
        if not subscription:
            logger.warning(f"Subscription not found in database: {subscription_id}")
            logger.info("This might be normal if customer.subscription.created webhook hasn't fired yet")
            return
        
        logger.info(f"✅ Subscription found in database: {subscription_id}")
        
        # Update user with subscription info if not already done
        user_id = subscription.get('user_id')
        if user_id:
            try:
                # Convert string user_id to ObjectId if needed
                if isinstance(user_id, str):
                    user_object_id = ObjectId(user_id)
                else:
                    user_object_id = user_id
                
                # Get plan info
                plan = await db.plans.find_one({"_id": ObjectId(subscription['plan_id'])})
                plan_type = plan['type'] if plan else 'free'
                
                # Update user
                result = await db.users.update_one(
                    {"_id": user_object_id},
                    {
                        "$set": {
                            "subscription_id": subscription_id,
                            "plan_type": plan_type,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                if result.matched_count > 0:
                    logger.info(f"✅ Updated user {user_id} with subscription info")
                else:
                    logger.warning(f"User not found for subscription: {user_id}")
                    
            except Exception as user_error:
                logger.error(f"Error updating user with subscription: {user_error}")
        
        logger.info(f"✅ Checkout session completed processing finished: {subscription_id}")
        
    except Exception as e:
        logger.error(f"Unexpected error handling checkout session completed: {str(e)}")
        logger.error(f"Session data that caused error: {session_data}")

# API Routes

@api_router.get("/")
async def root():
    return {"message": "Whisper Dashboard API is running"}

# Translation Routes

@api_router.get("/languages")
async def get_supported_languages():
    """Get list of supported languages for translation"""
    try:
        languages = translation_service.get_supported_languages()
        return {"status": "success", "languages": languages}
    except Exception as e:
        logger.error(f"Error getting supported languages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/videos/{video_id}/translate")
async def translate_video(video_id: str, target_language: str, user_id: str = Depends(optional_auth)):
    """Translate a processed video to the target language"""
    try:
        # Find the video
        query_filter = {"id": video_id}
        if user_id:
            query_filter["user_id"] = user_id
        
        logger.info(f"Searching for video with query: {query_filter}")
        video = await db.processed_videos.find_one(query_filter)
        
        if not video:
            logger.error(f"Video not found with query: {query_filter}")
            raise HTTPException(status_code=404, detail="Video not found")
        
        logger.info(f"Found video: {video.get('title', 'Unknown')}")
        logger.info(f"Video analysis type: {type(video.get('analysis'))}")
        logger.info(f"Video analysis keys: {list(video.get('analysis', {}).keys()) if video.get('analysis') else 'No analysis'}")
        
        # Check if already translated to this language
        if video.get('language') == target_language:
            return {
                "status": "success",
                "message": "Video is already in the requested language",
                "video": ProcessedVideo(**video)
            }
        
        # Translate the video content
        logger.info(f"Starting translation for video {video_id} to {target_language}")
        logger.info(f"Video data keys: {list(video.keys())}")
        logger.info(f"Video analysis type: {type(video.get('analysis'))}")
        translation_result = await translation_service.translate_video_content(video, target_language)
        
        if translation_result['status'] != 'success':
            logger.error(f"Translation failed for video {video_id}: {translation_result['error']}")
            raise HTTPException(status_code=500, detail=translation_result['error'])
        
        translated_content = translation_result['translated_content']
        
        # Update the existing video record with translated content
        from bson import ObjectId
        
        # Merge translated analysis with existing analysis to preserve required fields
        existing_analysis = video.get('analysis', {})
        translated_analysis = translated_content.get('analysis', {})
        merged_analysis = {**existing_analysis, **translated_analysis}
        
        update_data = {
            'title': translated_content.get('title', video['title']),
            'channel_name': translated_content.get('channel_name', video['channel_name']),
            'transcript': translated_content.get('transcript', video['transcript']),
            'analysis': merged_analysis,
            'language': target_language,
            'original_language': video.get('language', 'en'),
            'translated_at': datetime.utcnow()
        }
        
        # Update the video in database
        await db.processed_videos.update_one(
            {'_id': ObjectId(video['_id'])},
            {'$set': update_data}
        )
        
        # Get the updated video
        updated_video = await db.processed_videos.find_one({'_id': ObjectId(video['_id'])})
        
        logger.info(f"Video {video_id} translated to {target_language}")
        logger.info(f"Updated video keys: {list(updated_video.keys()) if updated_video else 'No video found'}")
        
        try:
            # Convert to ProcessedVideo model
            processed_video = ProcessedVideo(**updated_video)
            logger.info("Successfully created ProcessedVideo object")
            
            return {
                "status": "success",
                "message": f"Video translated to {target_language}",
                "video": processed_video
            }
        except Exception as e:
            logger.error(f"Error creating ProcessedVideo object: {str(e)}")
            logger.error(f"Updated video data: {updated_video}")
            raise HTTPException(status_code=500, detail=f"Failed to create video object: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error translating video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/videos/{video_id}/translate-analysis")
async def translate_video_analysis(video_id: str, target_language: str, user_id: str = Depends(optional_auth)):
    """Translate only the analysis portion of a video"""
    try:
        # Find the video
        query_filter = {"id": video_id}
        if user_id:
            query_filter["user_id"] = user_id
        
        video = await db.processed_videos.find_one(query_filter)
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Translate the analysis
        translation_result = await translation_service.translate_analysis_only(
            video.get('analysis', {}), 
            target_language
        )
        
        if translation_result['status'] != 'success':
            raise HTTPException(status_code=500, detail=translation_result['error'])
        
        translated_analysis = translation_result['translated_analysis']

        # Merge translated analysis with existing analysis to preserve required fields
        existing_analysis = video.get('analysis', {})
        merged_analysis = {**existing_analysis, **translated_analysis}

        # Update the existing video record with translated analysis
        from bson import ObjectId
        
        update_data = {
            'analysis': merged_analysis,
            'translated_at': datetime.utcnow()
        }
        
        await db.processed_videos.update_one(
            {'_id': ObjectId(video['_id'])},
            {'$set': update_data}
        )
        
        # Get the updated video
        updated_video = await db.processed_videos.find_one({'_id': ObjectId(video['_id'])})
        
        try:
            processed_video = ProcessedVideo(**updated_video)
            return {
                "status": "success",
                "message": f"Analysis translated to {target_language}",
                "analysis": translated_analysis,
                "video": processed_video
            }
        except Exception as e:
            logger.error(f"Error creating ProcessedVideo object for analysis translation: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create video object: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error translating analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/videos/{video_id}/translate-transcript")
async def translate_video_transcript(video_id: str, target_language: str, user_id: str = Depends(optional_auth)):
    """Translate only the transcript of a video"""
    try:
        # Find the video
        query_filter = {"id": video_id}
        if user_id:
            query_filter["user_id"] = user_id
        
        video = await db.processed_videos.find_one(query_filter)
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Translate the transcript
        translation_result = await translation_service.translate_transcript_only(
            video.get('transcript', ''), 
            target_language
        )
        
        if translation_result['status'] != 'success':
            raise HTTPException(status_code=500, detail=translation_result['error'])
        
        translated_transcript = translation_result['translated_transcript']

        format_result = await transcript_formatter.format_transcript(translated_transcript)
        
        if format_result['status'] != 'success':
            raise HTTPException(status_code=500, detail=format_result['error'])
        
        formatted_transcript = format_result['formatted_transcript']

        # Update the existing video record with translated transcript
        from bson import ObjectId
        
        update_data = {
            'transcript': formatted_transcript,
            'raw_transcript': translated_transcript,
            'translated_at': datetime.utcnow()
        }
        
        await db.processed_videos.update_one(
            {'_id': ObjectId(video['_id'])},
            {'$set': update_data}
        )
        
        # Get the updated video
        updated_video = await db.processed_videos.find_one({'_id': ObjectId(video['_id'])})
        
        try:
            processed_video = ProcessedVideo(**updated_video)
            return {
                "status": "success",
                "message": f"Transcript translated to {target_language}",
                "transcript": formatted_transcript,
                "video": processed_video
            }
        except Exception as e:
            logger.error(f"Error creating ProcessedVideo object for transcript translation: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create video object: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error translating transcript: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Text-to-Speech Routes

@api_router.post("/text-to-speech", response_model=TextToSpeechResponse)
async def convert_text_to_speech(request: TextToSpeechRequest, user_id: str = Depends(optional_auth)):
    """Convert text to speech using ElevenLabs API"""
    try:
        result = await text_to_speech_service.text_to_speech(
            text=request.text,
            voice_id=request.voice_id,
            model_id=request.model_id,
            output_format=request.output_format,
            return_base64=True
        )
        
        if result["status"] == "success":
            return TextToSpeechResponse(
                status="success",
                audio_base64=result["audio_base64"],
                audio_format=result["audio_format"],
                voice_id=result["voice_id"],
                model_id=result["model_id"],
                text_length=result["text_length"]
            )
        else:
            return TextToSpeechResponse(
                status="error",
                error=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Error in text-to-speech conversion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/text-to-speech/voices")
async def get_available_voices():
    """Get list of available voices from ElevenLabs"""
    try:
        result = await text_to_speech_service.get_available_voices()
        
        if result["status"] == "success":
            return {
                "status": "success",
                "voices": result["voices"]
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Error getting available voices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket Text-to-Speech Routes

@app.websocket("/ws/text-to-speech")
async def websocket_text_to_speech(websocket: WebSocket):
    """WebSocket endpoint for real-time text-to-speech streaming"""
    await websocket.accept()
    logger.info("WebSocket TTS client connected")
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle ping messages
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue
            
            # Extract parameters
            text = message.get("text", "")
            voice_id = message.get("voice_id")
            model_id = message.get("model_id")
            voice_settings = message.get("voice_settings")
            chunk_length_schedule = message.get("chunk_length_schedule")
            
            if not text:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "No text provided"
                }))
                continue
            
            logger.info(f"WebSocket TTS request: '{text[:50]}...' with voice {voice_id}")
            
            # Stream audio chunks
            try:
                async for chunk_data in websocket_tts_service.stream_text_to_speech(
                    text=text,
                    voice_id=voice_id,
                    model_id=model_id,
                    voice_settings=voice_settings,
                    chunk_length_schedule=chunk_length_schedule
                ):
                    await websocket.send_text(json.dumps(chunk_data))
                    
                    # If it's the final chunk or an error, break the inner loop but keep connection open
                    if chunk_data.get("type") in ["final", "error"]:
                        logger.info(f"TTS streaming completed for request: {text[:30]}...")
                        break
                        
                logger.info(f"TTS streaming generator completed for: {text[:30]}...")
                
            except Exception as e:
                logger.error(f"Error in TTS streaming: {e}")
                try:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": str(e)
                    }))
                except:
                    pass
                    
    except WebSocketDisconnect:
        logger.info("WebSocket TTS client disconnected")
    except Exception as e:
        logger.error(f"WebSocket TTS error: {str(e)}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": str(e)
            }))
        except:
            pass
        # Don't close the connection on error, just log it
        logger.info("Error handled, keeping WebSocket connection open")
    finally:
        logger.info("WebSocket TTS connection closed")

@api_router.post("/search/youtube")
async def search_videos_youtube(request: SearchRequest):
    """
    Advanced video search with multiple filters and search types
    
    Search Types:
    - topic: Optimized for topic-based searches with educational modifiers
    - phrase: Exact phrase matching
    - interest: Expanded keyword search based on interest areas
    - general: Standard search
    
    Sort Orders: relevance, date, rating, viewCount, title
    Duration: any, short (<4min), medium (4-20min), long (>20min)
    Upload Time: any, hour, today, week, month, year
    """
    try:
        result = await youtube_service.search_videos_advanced(
            query=request.query,
            search_type=SearchType(request.search_type),
            max_results=request.max_results,
            sort_order=SortOrder(request.sort_order),
            duration=Duration(request.duration),
            upload_time=UploadTime(request.upload_time),
            safe_search=request.safe_search,
            include_closed_captions=request.include_closed_captions,
            region_code=request.region_code,
            language=request.language
        )
        
        if result['status'] == 'error':
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500)    

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
        
        # Get user's language preference if authenticated
        user_language = request.language or "en"  # Default to English
        if user_id:
            try:
                user = await auth_service.get_user_by_id(user_id)
                if user and user.get('preferences', {}).get('preferred_language'):
                    print(f"User preferences: {user['preferences']}")
                    user_language = user['preferences']['preferred_language']
                    print(f"User language preference: {user_language}")
            except Exception as e:
                logger.warning(f"Could not get user language preference: {str(e)}")
        
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
        
        # Get transcript from Supadata using user's preferred language
        transcript_result = await supadata_service.get_video_transcript(
            request.url, 
            lang=user_language, 
            text=False  # Get timestamped version
        )

        print('transcript_result:', transcript_result)
        
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
            from models.video_models import EntityData
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
                'entities': EntityData(),
                'confidence_score': 0.7
            }
        else:
            analysis_data = analysis_result['analysis']
            print(f"🎭 Analysis data received from LLM service:")
            print(f"   - tone_analysis present: {bool(analysis_data.get('tone_analysis'))}")
            if analysis_data.get('tone_analysis'):
                print(f"   - tone_analysis content: {analysis_data['tone_analysis']}")
        
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
        
        # Prepare raw transcript data - handle both list and string formats
        raw_transcript_data = transcript_result.get('raw_content', '')
        if isinstance(raw_transcript_data, list):
            # Convert list of transcript segments to JSON string for storage
            import json
            raw_transcript = json.dumps(raw_transcript_data)
        else:
            # It's already a string
            raw_transcript = str(raw_transcript_data) if raw_transcript_data else ''
        
        # Create processed video object with real data
        print(f"📊 Creating VideoAnalysis with data keys: {list(analysis_data.keys())}")
        print(f"   - About to create VideoAnalysis with tone_analysis: {bool(analysis_data.get('tone_analysis'))}")
        
        # Fix entities format if needed - handle case where LLM returns list instead of EntityData
        entities_data = analysis_data.get('entities')
        if entities_data and not hasattr(entities_data, 'people'):  # Check if it's not an EntityData object
            print(f"🔧 Fixing entities format: {type(entities_data)}")
            from models.video_models import EntityData
            
            if isinstance(entities_data, list):
                # Convert list of {name, role/type} to EntityData structure
                fixed_entities = EntityData()
                for entity in entities_data:
                    if isinstance(entity, dict):
                        name = entity.get('name', '')
                        entity_type = entity.get('role', entity.get('type', 'people')).lower()
                        
                        # Map entity types to EntityData fields
                        if 'company' in entity_type or 'corporation' in entity_type or 'business' in entity_type:
                            if name not in fixed_entities.companies:
                                fixed_entities.companies.append(name)
                        elif 'product' in entity_type or 'device' in entity_type or 'tool' in entity_type:
                            if name not in fixed_entities.products:
                                fixed_entities.products.append(name)
                        elif 'location' in entity_type or 'place' in entity_type or 'country' in entity_type or 'city' in entity_type:
                            if name not in fixed_entities.locations:
                                fixed_entities.locations.append(name)
                        else:  # Default to people
                            if name not in fixed_entities.people:
                                fixed_entities.people.append(name)
                    elif isinstance(entity, str):
                        # Simple string entity - default to people
                        if entity not in fixed_entities.people:
                            fixed_entities.people.append(entity)
                
                analysis_data['entities'] = fixed_entities
                print(f"✅ Entities converted from list to EntityData structure")
            elif isinstance(entities_data, dict) and not hasattr(entities_data, 'people'):
                # Convert dict to EntityData
                from models.video_models import EntityData
                analysis_data['entities'] = EntityData(
                    people=entities_data.get('people', []),
                    companies=entities_data.get('companies', []),
                    products=entities_data.get('products', []),
                    locations=entities_data.get('locations', [])
                )
                print(f"✅ Entities converted from dict to EntityData structure")
        
        try:
            video_analysis = VideoAnalysis(**analysis_data)
            print(f"✅ VideoAnalysis created successfully")
            print(f"   - VideoAnalysis.tone_analysis: {video_analysis.tone_analysis}")
        except Exception as e:
            print(f"❌ Error creating VideoAnalysis: {e}")
            print(f"   - Analysis data that failed: {analysis_data}")
            # Print specific entity data for debugging
            if 'entities' in analysis_data:
                print(f"   - Entities data type: {type(analysis_data['entities'])}")
                print(f"   - Entities data: {analysis_data['entities']}")
            raise
        
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
            raw_transcript=raw_transcript,  # Save raw transcript with timestamps as string
            analysis=video_analysis,
            chart_data=ChartData(**chart_data),
            language=user_language  # Use user's preferred language
        )
        
        # Add user_id - use actual user_id if authenticated, otherwise use demo_user
        video_dict = processed_video.model_dump()  # Use Pydantic v2 method
        effective_user_id = user_id or "demo_user"
        video_dict['user_id'] = effective_user_id
        
        # Debug the final video dict before saving
        analysis_dict = video_dict.get('analysis', {})
        print(f"💾 Final video_dict before database save:")
        print(f"   - analysis keys: {list(analysis_dict.keys()) if analysis_dict else 'No analysis'}")
        print(f"   - tone_analysis in final dict: {bool(analysis_dict.get('tone_analysis'))}")
        if analysis_dict.get('tone_analysis'):
            print(f"   - tone_analysis content: {analysis_dict['tone_analysis']}")
        
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
    """Get list of processed videos - public access for demo"""
    try:
        skip = (page - 1) * limit
        
        # Use actual user_id if authenticated, otherwise use demo_user
        effective_user_id = user_id or "demo_user"
        
        # Filter by user if authenticated, show all for demo users
        query_filter = {}
        if effective_user_id:  # Only filter if user is authenticated
            query_filter['user_id'] = effective_user_id
        # For demo users (no user_id), show all videos
        
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
        channel_dict = followed_channel.model_dump()
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
    """Get list of followed channels - public access for demo"""
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
    """Get user statistics - public access for demo"""
    try:
        # Use demo_user for non-authenticated users
        effective_user_id = user_id or "demo_user"
        
        query_filter = {'user_id': effective_user_id}
        
        processed_videos = await db.processed_videos.find(query_filter).to_list(length=100)
        total_channels = await db.followed_channels.count_documents(query_filter)

        total_duration = 0
        for processed_video in processed_videos:
            # print(f"Processed video duration: {processed_video.get('duration', 0)}")
            cleaned_duration = processed_video.get('duration', 0)[:-1]
            duration = int(cleaned_duration)
            print(f"Duration: {duration}")
            total_duration += duration
        
        print(f"Total duration: {total_duration}")
        
        # Calculate estimated time saved
        estimated_hours = (total_duration / 60) * 0.75 # Consider that we saved 75% of the time, not all
        print(f"Estimated hours: {estimated_hours}")
        
        return {
            "videos_processed": len(processed_videos),
            "hours_saved": f"{estimated_hours:.01f}h",
            "channels_followed": total_channels,
            "total_transcripts": len(processed_videos)
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


@api_router.get("/search/videos")
async def search_videos(q: str, page: int = 1, limit: int = 20, user_id: str = Depends(optional_auth)):
    """Search processed videos - public access for demo"""
    try:
        skip = (page - 1) * limit
        
        # Use actual user_id if authenticated, otherwise search all videos
        effective_user_id = user_id or "demo_user"
        
        # Create search query - filter by user if authenticated, search all for demo
        search_filter = {
            "$or": [
                {"title": {"$regex": q, "$options": "i"}},
                {"channel_name": {"$regex": q, "$options": "i"}},
                {"analysis.topics": {"$regex": q, "$options": "i"}},
                {"analysis.executive_summary": {"$regex": q, "$options": "i"}}
            ]
        }
        
        # Add user filter if authenticated
        if user_id:
            search_filter["user_id"] = user_id
        
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

@api_router.get("/videos/{video_id}/timeline")
async def get_video_timeline(video_id: str, user_id: str = Depends(optional_auth)):
    """Get the timeline of a video with timestamps"""
    try:
        # Find the video
        query_filter = {"id": video_id}
        if user_id:
            query_filter["user_id"] = user_id
        
        video = await db.processed_videos.find_one(query_filter)
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Use raw_transcript (with timestamps) if available, otherwise fall back to formatted transcript
        raw_transcript = video.get('raw_transcript', '')
        formatted_transcript = video.get('transcript', '')
        
        # Parse raw transcript data and prefer it for timeline as it should contain timestamps
        if raw_transcript:
            transcript_to_use = get_raw_transcript_data(raw_transcript)
        else:
            transcript_to_use = formatted_transcript
        
        # Log which transcript type we're using for debugging
        logger.info(f"Timeline for video {video_id}: using {'raw' if raw_transcript else 'formatted'} transcript")
        
        if not transcript_to_use:
            return {
                'status': 'error',
                'error': 'No transcript available for this video'
            }
        
        # Get timeline
        timeline_result = timestamp_service.get_transcript_timeline(transcript_to_use)
        
        if timeline_result['status'] == 'success':
            return timeline_result
        else:
            raise HTTPException(status_code=500, detail=timeline_result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting video timeline: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/videos/{video_id}/time-range-summary")
async def get_time_range_summary(
    video_id: str, 
    time_range: Dict[str, str], 
    user_id: str = Depends(optional_auth)
):
    """Get AI summary for a specific time range of a video"""
    try:
        # Validate time range parameters
        start_time = time_range.get('start_time')
        end_time = time_range.get('end_time')
        
        if not start_time or not end_time:
            raise HTTPException(
                status_code=400, 
                detail="start_time and end_time are required"
            )
        
        # Find the video
        query_filter = {"id": video_id}
        if user_id:
            query_filter["user_id"] = user_id
        
        video = await db.processed_videos.find_one(query_filter)
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Use raw_transcript (with timestamps) if available, otherwise fall back to formatted transcript
        raw_transcript = video.get('raw_transcript', '')
        formatted_transcript = video.get('transcript', '')
        
        # Parse raw transcript data and prefer it for time range summary as it should contain timestamps
        if raw_transcript:
            transcript_to_use = get_raw_transcript_data(raw_transcript)
        else:
            transcript_to_use = formatted_transcript
        
        if not transcript_to_use:
            raise HTTPException(
                status_code=400,
                detail="No transcript available for this video"
            )
        
        # Generate time range summary
        summary_result = await time_range_summary_service.generate_time_range_summary(
            transcript=transcript_to_use,
            start_time=start_time,
            end_time=end_time,
            video_title=video.get('title', ''),
            context={
                'video_id': video_id,
                'channel_name': video.get('channel_name', ''),
                'full_analysis': video.get('analysis', {})
            }
        )
        
        return summary_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating time range summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/videos/{video_id}/compare-time-ranges")
async def compare_time_ranges(
    video_id: str, 
    comparison_data: Dict[str, Any],
    user_id: str = Depends(optional_auth)
):
    """Compare multiple time ranges in a video"""
    try:
        time_ranges = comparison_data.get('time_ranges', [])
        
        if len(time_ranges) < 2:
            raise HTTPException(
                status_code=400,
                detail="At least 2 time ranges are required for comparison"
            )
        
        # Find the video
        query_filter = {"id": video_id}
        if user_id:
            query_filter["user_id"] = user_id
        
        video = await db.processed_videos.find_one(query_filter)
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Use raw_transcript (with timestamps) if available, otherwise fall back to formatted transcript
        raw_transcript = video.get('raw_transcript', '')
        formatted_transcript = video.get('transcript', '')
        
        # Parse raw transcript data and prefer it for time range comparison as it should contain timestamps
        if raw_transcript:
            transcript_to_use = get_raw_transcript_data(raw_transcript)
        else:
            transcript_to_use = formatted_transcript
        
        if not transcript_to_use:
            raise HTTPException(
                status_code=400,
                detail="No transcript available for this video"
            )
        
        # Compare time ranges
        comparison_result = await time_range_summary_service.compare_time_ranges(
            transcript=transcript_to_use,
            time_ranges=time_ranges,
            video_title=video.get('title', '')
        )
        
        return comparison_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing time ranges: {str(e)}")
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