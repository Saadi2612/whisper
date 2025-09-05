import asyncio
import schedule
import time
from datetime import datetime, timedelta
from typing import List
from motor.motor_asyncio import AsyncIOMotorClient
import logging
import threading

logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self, db, supadata_service, llm_service, youtube_service):
        self.db = db
        self.supadata_service = supadata_service
        self.llm_service = llm_service
        self.youtube_service = youtube_service
        self.is_running = False
        self.scheduler_thread = None
    
    async def process_channel_videos_for_user(self, user_id: str, channel_id: str, channel_name: str) -> int:
        """Process recent videos from a channel for a specific user"""
        try:
            # Get recent videos from YouTube
            videos_result = await self.youtube_service.get_channel_videos(channel_id, max_results=3)
            
            if videos_result['status'] != 'success':
                logger.error(f"Failed to get videos for channel {channel_name}: {videos_result.get('error')}")
                return 0
            
            processed_count = 0
            
            for video_info in videos_result['videos']:
                try:
                    # Check if already processed for this user
                    existing = await self.db.processed_videos.find_one({
                        "video_id": video_info['video_id'],
                        "user_id": user_id
                    })
                    
                    if existing:
                        continue
                    
                    logger.info(f"Processing video for user {user_id}: {video_info['title']}")
                    
                    # Get transcript
                    transcript_result = await self.supadata_service.get_video_transcript(
                        video_info['url'], 
                        lang='en', 
                        text=True
                    )
                    
                    if transcript_result['status'] != 'completed':
                        logger.warning(f"Failed to get transcript for {video_info['title']}")
                        continue
                    
                    # Generate AI analysis
                    analysis_result = await self.llm_service.generate_video_summary(
                        transcript_result['content'],
                        title=video_info['title'],
                        channel_name=channel_name
                    )
                    
                    if analysis_result['status'] != 'success':
                        logger.warning(f"Failed to generate analysis for {video_info['title']}")
                        continue
                    
                    # Generate chart data
                    chart_data = await self.llm_service.generate_chart_data(analysis_result['analysis'])
                    
                    # Import required models
                    from models.video_models import ProcessedVideo, VideoAnalysis, ChartData
                    
                    # Create processed video
                    processed_video = ProcessedVideo(
                        url=video_info['url'],
                        video_id=video_info['video_id'],
                        title=video_info['title'],
                        channel_name=channel_name,
                        channel_avatar=videos_result['channel_info']['avatar'],
                        thumbnail=video_info['thumbnail'],
                        published_at=self.youtube_service.format_publish_date(video_info['published_at']),
                        transcript=transcript_result['content'],
                        analysis=VideoAnalysis(**analysis_result['analysis']),
                        chart_data=ChartData(**chart_data),
                        language=transcript_result['lang']
                    )
                    
                    # Add user_id to the video data
                    video_dict = processed_video.dict()
                    video_dict['user_id'] = user_id
                    
                    # Save to database
                    await self.db.processed_videos.insert_one(video_dict)
                    processed_count += 1
                    
                    logger.info(f"Successfully processed: {video_info['title']} for user {user_id}")
                    
                except Exception as e:
                    logger.error(f"Error processing video {video_info.get('title', 'Unknown')}: {str(e)}")
                    continue
            
            return processed_count
            
        except Exception as e:
            logger.error(f"Error processing channel videos: {str(e)}")
            return 0
    
    async def refresh_all_users_channels(self):
        """Refresh videos for all users with followed channels"""
        try:
            logger.info("Starting scheduled refresh for all users")
            
            # Get all users with auto-process enabled
            users_cursor = self.db.users.find({
                'settings.auto_process_channels': True
            })
            
            async for user in users_cursor:
                user_id = str(user['_id'])
                
                # Get user's followed channels
                channels_cursor = self.db.followed_channels.find({'user_id': user_id})
                
                async for channel in channels_cursor:
                    if channel.get('channel_id'):
                        processed_count = await self.process_channel_videos_for_user(
                            user_id,
                            channel['channel_id'],
                            channel['channel_name']
                        )
                        
                        if processed_count > 0:
                            logger.info(f"Processed {processed_count} new videos for user {user_id} from {channel['channel_name']}")
            
            logger.info("Completed scheduled refresh for all users")
            
        except Exception as e:
            logger.error(f"Error in scheduled refresh: {str(e)}")
    
    def start_scheduler(self):
        """Start the background scheduler"""
        if self.is_running:
            return
        
        self.is_running = True
        
        # Schedule hourly video refresh
        schedule.every().hour.do(self._run_async_refresh)
        
        # Schedule daily cleanup (optional)
        schedule.every().day.at("02:00").do(self._run_cleanup)
        
        # Start scheduler in separate thread
        self.scheduler_thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self.scheduler_thread.start()
        
        logger.info("Background scheduler started - refreshing videos every hour")
    
    def stop_scheduler(self):
        """Stop the background scheduler"""
        self.is_running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        logger.info("Background scheduler stopped")
    
    def _scheduler_loop(self):
        """Main scheduler loop"""
        while self.is_running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    def _run_async_refresh(self):
        """Wrapper to run async refresh in sync context"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self.refresh_all_users_channels())
            loop.close()
        except Exception as e:
            logger.error(f"Error in async refresh wrapper: {str(e)}")
    
    def _run_cleanup(self):
        """Optional cleanup task"""
        logger.info("Running daily cleanup task")
        # Could implement cleanup of old videos, logs, etc.