import os
import aiohttp
import asyncio
from typing import Dict, Any, List, Optional, Literal
from dotenv import load_dotenv
import re
from datetime import datetime
from enum import Enum

load_dotenv()

class SearchType(Enum):
    TOPIC = "topic"
    PHRASE = "phrase" 
    INTEREST = "interest"
    GENERAL = "general"

class SortOrder(Enum):
    RELEVANCE = "relevance"
    DATE = "date"
    RATING = "rating"
    VIEW_COUNT = "viewCount"
    TITLE = "title"

class Duration(Enum):
    ANY = "any"
    SHORT = "short"      # < 4 minutes
    MEDIUM = "medium"    # 4-20 minutes  
    LONG = "long"        # > 20 minutes

class UploadTime(Enum):
    ANY = "any"
    HOUR = "hour"
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"

class YouTubeService:
    def __init__(self):
        self.api_key = os.environ.get('YOUTUBE_API_KEY')
        self.base_url = "https://www.googleapis.com/youtube/v3"
        
        # Interest-based search keywords mapping
        self.interest_keywords = {
            "technology": ["tech", "programming", "coding", "software", "AI", "machine learning", "web development"],
            "education": ["tutorial", "learn", "course", "lesson", "how to", "explained", "guide"],
            "entertainment": ["funny", "comedy", "music", "movie", "gaming", "vlogs", "reaction"],
            "lifestyle": ["fitness", "health", "cooking", "travel", "fashion", "beauty", "home"],
            "business": ["entrepreneur", "startup", "marketing", "finance", "investing", "productivity"],
            "science": ["physics", "chemistry", "biology", "research", "experiment", "discovery"],
            "art": ["drawing", "painting", "design", "creative", "art tutorial", "digital art"],
            "sports": ["football", "basketball", "soccer", "fitness", "workout", "athletics"],
            "news": ["breaking news", "current events", "politics", "world news", "analysis"],
            "music": ["song", "album", "concert", "music video", "lyrics", "cover"],
            "gaming": ["gameplay", "review", "walkthrough", "esports", "streaming", "game"],
            "diy": ["DIY", "craft", "handmade", "repair", "build", "project", "tutorial"]
        }

    async def search_videos_advanced(
        self,
        query: str,
        search_type: SearchType = SearchType.GENERAL,
        max_results: int = 10,
        sort_order: SortOrder = SortOrder.RELEVANCE,
        duration: Duration = Duration.ANY,
        upload_time: UploadTime = UploadTime.ANY,
        safe_search: bool = True,
        include_closed_captions: bool = False,
        region_code: str = "US",
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Advanced video search with multiple search types and filters
        """
        try:
            # Process query based on search type
            processed_query = self._process_query_by_type(query, search_type)
            
            params = {
                'key': self.api_key,
                'q': processed_query,
                'part': 'snippet',
                'type': 'video',
                'maxResults': min(max_results, 50),  # API limit
                'order': sort_order.value,
                'regionCode': region_code,
                'relevanceLanguage': language
            }
            
            # Add duration filter
            if duration != Duration.ANY:
                params['videoDuration'] = duration.value
            
            # Add upload time filter
            if upload_time != UploadTime.ANY:
                params['publishedAfter'] = self._get_published_after_date(upload_time)
            
            # Add safe search
            if safe_search:
                params['safeSearch'] = 'strict'
            
            # Add closed captions filter
            if include_closed_captions:
                params['videoCaption'] = 'closedCaption'
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/search", params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Get video IDs for additional details
                        video_ids = [item['id']['videoId'] for item in data.get('items', [])]
                        
                        if video_ids:
                            # Get detailed video information
                            video_details = await self._get_videos_batch_details(video_ids)
                            
                            videos = []
                            for item in data.get('items', []):
                                video_id = item['id']['videoId']
                                snippet = item['snippet']
                                
                                # Get additional details from batch request
                                details = video_details.get(video_id, {})
                                
                                video_info = {
                                    'video_id': video_id,
                                    'title': snippet['title'],
                                    'description': snippet['description'],
                                    'thumbnail': snippet['thumbnails'].get('high', snippet['thumbnails']['default'])['url'],
                                    'published_at': self.format_publish_date(snippet['publishedAt']),
                                    'channel': {
                                        'id': snippet['channelId'],
                                        'name': snippet['channelTitle']
                                    },
                                    'url': f"https://www.youtube.com/watch?v={video_id}",
                                    'duration': details.get('duration', 'Unknown'),
                                    'view_count': details.get('view_count', '0'),
                                    'like_count': details.get('like_count', '0'),
                                    'comment_count': details.get('comment_count', '0'),
                                    'tags': details.get('tags', []),
                                    'category': details.get('category', 'Unknown')
                                }
                                
                                videos.append(video_info)
                            
                            return {
                                'status': 'success',
                                'videos': videos,
                                'search_info': {
                                    'query': processed_query,
                                    'search_type': search_type.value,
                                    'total_results': data.get('pageInfo', {}).get('totalResults', 0),
                                    'results_per_page': len(videos),
                                    'next_page_token': data.get('nextPageToken')
                                }
                            }
                        else:
                            return {'status': 'success', 'videos': [], 'search_info': {'query': processed_query}}
                    else:
                        error_data = await response.json()
                        return {'status': 'error', 'error': error_data.get('error', {}).get('message', 'Search failed')}
                        
        except Exception as e:
            return {'status': 'error', 'error': f'Advanced search failed: {str(e)}'}

    async def search_by_topic(self, topic: str, max_results: int = 10, **kwargs) -> Dict[str, Any]:
        """
        Search videos by specific topic with topic-optimized query processing
        """
        return await self.search_videos_advanced(
            query=topic,
            search_type=SearchType.TOPIC,
            max_results=max_results,
            **kwargs
        )

    async def search_by_phrase(self, phrase: str, max_results: int = 10, **kwargs) -> Dict[str, Any]:
        """
        Search videos by exact phrase
        """
        return await self.search_videos_advanced(
            query=phrase,
            search_type=SearchType.PHRASE,
            max_results=max_results,
            **kwargs
        )

    async def search_by_interest(self, interest: str, max_results: int = 10, **kwargs) -> Dict[str, Any]:
        """
        Search videos by interest area with expanded keyword matching
        """
        return await self.search_videos_advanced(
            query=interest,
            search_type=SearchType.INTEREST,
            max_results=max_results,
            **kwargs
        )

    async def search_trending_by_category(self, category_id: str = "0", region_code: str = "US") -> Dict[str, Any]:
        """
        Get trending videos by category
        Category IDs: 
        0=All, 1=Film & Animation, 2=Autos & Vehicles, 10=Music, 15=Pets & Animals,
        17=Sports, 19=Travel & Events, 20=Gaming, 22=People & Blogs, 23=Comedy,
        24=Entertainment, 25=News & Politics, 26=Howto & Style, 27=Education,
        28=Science & Technology
        """
        try:
            params = {
                'key': self.api_key,
                'part': 'snippet,statistics,contentDetails',
                'chart': 'mostPopular',
                'regionCode': region_code,
                'maxResults': 50
            }
            
            if category_id != "0":
                params['videoCategoryId'] = category_id
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/videos", params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        videos = []
                        for item in data.get('items', []):
                            snippet = item['snippet']
                            statistics = item.get('statistics', {})
                            content_details = item.get('contentDetails', {})
                            
                            video_info = {
                                'video_id': item['id'],
                                'title': snippet['title'],
                                'description': snippet['description'],
                                'thumbnail': snippet['thumbnails'].get('high', snippet['thumbnails']['default'])['url'],
                                'published_at': self.format_publish_date(snippet['publishedAt']),
                                'channel': {
                                    'id': snippet['channelId'],
                                    'name': snippet['channelTitle']
                                },
                                'url': f"https://www.youtube.com/watch?v={item['id']}",
                                'duration': self.format_duration(content_details.get('duration', 'PT0S')),
                                'view_count': statistics.get('viewCount', '0'),
                                'like_count': statistics.get('likeCount', '0'),
                                'comment_count': statistics.get('commentCount', '0'),
                                'tags': snippet.get('tags', []),
                                'category_id': snippet.get('categoryId', 'Unknown')
                            }
                            
                            videos.append(video_info)
                        
                        return {'status': 'success', 'videos': videos, 'category_id': category_id}
                    else:
                        error_data = await response.json()
                        return {'status': 'error', 'error': error_data.get('error', {}).get('message', 'Trending search failed')}
                        
        except Exception as e:
            return {'status': 'error', 'error': f'Trending search failed: {str(e)}'}

    async def search_related_videos(self, video_id: str, max_results: int = 10) -> Dict[str, Any]:
        """
        Find videos related to a specific video by analyzing its tags and title
        """
        try:
            # First get the original video's details
            video_details = await self.get_video_details(video_id)
            
            if video_details['status'] != 'success':
                return video_details
            
            video_info = video_details['video']
            
            # Extract key terms from title and description for search
            title_words = self._extract_key_words(video_info['title'])
            search_query = " ".join(title_words[:3])  # Use first 3 key words
            
            # Search for related videos
            related_search = await self.search_videos_advanced(
                query=search_query,
                search_type=SearchType.TOPIC,
                max_results=max_results + 5,  # Get extra to filter out original
                sort_order=SortOrder.RELEVANCE
            )
            
            if related_search['status'] == 'success':
                # Filter out the original video
                related_videos = [v for v in related_search['videos'] if v['video_id'] != video_id][:max_results]
                
                return {
                    'status': 'success',
                    'videos': related_videos,
                    'original_video': video_info,
                    'search_query': search_query
                }
            else:
                return related_search
                
        except Exception as e:
            return {'status': 'error', 'error': f'Related videos search failed: {str(e)}'}

    def _process_query_by_type(self, query: str, search_type: SearchType) -> str:
        """
        Process search query based on search type
        """
        if search_type == SearchType.PHRASE:
            # Exact phrase search
            return f'"{query}"'
        
        elif search_type == SearchType.INTEREST:
            # Expand query with related keywords
            interest_key = query.lower()
            if interest_key in self.interest_keywords:
                keywords = self.interest_keywords[interest_key]
                # Combine original query with related keywords
                expanded_query = f"{query} {' OR '.join(keywords[:3])}"
                return expanded_query
            return query
        
        elif search_type == SearchType.TOPIC:
            # Topic-focused search with modifiers
            topic_modifiers = ["tutorial", "explained", "guide", "how to", "what is"]
            # Add one relevant modifier
            return f"{query} tutorial OR {query} explained"
        
        else:  # GENERAL
            return query

    async def _get_videos_batch_details(self, video_ids: List[str]) -> Dict[str, Dict]:
        """
        Get detailed information for multiple videos in batch
        """
        try:
            if not video_ids:
                return {}
            
            params = {
                'key': self.api_key,
                'id': ','.join(video_ids),
                'part': 'contentDetails,statistics,snippet'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/videos", params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        details_map = {}
                        for item in data.get('items', []):
                            video_id = item['id']
                            content_details = item.get('contentDetails', {})
                            statistics = item.get('statistics', {})
                            snippet = item.get('snippet', {})
                            
                            details_map[video_id] = {
                                'duration': self.format_duration(content_details.get('duration', 'PT0S')),
                                'view_count': statistics.get('viewCount', '0'),
                                'like_count': statistics.get('likeCount', '0'),
                                'comment_count': statistics.get('commentCount', '0'),
                                'tags': snippet.get('tags', []),
                                'category': snippet.get('categoryId', 'Unknown')
                            }
                        
                        return details_map
                    else:
                        return {}
                        
        except Exception as e:
            print(f"Error getting batch details: {str(e)}")
            return {}

    def _get_published_after_date(self, upload_time: UploadTime) -> str:
        """
        Get ISO date string for publishedAfter parameter
        """
        from datetime import datetime, timedelta, timezone
        
        now = datetime.now(timezone.utc)
        
        if upload_time == UploadTime.HOUR:
            date = now - timedelta(hours=1)
        elif upload_time == UploadTime.TODAY:
            date = now - timedelta(days=1)
        elif upload_time == UploadTime.WEEK:
            date = now - timedelta(weeks=1)
        elif upload_time == UploadTime.MONTH:
            date = now - timedelta(days=30)
        elif upload_time == UploadTime.YEAR:
            date = now - timedelta(days=365)
        else:
            return ""
        
        return date.isoformat()

    def _extract_key_words(self, text: str) -> List[str]:
        """
        Extract key words from text for search queries
        """
        # Remove common stop words
        stop_words = {'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 
                     'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 
                     'to', 'was', 'will', 'with', 'how', 'what', 'why', 'when', 'where'}
        
        words = re.findall(r'\b\w+\b', text.lower())
        key_words = [word for word in words if word not in stop_words and len(word) > 2]
        
        return key_words[:10]  # Return top 10 key words

    # Keep all existing methods unchanged
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