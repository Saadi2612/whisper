import os
import json
from typing import Dict, Any, List
from .custom_llm import CustomLlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()

class VideoQAService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    async def answer_question(self, question: str, video_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Answer follow-up questions about the video content with full context
        """
        try:
            # Create context-aware system prompt
            video_title = video_context.get('title', 'Unknown Video')
            video_transcript = video_context.get('transcript', '')
            video_analysis = video_context.get('analysis', {})
            
            system_prompt = f"""You are an expert assistant with complete knowledge of this specific video: "{video_title}".

You have access to:
1. The full video transcript
2. Comprehensive AI analysis of the content
3. All data points, concepts, and insights extracted from the video

Your role is to answer follow-up questions about this video with:
- Complete accuracy based on the actual content
- Detailed explanations with context from the video
- References to specific parts of the video when relevant
- Additional context that helps understanding
- Practical applications and examples

Always base your answers on the actual video content and analysis provided.

**Video Context:**
Title: {video_title}
Content Type: {video_analysis.get('content_type', 'general')}
Key Topics: {', '.join(video_analysis.get('topics', []))}

**Video Analysis Summary:**
{video_analysis.get('executive_summary', 'No analysis available')[:1000]}

**Key Concepts from Video:**
{json.dumps(video_analysis.get('technical_concepts', [])[:10], indent=2) if video_analysis.get('technical_concepts') else 'No technical concepts extracted'}
"""

            # Initialize chat with video context
            chat = CustomLlmChat(
                api_key=self.api_key,
                session_id=f"qa_{hash(video_title + question[:50])}",
                system_message=system_prompt
            ).with_model("groq", "meta-llama/llama-4-scout-17b-16e-instruct")

            # Create contextual question prompt
            qa_prompt = f"""
Based on the video "{video_title}" and its content, please answer this question:

**Question**: {question}

Provide a comprehensive answer that:
1. References specific content from the video
2. Explains the concept thoroughly with context
3. Gives practical examples or applications if relevant
4. Mentions if this relates to other concepts discussed in the video
5. Provides additional helpful context

Answer in a clear, educational manner that helps the person understand the concept completely.
"""

            user_message = UserMessage(text=qa_prompt)
            response = await chat.send_message(user_message)
            
            return {
                'status': 'success',
                'answer': response,
                'question': question,
                'confidence': 0.9
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Failed to answer question: {str(e)}'
            }
    
    async def get_suggested_questions(self, video_analysis: Dict[str, Any]) -> List[str]:
        """
        Generate intelligent follow-up questions based on video content
        """
        try:
            content_type = video_analysis.get('content_type', 'general')
            topics = video_analysis.get('topics', [])
            concepts = video_analysis.get('technical_concepts', [])
            
            # Generate content-specific questions
            if content_type == 'financial':
                questions = [
                    "What is RSI and how do you calculate it?",
                    "How do support and resistance levels work in trading?",
                    "What are the key indicators for market trends?",
                    "How do you analyze stock charts effectively?"
                ]
            elif content_type == 'tech':
                questions = [
                    "What are the technical specifications mentioned?",
                    "How does this compare to competitors?",
                    "What are the pros and cons discussed?",
                    "What should I consider before buying?"
                ]
            elif content_type == 'educational':
                questions = [
                    "Can you explain the key concepts in simpler terms?",
                    "What are some practical applications?",
                    "How does this relate to other topics?",
                    "What should I study next to learn more?"
                ]
            else:
                # Generate questions from topics and concepts
                questions = [
                    f"Can you explain more about {topics[0] if topics else 'the main topic'}?",
                    "What are the most important takeaways?",
                    "How can I apply this information?",
                    "What related concepts should I understand?"
                ]
            
            return questions[:4]
            
        except Exception as e:
            return [
                "Can you explain the main concepts in more detail?",
                "What are the key takeaways from this video?",
                "How can I apply this information?",
                "What should I know more about?"
            ]