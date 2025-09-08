import os
import json
from typing import Dict, Any
from .custom_llm import CustomLlmChat, UserMessage
from .timestamp_service import TimestampService
from dotenv import load_dotenv

load_dotenv()

class TimeRangeSummaryService:
    """Service for generating AI summaries of specific time ranges from video transcripts"""
    
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        self.timestamp_service = TimestampService()
    
    async def generate_time_range_summary(
        self, 
        transcript: str, 
        start_time: str, 
        end_time: str, 
        video_title: str = "", 
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generate a focused summary for a specific time range of the video
        """
        try:
            # Extract text for the specific time range
            time_range_result = self.timestamp_service.extract_text_for_time_range(
                transcript, start_time, end_time
            )
            
            if time_range_result['status'] != 'success':
                return time_range_result
            
            if not time_range_result['text'].strip():
                empty_summary = {
                    'time_range': time_range_result['duration'],
                    'main_topic': 'No content available',
                    'content_summary': 'No content found in this time range.',
                    'key_points': [],
                    'concepts_discussed': [],
                    'actionable_items': [],
                    'segment_count': 0
                }
                
                formatted_summary = self._format_summary_for_display(empty_summary)
                
                return {
                    'status': 'success',
                    'summary': formatted_summary,  # Formatted version for frontend display
                    'raw_summary': empty_summary,  # Keep original data for API consumers
                    'formatted_summary': formatted_summary  # Also keep this for backward compatibility
                }
            
            # Create focused summary prompt
            system_prompt = """You are an expert content analyzer specializing in creating focused, time-specific summaries. 

Your task is to analyze a specific segment of a video transcript and create a concise but comprehensive summary that captures:
1. The main topic/theme of this segment
2. Key points discussed in chronological order
3. Important concepts, definitions, or explanations
4. Any actionable advice or recommendations
5. Data points, numbers, or specific facts mentioned
6. How this segment relates to the broader video content

Create focused summaries that help users understand exactly what was discussed in this specific time period."""

            # Build the analysis prompt
            analysis_prompt = f"""
FOCUSED TIME RANGE ANALYSIS

Video Title: {video_title}
Time Range: {time_range_result['duration']} ({time_range_result['segment_count']} segments)

Content to Analyze:
{time_range_result['text']}

Please provide a focused analysis in the following JSON format:
{{
    "time_range": "{time_range_result['duration']}",
    "main_topic": "primary subject of this time segment",
    "content_summary": "2-3 paragraph summary of what's discussed in this time range",
    "key_points": [
        "specific point 1 discussed",
        "specific point 2 discussed", 
        "specific point 3 discussed"
    ],
    "concepts_discussed": [
        {{"concept": "name", "explanation": "brief explanation", "timestamp": "when mentioned"}},
        {{"concept": "name", "explanation": "brief explanation", "timestamp": "when mentioned"}}
    ],
    "data_points": [
        {{"type": "number/percentage/price", "value": "actual value", "context": "what it relates to"}},
        {{"type": "number/percentage/price", "value": "actual value", "context": "what it relates to"}}
    ],
    "actionable_items": [
        "specific action the viewer can take based on this segment",
        "another actionable recommendation"
    ],
    "key_quotes": [
        "important direct quote from this time range",
        "another significant quote"
    ],
    "segment_context": "how this segment fits into the broader video content",
    "difficulty_level": "beginner/intermediate/advanced",
    "estimated_value": "why this segment is valuable to watch"
}}

Focus only on content from this specific time range. Be precise and specific.
"""

            # Initialize chat
            chat = CustomLlmChat(
                api_key=self.api_key,
                session_id=f"time_range_summary_{hash(time_range_result['text'][:100])}",
                system_message=system_prompt
            ).with_model("groq", "meta-llama/llama-4-scout-17b-16e-instruct")

            # Get AI analysis
            user_message = UserMessage(text=analysis_prompt)
            response = await chat.send_message(user_message)
            
            # Parse JSON response
            try:
                response_text = response.strip()
                
                # Clean up common markdown formatting
                if '```json' in response_text:
                    # Extract content between ```json and ```
                    start_idx = response_text.find('```json') + 7
                    end_idx = response_text.find('```', start_idx)
                    if end_idx != -1:
                        response_text = response_text[start_idx:end_idx]
                elif '```' in response_text:
                    # Extract content between ``` blocks
                    start_idx = response_text.find('```') + 3
                    end_idx = response_text.find('```', start_idx)
                    if end_idx != -1:
                        response_text = response_text[start_idx:end_idx]
                
                # Remove any remaining markdown or formatting
                response_text = response_text.strip()
                
                # Try to find JSON content if it's embedded in text
                if not response_text.startswith('{'):
                    # Look for the first { and last }
                    start_idx = response_text.find('{')
                    end_idx = response_text.rfind('}')
                    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                        response_text = response_text[start_idx:end_idx+1]
                
                summary_data = json.loads(response_text)
                
                # Add metadata
                summary_data.update({
                    'segment_count': time_range_result['segment_count'],
                    'segments': time_range_result['segments']
                })
                
                # Format the summary for display
                formatted_summary = self._format_summary_for_display(summary_data)
                
                return {
                    'status': 'success',
                    'summary': formatted_summary,  # Formatted version for frontend display
                    'raw_summary': summary_data,  # Keep original data for API consumers
                    'formatted_summary': formatted_summary  # Also keep this for backward compatibility
                }
                
            except json.JSONDecodeError:
                # Fallback to structured text parsing
                return await self._create_fallback_summary(
                    response, time_range_result, start_time, end_time
                )
                
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Failed to generate time range summary: {str(e)}'
            }
    
    async def _create_fallback_summary(
        self, 
        response_text: str, 
        time_range_result: Dict[str, Any], 
        start_time: str, 
        end_time: str
    ) -> Dict[str, Any]:
        """Create a fallback summary when JSON parsing fails"""
        try:
            # Extract key information from the response text
            lines = response_text.split('\n')
            key_points = []
            current_section = ""
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                # Simple parsing for key points
                if line.startswith('•') or line.startswith('-') or line.startswith('*'):
                    key_points.append(line[1:].strip())
                elif line.lower().startswith('key') or line.lower().startswith('main'):
                    current_section = line
            
            # Create basic summary structure
            summary_data = {
                'time_range': time_range_result['duration'],
                'main_topic': f"Content from {start_time} to {end_time}",
                'content_summary': response_text[:300] + "..." if len(response_text) > 300 else response_text,
                'key_points': key_points[:5] if key_points else ["Content analysis available"],
                'concepts_discussed': [],
                'data_points': [],
                'actionable_items': [],
                'key_quotes': [],
                'segment_context': f"This segment covers {time_range_result['segment_count']} timestamped sections",
                'difficulty_level': 'general',
                'estimated_value': 'Contains focused content from the specified time range',
                'segment_count': time_range_result['segment_count'],
                'segments': time_range_result['segments']
            }
            
            # Format the fallback summary for display
            formatted_summary = self._format_summary_for_display(summary_data)
            
            return {
                'status': 'success',
                'summary': formatted_summary,  # Formatted version for frontend display
                'raw_summary': summary_data,  # Keep original data for API consumers
                'formatted_summary': formatted_summary  # Also keep this for backward compatibility
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Failed to create fallback summary: {str(e)}'
            }
    
    async def compare_time_ranges(
        self,
        transcript: str,
        time_ranges: list,
        video_title: str = ""
    ) -> Dict[str, Any]:
        """
        Compare multiple time ranges and highlight differences
        """
        try:
            summaries = []
            
            # Generate summary for each time range
            for time_range in time_ranges:
                start_time = time_range.get('start_time')
                end_time = time_range.get('end_time')
                label = time_range.get('label', f"{start_time}-{end_time}")
                
                summary_result = await self.generate_time_range_summary(
                    transcript, start_time, end_time, video_title
                )
                
                if summary_result['status'] == 'success':
                    summary_result['summary']['label'] = label
                    summaries.append(summary_result['summary'])
            
            if not summaries:
                return {
                    'status': 'error',
                    'error': 'No valid summaries generated for comparison'
                }
            
            # Create comparison analysis
            comparison = {
                'status': 'success',
                'comparison': {
                    'time_ranges': summaries,
                    'common_themes': self._find_common_themes(summaries),
                    'unique_points': self._find_unique_points(summaries),
                    'progression_analysis': self._analyze_progression(summaries)
                }
            }
            
            return comparison
            
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Failed to compare time ranges: {str(e)}'
            }
    
    def _find_common_themes(self, summaries: list) -> list:
        """Find themes common across multiple time ranges"""
        common_themes = []
        
        # Simple keyword analysis across summaries
        all_topics = []
        for summary in summaries:
            topic = summary.get('main_topic', '').lower()
            if topic:
                all_topics.append(topic)
        
        # Find recurring keywords
        word_counts = {}
        for topic in all_topics:
            for word in topic.split():
                if len(word) > 3:
                    word_counts[word] = word_counts.get(word, 0) + 1
        
        common_themes = [word for word, count in word_counts.items() if count > 1]
        return common_themes[:5]
    
    def _find_unique_points(self, summaries: list) -> list:
        """Find points unique to each time range"""
        unique_points = []
        
        for summary in summaries:
            label = summary.get('label', 'Unknown')
            key_points = summary.get('key_points', [])
            
            if key_points:
                unique_points.append({
                    'time_range': label,
                    'unique_aspects': key_points[:3]  # Top 3 points
                })
        
        return unique_points
    
    def _analyze_progression(self, summaries: list) -> str:
        """Analyze how content progresses across time ranges"""
        if len(summaries) < 2:
            return "Insufficient time ranges for progression analysis"
        
        # Simple analysis based on summary content
        progression_notes = []
        
        for i in range(len(summaries) - 1):
            current = summaries[i]
            next_summary = summaries[i + 1]
            
            current_topic = current.get('main_topic', '')
            next_topic = next_summary.get('main_topic', '')
            
            if current_topic and next_topic:
                progression_notes.append(
                    f"From {current.get('label', 'segment')} to {next_summary.get('label', 'next segment')}: "
                    f"Topic shifts from {current_topic} to {next_topic}"
                )
        
        return " | ".join(progression_notes) if progression_notes else "Content progression analysis available"
    
    def _format_summary_for_display(self, summary_data: Dict[str, Any]) -> str:
        """Format the summary data into a readable display format"""
        try:
            formatted_parts = []
            
            # Time Range
            time_range = summary_data.get('time_range', 'Unknown time range')
            formatted_parts.append(f"## Time Range: {time_range}\n")
            
            # Main Topic
            main_topic = summary_data.get('main_topic', 'General content')
            formatted_parts.append(f"## Main Topic\n{main_topic}\n")
            
            # Content Summary
            content_summary = summary_data.get('content_summary', 'No summary available')
            formatted_parts.append(f"## Summary\n{content_summary}\n")
            
            # Key Points
            key_points = summary_data.get('key_points', [])
            if key_points:
                formatted_parts.append("## Key Points")
                for i, point in enumerate(key_points, 1):
                    formatted_parts.append(f"{i}. {point}")
                formatted_parts.append("")  # Add blank line
            
            # Concepts Discussed
            concepts = summary_data.get('concepts_discussed', [])
            if concepts:
                formatted_parts.append("## Concepts Discussed")
                for concept in concepts:
                    concept_name = concept.get('concept', 'Unknown concept')
                    explanation = concept.get('explanation', 'No explanation provided')
                    formatted_parts.append(f"**{concept_name}**: {explanation}")
                formatted_parts.append("")  # Add blank line
            
            # Data Points
            data_points = summary_data.get('data_points', [])
            if data_points:
                formatted_parts.append("## Data Points")
                for data_point in data_points:
                    value = data_point.get('value', 'N/A')
                    context = data_point.get('context', 'No context')
                    formatted_parts.append(f"• **{value}** - {context}")
                formatted_parts.append("")  # Add blank line
            
            # Actionable Items
            actionable_items = summary_data.get('actionable_items', [])
            if actionable_items:
                formatted_parts.append("## Actionable Items")
                for i, item in enumerate(actionable_items, 1):
                    formatted_parts.append(f"{i}. {item}")
                formatted_parts.append("")  # Add blank line
            
            # Key Quotes
            key_quotes = summary_data.get('key_quotes', [])
            if key_quotes:
                formatted_parts.append("## Key Quotes")
                for quote in key_quotes:
                    formatted_parts.append(f'> "{quote}"')
                formatted_parts.append("")  # Add blank line
            
            # Segment Context
            segment_context = summary_data.get('segment_context', '')
            if segment_context:
                formatted_parts.append(f"## Context\n{segment_context}\n")
            
            # Estimated Value
            estimated_value = summary_data.get('estimated_value', '')
            if estimated_value:
                formatted_parts.append(f"## Why This Segment Matters\n{estimated_value}\n")
            
            return "\n".join(formatted_parts)
            
        except Exception as e:
            return f"Error formatting summary: {str(e)}"
