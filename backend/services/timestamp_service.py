import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class TimestampedSegment:
    """Represents a timestamped segment of text"""
    start_time: int  # seconds
    end_time: int    # seconds  
    text: str
    raw_timestamp: str

class TimestampService:
    """Service for parsing timestamps and extracting text for specific time ranges"""
    
    @staticmethod
    def parse_time_to_seconds(time_str: str) -> int:
        """Convert time string (MM:SS or HH:MM:SS) to seconds"""
        try:
            time_str = time_str.strip()
            parts = time_str.split(':')
            
            if len(parts) == 2:  # MM:SS format
                minutes, seconds = map(int, parts)
                return minutes * 60 + seconds
            elif len(parts) == 3:  # HH:MM:SS format
                hours, minutes, seconds = map(int, parts)
                return hours * 3600 + minutes * 60 + seconds
            else:
                return 0
        except (ValueError, IndexError):
            return 0
    
    @staticmethod
    def seconds_to_time_string(seconds: int) -> str:
        """Convert seconds to MM:SS format"""
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes:02d}:{secs:02d}"
    
    @classmethod
    def parse_transcript_timestamps(cls, transcript: str) -> List[TimestampedSegment]:
        """Parse transcript and extract timestamped segments"""
        segments = []
        
        # Split transcript into paragraphs/sections
        paragraphs = re.split(r'\n\s*\n+', transcript.strip())
        
        for paragraph in paragraphs:
            if not paragraph.strip():
                continue
                
            # Find all timestamp patterns in this paragraph
            lines = paragraph.split('\n')
            current_segment_text = []
            current_timestamp = None
            current_start_time = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Look for timestamp pattern: [MM:SS] or [HH:MM:SS] 
                timestamp_match = re.match(r'^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(.*)', line)
                
                if timestamp_match:
                    # Save previous segment if exists
                    if current_timestamp and current_segment_text:
                        segments.append(TimestampedSegment(
                            start_time=current_start_time,
                            end_time=current_start_time + 30,  # Default 30 second segments
                            text=' '.join(current_segment_text),
                            raw_timestamp=current_timestamp
                        ))
                    
                    # Start new segment
                    current_timestamp = timestamp_match.group(1)
                    current_start_time = cls.parse_time_to_seconds(current_timestamp)
                    current_segment_text = [timestamp_match.group(2)] if timestamp_match.group(2) else []
                else:
                    # Add to current segment
                    if current_timestamp:
                        current_segment_text.append(line)
            
            # Add final segment
            if current_timestamp and current_segment_text:
                segments.append(TimestampedSegment(
                    start_time=current_start_time,
                    end_time=current_start_time + 30,
                    text=' '.join(current_segment_text),
                    raw_timestamp=current_timestamp
                ))
        
        # Update end times based on next segment start times
        for i in range(len(segments) - 1):
            segments[i].end_time = segments[i + 1].start_time
        
        return segments
    
    @classmethod
    def extract_text_for_time_range(cls, transcript: str, start_time: str, end_time: str) -> Dict[str, any]:
        """Extract text content for a specific time range"""
        try:
            start_seconds = cls.parse_time_to_seconds(start_time)
            end_seconds = cls.parse_time_to_seconds(end_time)
            
            if start_seconds >= end_seconds:
                return {
                    'status': 'error',
                    'error': 'Start time must be before end time'
                }
            
            # Parse all timestamped segments
            segments = cls.parse_transcript_timestamps(transcript)
            
            if not segments:
                # Handle transcript without timestamps - return portion based on artificial timeline
                return cls._extract_from_artificial_timeline(transcript, start_seconds, end_seconds)
            
            # Find segments within the time range
            selected_segments = []
            for segment in segments:
                # Check if segment overlaps with the requested time range
                if (segment.start_time < end_seconds and segment.end_time > start_seconds):
                    selected_segments.append(segment)
            
            if not selected_segments:
                return {
                    'status': 'success',
                    'text': '',
                    'segments': [],
                    'duration': f"{cls.seconds_to_time_string(start_seconds)} - {cls.seconds_to_time_string(end_seconds)}"
                }
            
            # Combine text from selected segments
            combined_text = []
            for segment in selected_segments:
                # Add timestamp prefix for context
                combined_text.append(f"[{segment.raw_timestamp}] {segment.text}")
            
            return {
                'status': 'success',
                'text': '\n\n'.join(combined_text),
                'segments': [
                    {
                        'timestamp': segment.raw_timestamp,
                        'start_time': segment.start_time,
                        'end_time': segment.end_time,
                        'text': segment.text
                    }
                    for segment in selected_segments
                ],
                'duration': f"{cls.seconds_to_time_string(start_seconds)} - {cls.seconds_to_time_string(end_seconds)}",
                'segment_count': len(selected_segments)
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Failed to extract text for time range: {str(e)}'
            }
    
    @classmethod
    def get_transcript_timeline(cls, transcript: str) -> Dict[str, any]:
        """Get the full timeline of the transcript with timestamps"""
        try:
            segments = cls.parse_transcript_timestamps(transcript)
            
            if not segments:
                # Handle transcripts without timestamps by creating artificial segments
                return cls._create_artificial_timeline(transcript)
            
            timeline = []
            for segment in segments:
                timeline.append({
                    'timestamp': segment.raw_timestamp,
                    'start_time': segment.start_time,
                    'end_time': segment.end_time,
                    'text_preview': segment.text[:100] + ('...' if len(segment.text) > 100 else ''),
                    'duration_seconds': segment.end_time - segment.start_time
                })
            
            total_duration = segments[-1].end_time if segments else 0
            
            return {
                'status': 'success',
                'timeline': timeline,
                'total_segments': len(segments),
                'total_duration_seconds': total_duration,
                'total_duration_formatted': cls.seconds_to_time_string(total_duration),
                'has_timestamps': True
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Failed to get transcript timeline: {str(e)}'
            }
    
    @classmethod
    def _create_artificial_timeline(cls, transcript: str) -> Dict[str, any]:
        """Create an artificial timeline for transcripts without timestamps"""
        try:
            # Split transcript into sentences or paragraphs
            import re
            
            # Clean up the transcript
            text = transcript.strip()
            if not text:
                return {
                    'status': 'error',
                    'error': 'Transcript is empty'
                }
            
            # Split into sentences (roughly)
            sentences = re.split(r'[.!?]+\s+', text)
            sentences = [s.strip() for s in sentences if s.strip()]
            
            if not sentences:
                # Fallback: split by paragraphs or lines
                sentences = [p.strip() for p in text.split('\n\n') if p.strip()]
                if not sentences:
                    sentences = [p.strip() for p in text.split('\n') if p.strip()]
            
            # Create artificial timeline segments
            timeline = []
            segment_duration = 30  # 30 seconds per segment
            current_time = 0
            
            # Group sentences into reasonable segments
            segment_size = max(1, len(sentences) // 10)  # Create roughly 10 segments
            if segment_size > 5:
                segment_size = 5  # But no more than 5 sentences per segment
            
            for i in range(0, len(sentences), segment_size):
                segment_sentences = sentences[i:i+segment_size]
                segment_text = '. '.join(segment_sentences)
                
                if len(segment_text) > 200:
                    segment_text = segment_text[:200] + '...'
                
                timeline.append({
                    'timestamp': cls.seconds_to_time_string(current_time),
                    'start_time': current_time,
                    'end_time': current_time + segment_duration,
                    'text_preview': segment_text,
                    'duration_seconds': segment_duration
                })
                
                current_time += segment_duration
            
            return {
                'status': 'success',
                'timeline': timeline,
                'total_segments': len(timeline),
                'total_duration_seconds': current_time,
                'total_duration_formatted': cls.seconds_to_time_string(current_time),
                'has_timestamps': False,
                'note': 'This transcript does not contain original timestamps. Segments are artificially created for navigation purposes.'
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Failed to create artificial timeline: {str(e)}'
            }
    
    @classmethod
    def _extract_from_artificial_timeline(cls, transcript: str, start_seconds: int, end_seconds: int) -> Dict[str, any]:
        """Extract text from transcript without timestamps using artificial timeline logic"""
        try:
            # Create artificial timeline to understand segment boundaries
            timeline_result = cls._create_artificial_timeline(transcript)
            
            if timeline_result['status'] != 'success':
                return timeline_result
            
            timeline = timeline_result['timeline']
            total_duration = timeline_result['total_duration_seconds']
            
            # Find which artificial segments fall within the requested time range
            selected_segments = []
            for segment in timeline:
                if (segment['start_time'] < end_seconds and segment['end_time'] > start_seconds):
                    selected_segments.append(segment)
            
            if not selected_segments:
                return {
                    'status': 'success',
                    'text': 'No content found in the selected time range.',
                    'segments': [],
                    'duration': f"{cls.seconds_to_time_string(start_seconds)} - {cls.seconds_to_time_string(end_seconds)}",
                    'note': 'This transcript does not contain original timestamps. Content extracted using artificial timeline.'
                }
            
            # Since we don't have actual timestamped content, we'll estimate the portion of text
            # based on the percentage of total duration requested
            text_length = len(transcript)
            
            # Calculate what portion of the text corresponds to the requested time range
            start_ratio = start_seconds / max(total_duration, 1)
            end_ratio = min(end_seconds / max(total_duration, 1), 1.0)
            
            start_char = int(start_ratio * text_length)
            end_char = int(end_ratio * text_length)
            
            # Extract the text portion and clean it up
            selected_text = transcript[start_char:end_char].strip()
            
            # Try to start and end at word boundaries
            if start_char > 0:
                # Find the start of the next word
                space_index = selected_text.find(' ')
                if space_index != -1:
                    selected_text = selected_text[space_index + 1:]
            
            if end_char < text_length:
                # Find the end of the last complete word
                space_index = selected_text.rfind(' ')
                if space_index != -1:
                    selected_text = selected_text[:space_index]
            
            return {
                'status': 'success',
                'text': selected_text,
                'segments': [
                    {
                        'timestamp': segment['timestamp'],
                        'start_time': segment['start_time'],
                        'end_time': segment['end_time'],
                        'text': segment['text_preview']
                    }
                    for segment in selected_segments
                ],
                'duration': f"{cls.seconds_to_time_string(start_seconds)} - {cls.seconds_to_time_string(end_seconds)}",
                'segment_count': len(selected_segments),
                'note': 'This transcript does not contain original timestamps. Content extracted using artificial timeline.'
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Failed to extract from artificial timeline: {str(e)}'
            }
