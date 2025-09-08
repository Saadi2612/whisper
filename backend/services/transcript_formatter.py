import os
import re
from typing import Dict, Any
from .custom_llm import CustomLlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()

class TranscriptFormatterService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    async def format_transcript(self, raw_transcript: str) -> Dict[str, Any]:
        """
        Use AI to reformat transcript into proper paragraphs without losing content
        """
        try:
            # First clean up the transcript structure
            cleaned_transcript = self._preprocess_transcript(raw_transcript)
            
            # Create system prompt for comprehensive transcript formatting
            system_prompt = """You are a professional transcript formatter and editor. Your job is to take raw, poorly formatted YouTube transcripts and reformat them into clean, readable article-style text.

CRITICAL RULES:
1. **PRESERVE ALL CONTENT**: Do not remove, summarize, or lose ANY spoken words
2. **NO SUMMARIZING**: This is formatting only, not summarization
3. **Fix grammar**: Correct obvious grammar errors and sentence structure
4. **Create proper paragraphs**: Group related sentences into logical, flowing paragraphs
5. **Natural conversation flow**: Make it read like a well-written article
6. **Improve readability**: Fix awkward breaks and unclear phrasing
7. **Preserve meaning**: Keep all original meaning and context intact

Transform format from:
"cash flow"
"They're very profitable"
"It's"
"growing decently, and it's pretty"
"reasonably priced"

To:
"The company has strong cash flow and they're very profitable. It's growing decently and is pretty reasonably priced."

Return ONLY the reformatted transcript in proper paragraph format."""

            # Initialize chat
            chat = CustomLlmChat(
                api_key=self.api_key,
                session_id=f"transcript_reformat_{hash(cleaned_transcript[:150])}",
                system_message=system_prompt
            ).with_model("groq", "meta-llama/llama-4-scout-17b-16e-instruct")

            # Split transcript into chunks if too long
            max_chunk_size = 8000
            if len(cleaned_transcript) > max_chunk_size:
                # Process in chunks
                chunks = [cleaned_transcript[i:i+max_chunk_size] for i in range(0, len(cleaned_transcript), max_chunk_size)]
                formatted_chunks = []
                
                for chunk in chunks:
                    chunk_result = await self._format_chunk(chat, chunk)
                    formatted_chunks.append(chunk_result)
                
                formatted_transcript = '\n\n'.join(formatted_chunks)
            else:
                # Process as single piece
                formatted_transcript = await self._format_chunk(chat, cleaned_transcript)
            
            # Final cleanup
            formatted_transcript = self._post_process_formatting(formatted_transcript)
            
            return {
                'status': 'success',
                'formatted_transcript': formatted_transcript
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Failed to format transcript: {str(e)}',
                'formatted_transcript': self._basic_cleanup(raw_transcript)
            }
    
    async def _format_chunk(self, chat: CustomLlmChat, chunk: str) -> str:
        """Format a single chunk of transcript"""
        format_prompt = f"""
Please reformat this transcript segment into proper, readable paragraphs. Fix grammar and flow but preserve ALL spoken content:

{chunk}

Return only the cleaned, well-formatted text with proper paragraph structure.
"""
        
        user_message = UserMessage(text=format_prompt)
        response = await chat.send_message(user_message)
        return response.strip()
    
    def _preprocess_transcript(self, transcript: str) -> str:
        """
        Basic preprocessing to clean up obvious issues
        """
        # Remove excessive whitespace and line breaks
        cleaned = re.sub(r'\n+', ' ', transcript)
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        # Fix obvious timestamp patterns
        cleaned = re.sub(r'\[(\d{1,2}:\d{2})\]\s*', r' [\\1] ', cleaned)
        
        return cleaned.strip()
    
    def _basic_cleanup(self, transcript: str) -> str:
        """
        Basic cleanup if AI formatting fails
        """
        # Split into sentences and group into paragraphs
        sentences = re.split(r'(?<=[.!?])\s+', transcript)
        paragraphs = []
        current_paragraph = []
        
        for sentence in sentences:
            current_paragraph.append(sentence.strip())
            
            # New paragraph every 3-4 sentences
            if len(current_paragraph) >= 3:
                paragraphs.append(' '.join(current_paragraph))
                current_paragraph = []
        
        # Add remaining sentences
        if current_paragraph:
            paragraphs.append(' '.join(current_paragraph))
        
        return '\n\n'.join(paragraphs)
    
    def _post_process_formatting(self, transcript: str) -> str:
        """
        Additional post-processing to ensure good formatting
        """
        # Remove excessive whitespace
        transcript = re.sub(r'\n{3,}', '\n\n', transcript)
        
        # Ensure proper spacing after timestamps
        transcript = re.sub(r'\[(\d{2}:\d{2})\]\s*', r'[\1] ', transcript)
        
        # Fix spacing around punctuation
        transcript = re.sub(r'\s+([,.!?])', r'\1', transcript)
        transcript = re.sub(r'([.!?])\s*([A-Z])', r'\1 \2', transcript)
        
        # Remove any remaining multiple spaces
        transcript = re.sub(r'  +', ' ', transcript)
        
        return transcript.strip()