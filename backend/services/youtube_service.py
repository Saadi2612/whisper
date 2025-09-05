import os
import aiohttp
import asyncio
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
import re
from datetime import datetime

load_dotenv()

class YouTubeService:
    def __init__(self):
        self.api_key = os.environ.get('YOUTUBE_API_KEY')
        self.base_url = "https://www.googleapis.com/youtube/v3"
        
    async def get_video_details(self, video_id: str) -> Dict[str, Any]:
        """
        Get video details including title, channel, thumbnail, etc.
        """
        try:
            params = {
                'key': self.api_key,
                'id': video_id,
                'part': 'snippet,contentDetails,statistics'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/videos", params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if data.get('items'):
                            video = data['items'][0]
                            snippet = video['snippet']
                            content_details = video['contentDetails']
                            
                            return {
                                'status': 'success',
                                'video': {
                                    'title': snippet['title'],
                                    'description': snippet['description'],
                                    'thumbnail': snippet['thumbnails'].get('maxres', snippet['thumbnails']['high'])['url'],
                                    'published_at': self.format_publish_date(snippet['publishedAt']),
                                    'duration': self.format_duration(content_details['duration']),
                                    'channel': {
                                        'id': snippet['channelId'],
                                        'name': snippet['channelTitle'],
                                        'avatar': None  # Will be fetched separately if needed
                                    }
                                }
                            }
                        else:
                            return {'status': 'error', 'error': 'Video not found'}
                    else:
                        error_data = await response.json()
                        return {'status': 'error', 'error': error_data.get('error', {}).get('message', 'API error')}
                        
        except Exception as e:
            return {'status': 'error', 'error': f'Failed to get video details: {str(e)}'}

    async def get_channel_info(self, channel_identifier: str) -> Dict[str, Any]:
        """
        Get channel information from YouTube Data API
        channel_identifier can be: @handle, channel_id, or custom_url
        """
        try:
            # Determine if it's a handle, channel ID, or custom URL
            if channel_identifier.startswith('@'):
                # Handle format
                search_param = 'forHandle'
                search_value = channel_identifier
            elif len(channel_identifier) == 24 and channel_identifier.startswith('UC'):
                # Channel ID format
                search_param = 'id'
                search_value = channel_identifier
            else:
                # Try to search by name
                search_param = 'forUsername'
                search_value = channel_identifier
            
            params = {
                'key': self.api_key,
                search_param: search_value,
                'part': 'snippet,statistics,contentDetails'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/channels", params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if data.get('items'):
                            channel = data['items'][0]
                            return {
                                'status': 'success',
                                'channel': {
                                    'id': channel['id'],
                                    'name': channel['snippet']['title'],
                                    'description': channel['snippet']['description'],
                                    'avatar': channel['snippet']['thumbnails']['high']['url'],
                                    'subscriber_count': channel['statistics'].get('subscriberCount', '0'),
                                    'video_count': channel['statistics'].get('videoCount', '0'),
                                    'uploads_playlist': channel['contentDetails']['relatedPlaylists']['uploads']
                                }
                            }
                        else:
                            return {'status': 'error', 'error': 'Channel not found'}
                    else:
                        error_data = await response.json()
                        return {'status': 'error', 'error': error_data.get('error', {}).get('message', 'API error')}
                        
        except Exception as e:
            return {'status': 'error', 'error': f'Failed to get channel info: {str(e)}'}
    
    async def get_channel_videos(self, channel_id: str, max_results: int = 10) -> Dict[str, Any]:
        """
        Get recent videos from a channel
        """
        try:
            # First get the uploads playlist ID
            channel_info = await self.get_channel_info(channel_id)
            if channel_info['status'] != 'success':
                return channel_info
            
            uploads_playlist = channel_info['channel']['uploads_playlist']
            
            # Get videos from uploads playlist
            params = {
                'key': self.api_key,
                'playlistId': uploads_playlist,
                'part': 'snippet,contentDetails',
                'maxResults': max_results,
                'order': 'date'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/playlistItems", params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        videos = []
                        for item in data.get('items', []):
                            video_snippet = item['snippet']
                            
                            # Skip private/deleted videos
                            if video_snippet['title'] == 'Private video' or video_snippet['title'] == 'Deleted video':
                                continue
                            
                            video_info = {
                                'video_id': video_snippet['resourceId']['videoId'],
                                'title': video_snippet['title'],
                                'description': video_snippet['description'],
                                'thumbnail': video_snippet['thumbnails'].get('maxres', video_snippet['thumbnails']['high'])['url'],
                                'published_at': video_snippet['publishedAt'],
                                'channel_title': video_snippet['channelTitle'],
                                'url': f"https://www.youtube.com/watch?v={video_snippet['resourceId']['videoId']}"
                            }
                            
                            videos.append(video_info)
                        
                        return {
                            'status': 'success',
                            'videos': videos,
                            'channel_info': channel_info['channel']
                        }
                    else:
                        error_data = await response.json()
                        return {'status': 'error', 'error': error_data.get('error', {}).get('message', 'Failed to get videos')}
                        
        except Exception as e:
            return {'status': 'error', 'error': f'Failed to get channel videos: {str(e)}'}
    
    async def search_channels(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        """
        Search for channels by name
        """
        try:
            params = {
                'key': self.api_key,
                'q': query,
                'part': 'snippet',
                'type': 'channel',
                'maxResults': max_results
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/search", params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        channels = []
                        for item in data.get('items', []):
                            snippet = item['snippet']
                            
                            channel_info = {
                                'id': snippet['channelId'],
                                'name': snippet['title'],
                                'description': snippet['description'],
                                'avatar': snippet['thumbnails']['high']['url'],
                                'published_at': snippet['publishedAt']
                            }
                            
                            channels.append(channel_info)
                        
                        return {'status': 'success', 'channels': channels}
                    else:
                        error_data = await response.json()
                        return {'status': 'error', 'error': error_data.get('error', {}).get('message', 'Search failed')}
                        
        except Exception as e:
            return {'status': 'error', 'error': f'Channel search failed: {str(e)}'}

    def extract_channel_id_from_url(self, url: str) -> Optional[str]:
        """
        Extract channel ID from various YouTube URL formats
        """
        patterns = [
            r'youtube\.com/channel/([A-Za-z0-9_-]+)',
            r'youtube\.com/c/([A-Za-z0-9_-]+)',
            r'youtube\.com/user/([A-Za-z0-9_-]+)',
            r'youtube\.com/@([A-Za-z0-9_-]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None

    def format_duration(self, duration_str: str) -> str:
        """
        Convert ISO 8601 duration to readable format
        """
        import re
        
        pattern = r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
        match = re.match(pattern, duration_str)
        
        if not match:
            return "Unknown"
        
        hours, minutes, seconds = match.groups()
        
        parts = []
        if hours:
            parts.append(f"{hours}h")
        if minutes:
            parts.append(f"{minutes}m")
        elif seconds and not hours and not minutes:
            parts.append(f"{seconds}s")
        
        return " ".join(parts) or "0s"

    def format_publish_date(self, iso_date: str) -> str:
        """
        Convert ISO date to relative time
        """
        from datetime import datetime, timezone
        
        try:
            pub_date = datetime.fromisoformat(iso_date.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            diff = now - pub_date
            
            if diff.days > 0:
                return f"{diff.days}d ago"
            elif diff.seconds > 3600:
                hours = diff.seconds // 3600
                return f"{hours}h ago"
            else:
                minutes = diff.seconds // 60
                return f"{minutes}m ago"
        except:
            return "Recently"