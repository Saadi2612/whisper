import os
import json
import base64
import asyncio
import logging
from typing import AsyncGenerator, Dict, Any, Optional
from dotenv import load_dotenv
import websockets
from elevenlabs.client import ElevenLabs

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

class WebSocketTTSService:
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        if not self.api_key:
            logger.error("ELEVENLABS_API_KEY not found in environment variables.")
            raise ValueError("ELEVENLABS_API_KEY is required for WebSocketTTSService.")
        
        self.client = ElevenLabs(api_key=self.api_key)
        self.default_voice_id = "JBFqnCBsd6RMkjVDRZzb"  # Default voice
        self.default_model_id = "eleven_flash_v2_5"  # Best for low latency
        self.default_output_format = "mp3_44100_128"

    async def stream_text_to_speech(
        self, 
        text: str, 
        voice_id: Optional[str] = None, 
        model_id: Optional[str] = None,
        voice_settings: Optional[Dict[str, Any]] = None,
        chunk_length_schedule: Optional[list] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream text to speech using ElevenLabs WebSocket API.
        
        Args:
            text (str): The text to convert to speech.
            voice_id (Optional[str]): The ID of the voice to use.
            model_id (Optional[str]): The ID of the model to use.
            voice_settings (Optional[Dict]): Voice settings for the generation.
            chunk_length_schedule (Optional[list]): Chunk length schedule for streaming.
            
        Yields:
            Dict[str, Any]: Audio chunks and metadata as they become available.
        """
        try:
            if not text:
                yield {"type": "error", "message": "Text cannot be empty."}
                return

            voice_id = voice_id or self.default_voice_id
            model_id = model_id or self.default_model_id
            
            # Default voice settings
            if voice_settings is None:
                voice_settings = {
                    "stability": 0.5,
                    "similarity_boost": 0.8,
                    "use_speaker_boost": False
                }
            
            # Default chunk length schedule for optimal latency
            if chunk_length_schedule is None:
                chunk_length_schedule = [120, 160, 250, 290]

            # WebSocket URI
            uri = f"wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input?model_id={model_id}"
            
            logger.info(f"Starting WebSocket TTS streaming for text: '{text[:50]}...' with voice {voice_id}")
            
            async with websockets.connect(uri) as websocket:
                # Initialize the connection with voice settings
                init_message = {
                    "text": " ",  # Space to initialize
                    "voice_settings": voice_settings,
                    "generation_config": {
                        "chunk_length_schedule": chunk_length_schedule
                    },
                    "xi_api_key": self.api_key,
                }
                
                await websocket.send(json.dumps(init_message))
                
                # Send the actual text
                text_message = {
                    "text": text,
                    "generation_config": {
                        "chunk_length_schedule": chunk_length_schedule
                    }
                }
                await websocket.send(json.dumps(text_message))
                
                # Send empty string to indicate end of text
                await websocket.send(json.dumps({"text": ""}))
                
                # Listen for audio chunks
                audio_chunks = []
                total_audio_size = 0
                
                try:
                    while True:
                        try:
                            message = await websocket.recv()
                            data = json.loads(message)

                            print("Received the message from ElevenLabs")
                            
                            logger.info(f"Received message from ElevenLabs: {list(data.keys())}")
                            
                            if data.get("audio"):
                                # Decode base64 audio chunk
                                audio_chunk = base64.b64decode(data["audio"])
                                audio_chunks.append(audio_chunk)
                                total_audio_size += len(audio_chunk)
                                
                                logger.info(f"Yielding audio chunk: {len(audio_chunk)} bytes (Total: {total_audio_size} bytes)")
                                
                                # Send audio chunk to frontend
                                yield {
                                    "type": "audio_chunk",
                                    "audio_base64": data["audio"],
                                    "chunk_size": len(audio_chunk),
                                    "total_size": total_audio_size,
                                    "voice_id": voice_id,
                                    "model_id": model_id
                                }
                                
                            elif data.get("isFinal"):
                                # Final chunk received
                                logger.info(f"WebSocket TTS streaming completed. Total audio size: {total_audio_size} bytes")
                                yield {
                                    "type": "final",
                                    "total_chunks": len(audio_chunks),
                                    "total_size": total_audio_size,
                                    "voice_id": voice_id,
                                    "model_id": model_id
                                }
                                break
                            else:
                                logger.info(f"Unknown message type from ElevenLabs: {data}")
                                
                        except websockets.exceptions.ConnectionClosed:
                            logger.info("ElevenLabs WebSocket connection closed - this is normal after TTS completion")
                            # Send final message if we have audio chunks
                            if audio_chunks:
                                yield {
                                    "type": "final",
                                    "total_chunks": len(audio_chunks),
                                    "total_size": total_audio_size,
                                    "voice_id": voice_id,
                                    "model_id": model_id
                                }
                            break
                        except Exception as e:
                            logger.error(f"Error processing WebSocket message: {e}")
                            yield {"type": "error", "message": f"Error processing audio: {str(e)}"}
                            break
                            
                finally:
                    # Close the ElevenLabs WebSocket connection
                    try:
                        await websocket.close()
                    except:
                        pass
                        
        except Exception as e:
            logger.error(f"Error in WebSocket TTS streaming: {str(e)}")
            yield {"type": "error", "message": str(e)}

    async def get_available_voices(self) -> Dict[str, Any]:
        """
        Get available voices (same as regular TTS service).
        """
        try:
            voices = await self.client.voices.get_all()
            voice_list = []
            for voice in voices.voices:
                voice_list.append({
                    "voice_id": voice.voice_id,
                    "name": voice.name,
                    "category": voice.category,
                    "description": voice.description,
                    "labels": voice.labels
                })
            return {"status": "success", "voices": voice_list}
        except Exception as e:
            logger.error(f"Error getting available voices: {str(e)}")
            return {"status": "error", "error": str(e)}
