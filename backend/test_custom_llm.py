#!/usr/bin/env python3
"""
Test script to verify the custom LLM implementation works correctly
"""
import asyncio
import os
from services.custom_llm import CustomLlmChat, UserMessage
from services.llm_service import LLMService

async def test_custom_llm():
    """Test the custom LLM implementation"""
    print("Testing Custom LLM Implementation...")
    
    # Check if API key is available
    api_key = os.environ.get('EMERGENT_LLM_KEY') or os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("❌ No API key found. Please set EMERGENT_LLM_KEY or OPENAI_API_KEY environment variable.")
        return False
    
    try:
        # Test basic chat functionality
        print("1. Testing basic chat functionality...")
        chat = CustomLlmChat(
            api_key=api_key,
            session_id="test_session",
            system_message="You are a helpful assistant."
        ).with_model("openai", "gpt-3.5-turbo")
        
        user_message = UserMessage("Hello! Can you tell me what 2+2 equals?")
        response = await chat.send_message(user_message)
        print(f"✅ Basic chat response: {response[:100]}...")
        
        # Test conversation history
        print("2. Testing conversation history...")
        history = chat.get_conversation_history()
        print(f"✅ Conversation history length: {len(history)}")
        
        # Test LLMService integration
        print("3. Testing LLMService integration...")
        llm_service = LLMService()
        
        # Test with a simple transcript
        test_transcript = """
        This is a test video about artificial intelligence. 
        AI is transforming many industries including healthcare, finance, and education.
        The key benefits include automation, efficiency, and improved decision making.
        However, there are also challenges like bias, privacy concerns, and job displacement.
        """
        
        result = await llm_service.generate_video_summary(
            transcript=test_transcript,
            title="Test AI Video",
            channel_name="Test Channel"
        )
        
        if result['status'] == 'success':
            print("✅ LLMService integration successful!")
            print(f"   Content type: {result['analysis'].get('content_type', 'unknown')}")
            print(f"   Executive summary length: {len(result['analysis'].get('executive_summary', ''))}")
            print(f"   Key insights count: {len(result['analysis'].get('key_insights', []))}")
        else:
            print(f"❌ LLMService integration failed: {result.get('error', 'Unknown error')}")
            return False
        
        # Test TranscriptFormatterService integration
        print("4. Testing TranscriptFormatterService integration...")
        from services.transcript_formatter import TranscriptFormatterService
        
        formatter = TranscriptFormatterService()
        format_result = await formatter.format_transcript(test_transcript)
        
        if format_result['status'] == 'success':
            print("✅ TranscriptFormatterService integration successful!")
            print(f"   Formatted transcript length: {len(format_result.get('formatted_transcript', ''))}")
        else:
            print(f"❌ TranscriptFormatterService integration failed: {format_result.get('error', 'Unknown error')}")
            return False
        
        # Test VideoQAService integration
        print("5. Testing VideoQAService integration...")
        from services.video_qa_service import VideoQAService
        
        qa_service = VideoQAService()
        video_context = {
            'title': 'Test AI Video',
            'transcript': test_transcript,
            'analysis': result['analysis'] if result['status'] == 'success' else {}
        }
        
        qa_result = await qa_service.answer_question(
            question="What are the main benefits of AI mentioned?",
            video_context=video_context
        )
        
        if qa_result['status'] == 'success':
            print("✅ VideoQAService integration successful!")
            print(f"   Answer length: {len(qa_result.get('answer', ''))}")
        else:
            print(f"❌ VideoQAService integration failed: {qa_result.get('error', 'Unknown error')}")
            return False
        
        print("\n🎉 All tests passed! Custom LLM implementation is working correctly.")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

async def main():
    """Main test function"""
    success = await test_custom_llm()
    if success:
        print("\n✅ Migration from emergentintegrations.llm.chat completed successfully!")
        print("You can now remove the emergentintegrations dependency from your project.")
    else:
        print("\n❌ Migration failed. Please check the errors above.")

if __name__ == "__main__":
    asyncio.run(main())
