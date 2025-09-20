import os
import base64
import asyncio
from typing import Dict, Any, Optional
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
import logging

logger = logging.getLogger(__name__)

class TextToSpeechService:
    """Service for converting text to speech using ElevenLabs API"""
    
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY environment variable is required")
        
        self.client = ElevenLabs(api_key=self.api_key)
        
        # Default voice settings
        self.default_voice_id = "JBFqnCBsd6RMkjVDRZzb"  # Default voice
        self.default_model = "eleven_flash_v2_5"
        self.default_output_format = "mp3_44100_128"
    
    async def text_to_speech(
        self, 
        text: str, 
        voice_id: Optional[str] = None,
        model_id: Optional[str] = None,
        output_format: Optional[str] = None,
        return_base64: bool = True
    ) -> Dict[str, Any]:
        """
        Convert text to speech and return audio data
        
        Args:
            text: Text to convert to speech
            voice_id: ElevenLabs voice ID (optional, uses default if not provided)
            model_id: ElevenLabs model ID (optional, uses default if not provided)
            output_format: Output format (optional, uses default if not provided)
            return_base64: Whether to return audio as base64 string (default: True)
        
        Returns:
            Dict containing status, audio data, and metadata
        """
        try:
            if not text or not text.strip():
                return {
                    "status": "error",
                    "error": "Text cannot be empty"
                }
            
            # Use defaults if not provided
            voice_id = voice_id or self.default_voice_id
            model_id = model_id or self.default_model
            output_format = output_format or self.default_output_format
            
            logger.info(f"Converting text to speech: '{text[:50]}...' with voice {voice_id}")
            
            # Convert text to speech
            audio = self.client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id=model_id,
                output_format=output_format,
            )
            
            if return_base64:
                # Convert audio to base64 for frontend consumption
                audio_bytes = b"".join(audio)
                audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                
                return {
                    "status": "success",
                    "audio_base64": audio_base64,
                    "audio_format": output_format,
                    "voice_id": voice_id,
                    "model_id": model_id,
                    "text_length": len(text)
                }
            else:
                # Return raw audio data
                return {
                    "status": "success",
                    "audio_data": audio,
                    "audio_format": output_format,
                    "voice_id": voice_id,
                    "model_id": model_id,
                    "text_length": len(text)
                }
                
        except Exception as e:
            logger.error(f"Error in text-to-speech conversion: {str(e)}")
            return {
                "status": "error",
                "error": f"Text-to-speech conversion failed: {str(e)}"
            }
    
    async def get_available_voices(self) -> Dict[str, Any]:
        """Get list of available voices from ElevenLabs"""
        try:
            voices = self.client.voices.get_all()
            return {
                "status": "success",
                "voices": [
                    {
                        "voice_id": voice.voice_id,
                        "name": voice.name,
                        "category": voice.category,
                        "description": voice.description
                    }
                    for voice in voices.voices
                ]
            }
        except Exception as e:
            logger.error(f"Error getting available voices: {str(e)}")
            return {
                "status": "error",
                "error": f"Failed to get voices: {str(e)}"
            }
    
    def play_audio(self, audio_data) -> None:
        """Play audio data locally (for testing purposes)"""
        try:
            play(audio_data)
        except Exception as e:
            logger.error(f"Error playing audio: {str(e)}")
            raise
