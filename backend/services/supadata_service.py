import os
import requests
import asyncio
import aiohttp
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

load_dotenv()

class SuperdataService:
    def __init__(self):
        self.api_key = os.environ.get('SUPADATA_API_KEY')
        self.base_url = "https://api.supadata.ai/v1"
        
    async def get_video_transcript(self, video_url: str, lang: str = "en", text: bool = False) -> Dict[str, Any]:
        """
        Get transcript from YouTube video using Supadata API
        """
        try:
            params = {
                'url': video_url,
                'lang': lang,
                'text': 'false',  # Get timestamped chunks instead of plain text
                'mode': 'auto'
            }
            
            headers = {
                'x-api-key': self.api_key,
                'Content-Type': 'application/json'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/transcript",
                    params=params,
                    headers=headers
                ) as response:
                    
                    if response.status == 200:
                        # Direct transcript response
                        data = await response.json()
                        
                        # Format transcript with timestamps
                        if isinstance(data.get('content'), list):
                            # We got timestamped chunks
                            formatted_transcript = self._format_timestamped_transcript(data['content'])
                        else:
                            # We got plain text, add basic formatting
                            formatted_transcript = self._format_plain_transcript(data.get('content', ''))
                        
                        return {
                            'status': 'completed',
                            'content': formatted_transcript,
                            'lang': data.get('lang', 'en'),
                            'available_langs': data.get('availableLangs', [])
                        }
                    elif response.status == 202:
                        # Job ID for async processing
                        data = await response.json()
                        job_id = data.get('jobId')
                        
                        # Poll for results
                        return await self._poll_job_status(job_id)
                    else:
                        error_data = await response.json()
                        return {
                            'status': 'error',
                            'error': error_data.get('message', 'Unknown error occurred')
                        }
                        
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Failed to get transcript: {str(e)}'
            }
    
    def _format_timestamped_transcript(self, chunks: list) -> str:
        """Format timestamped transcript chunks into readable text"""
        formatted_lines = []
        
        for chunk in chunks:
            if isinstance(chunk, dict):
                text = chunk.get('text', '').strip()
                offset = chunk.get('offset', 0)
                
                if text:
                    # Convert milliseconds to MM:SS format - handle both int and float
                    try:
                        seconds = int(float(offset)) // 1000
                        minutes = seconds // 60
                        seconds = seconds % 60
                        timestamp = f"{minutes:02d}:{seconds:02d}"
                    except (ValueError, TypeError):
                        timestamp = "00:00"
                    
                    # Clean up the text
                    cleaned_text = text.replace('\n', ' ').strip()
                    
                    formatted_lines.append(f"[{timestamp}] {cleaned_text}")
        
        # Group lines by topic/speaker changes
        grouped_lines = []
        current_group = []
        
        for line in formatted_lines:
            current_group.append(line)
            
            # Start new paragraph after certain punctuation or length
            if (line.endswith('.') or line.endswith('!') or line.endswith('?')) and len(current_group) >= 2:
                grouped_lines.append('\n'.join(current_group))
                current_group = []
        
        # Add remaining lines
        if current_group:
            grouped_lines.append('\n'.join(current_group))
        
        return '\n\n'.join(grouped_lines)
    
    def _format_plain_transcript(self, text: str) -> str:
        """Format plain text transcript with artificial timestamps and paragraphs"""
        if not text:
            return ""
        
        # Split into sentences and add artificial timestamps
        sentences = text.split('. ')
        formatted_lines = []
        
        current_time = 0
        for i, sentence in enumerate(sentences):
            if sentence.strip():
                # Add artificial timestamp every 10-15 seconds
                minutes = current_time // 60
                seconds = current_time % 60
                timestamp = f"{minutes:02d}:{seconds:02d}"
                
                cleaned_sentence = sentence.strip()
                if cleaned_sentence and not cleaned_sentence.endswith('.'):
                    cleaned_sentence += '.'
                
                formatted_lines.append(f"[{timestamp}] {cleaned_sentence}")
                
                # Increment time (estimate 3-5 seconds per sentence)
                current_time += 4 + (len(sentence.split()) // 3)
        
        # Group into paragraphs
        paragraphs = []
        current_paragraph = []
        
        for i, line in enumerate(formatted_lines):
            current_paragraph.append(line)
            
            # New paragraph every 3-4 sentences or at natural breaks
            if (i + 1) % 3 == 0 or 'Now' in line or 'So' in line.split()[1:2]:
                paragraphs.append('\n'.join(current_paragraph))
                current_paragraph = []
        
        # Add remaining lines
        if current_paragraph:
            paragraphs.append('\n'.join(current_paragraph))
        
        return '\n\n'.join(paragraphs)
    
    async def _poll_job_status(self, job_id: str, max_attempts: int = 30, delay: int = 2) -> Dict[str, Any]:
        """
        Poll job status until completion or failure
        """
        headers = {
            'x-api-key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        for attempt in range(max_attempts):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{self.base_url}/transcript/{job_id}",
                        headers=headers
                    ) as response:
                        
                        if response.status == 200:
                            data = await response.json()
                            status = data.get('status')
                            
                            if status == 'completed':
                                return {
                                    'status': 'completed',
                                    'content': data.get('content', ''),
                                    'lang': data.get('lang', 'en'),
                                    'available_langs': data.get('availableLangs', [])
                                }
                            elif status == 'failed':
                                return {
                                    'status': 'error',
                                    'error': data.get('error', 'Job failed')
                                }
                            elif status in ['queued', 'active']:
                                # Continue polling
                                await asyncio.sleep(delay)
                                continue
                        
            except Exception as e:
                if attempt == max_attempts - 1:
                    return {
                        'status': 'error',
                        'error': f'Polling failed: {str(e)}'
                    }
                await asyncio.sleep(delay)
        
        return {
            'status': 'error',
            'error': 'Job polling timeout'
        }

    def extract_video_id(self, url: str) -> Optional[str]:
        """
        Extract video ID from YouTube URL
        """
        import re
        
        # YouTube video ID patterns
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)',
            r'youtube\.com\/watch\?.*?v=([^&\n?#]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None

    def is_supported_platform(self, url: str) -> bool:
        """
        Check if URL is from supported platform
        """
        supported_domains = [
            'youtube.com',
            'youtu.be',
            'tiktok.com',
            'instagram.com',
            'x.com',
            'twitter.com'
        ]
        
        return any(domain in url.lower() for domain in supported_domains)