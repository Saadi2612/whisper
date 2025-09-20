import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Speaker, Pause, Play, Volume2, VolumeX, Loader2, AlertCircle, AudioLines } from 'lucide-react';
import websocketTtsService from '../services/websocketTtsService';
import { toast } from 'sonner';

const SimpleStreamingAudioPlayer = ({ 
  text, 
  voiceId, 
  modelId, 
  voiceSettings,
  chunkLengthSchedule,
  size = "md", 
  variant = "default",
  className = "",
  autoPlay = true
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const [totalSize, setTotalSize] = useState(0);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  
  const audioRef = useRef(null);
  const isPlayingRef = useRef(false);

  // WebSocket event handlers
  useEffect(() => {
    const handleAudioChunk = (data) => {
      console.log('Received audio chunk:', data);
      
      try {
        // Convert base64 to Uint8Array
        const binaryString = atob(data.audio_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Add to accumulated chunks
        setAudioChunks(prev => {
          const newChunks = [...prev, bytes];
          
          // Create audio URL from all accumulated chunks
          const combinedArray = new Uint8Array(newChunks.reduce((acc, chunk) => acc + chunk.length, 0));
          let offset = 0;
          for (const chunk of newChunks) {
            combinedArray.set(chunk, offset);
            offset += chunk.length;
          }
          
          const blob = new Blob([combinedArray], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          
          // Clean up previous URL
          if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl);
          }
          
          setCurrentAudioUrl(url);
          
          // Auto-play if enabled and this is the first chunk
          if (autoPlay && !isPlayingRef.current && prev.length === 0) {
            console.log('First chunk received, starting playback...');
            setTimeout(() => {
              playAudio();
            }, 200);
          }
          
          return newChunks;
        });
        
        setTotalSize(data.total_size);
        
      } catch (error) {
        console.error('Error processing audio chunk:', error);
        setError('Failed to process audio chunk');
      }
    };
    
    const handleFinal = (data) => {
      console.log('Audio streaming completed:', data);
      setIsLoading(false);
      // toast.success(`Audio streaming completed.`);
    };
    
    const handleError = (data) => {
      console.error('WebSocket TTS error:', data);
      setError(data.message || 'Unknown error occurred');
      setIsLoading(false);
      toast.error(data.message || 'Failed to load audio. Please try again.');
    };
    
    const handleConnectionChange = (connected) => {
      setIsConnected(connected);
    };
    
    // Register event listeners
    websocketTtsService.on('audioChunk', handleAudioChunk);
    websocketTtsService.on('final', handleFinal);
    websocketTtsService.on('error', handleError);
    websocketTtsService.on('connected', handleConnectionChange);
    
    return () => {
      websocketTtsService.off('audioChunk', handleAudioChunk);
      websocketTtsService.off('final', handleFinal);
      websocketTtsService.off('error', handleError);
      websocketTtsService.off('connected', handleConnectionChange);
    };
  }, [autoPlay, currentAudioUrl]);

  // Connect to WebSocket on mount
  useEffect(() => {
    const connect = async () => {
      try {
        console.log('🔄 Attempting to connect to WebSocket TTS service...');
        await websocketTtsService.connect();
        console.log('✅ WebSocket TTS service connected');
        setIsConnected(true);
        setError(null);
      } catch (error) {
        console.error('❌ Failed to connect to WebSocket:', error);
        setError('Failed to connect to TTS service. Please check if the backend server is running.');
        setIsConnected(false);
      }
    };
    
    // Add a small delay to ensure the component is fully mounted
    const timeoutId = setTimeout(connect, 100);
    
    return () => {
      clearTimeout(timeoutId);
      websocketTtsService.disconnect();
    };
  }, []);

  // Update audio source when URL changes
  useEffect(() => {
    if (audioRef.current && currentAudioUrl) {
      const wasPlaying = !audioRef.current.paused;
      const currentTime = audioRef.current.currentTime;
      
      audioRef.current.src = currentAudioUrl;
      audioRef.current.load();
      
      // If it was playing, resume playback
      if (wasPlaying) {
        audioRef.current.currentTime = currentTime;
        audioRef.current.play().catch(e => {
          console.log('Auto-resume failed:', e);
        });
      }
    }
  }, [currentAudioUrl]);

  const playAudio = useCallback(() => {
    if (audioRef.current && !isPlayingRef.current) {
      try {
        audioRef.current.play();
        isPlayingRef.current = true;
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing audio:', error);
        setError('Failed to play audio: ' + error.message);
      }
    }
  }, []);

  const pauseAudio = useCallback(() => {
    if (audioRef.current && isPlayingRef.current) {
      audioRef.current.pause();
      isPlayingRef.current = false;
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  }, []);

  const startStreaming = useCallback(async () => {
    if (!text || !text.trim()) {
      setError("No text provided for speech.");
      return;
    }
    
    if (!isConnected) {
      setError("Not connected to TTS service.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAudioChunks([]);
    setTotalSize(0);
    
    // Clean up previous audio URL
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      setCurrentAudioUrl(null);
    }
    
    // Reset audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    try {
      websocketTtsService.streamTextToSpeech(text, {
        voiceId,
        modelId,
        voiceSettings,
        chunkLengthSchedule
      });
      
      // toast.success("Starting audio streaming...");
    } catch (error) {
      console.error('Error starting TTS streaming:', error);
      setError(error.message);
      setIsLoading(false);
      toast.error(error.message);
    }
  }, [text, voiceId, modelId, voiceSettings, chunkLengthSchedule, isConnected, currentAudioUrl]);

  const handleButtonClick = () => {
    if (isLoading) {
      return; // Don't allow interaction while loading
    }
    
    if (isPlaying) {
      pauseAudio();
    } else if (currentAudioUrl) {
      playAudio();
    } else {
      startStreaming();
    }
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
    };
    
    const handlePlay = () => {
      isPlayingRef.current = true;
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
      }
    };
  }, [currentAudioUrl]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => {
          isPlayingRef.current = false;
          setIsPlaying(false);
        }}
        onPlay={() => {
          isPlayingRef.current = true;
          setIsPlaying(true);
        }}
        onPause={() => {
          isPlayingRef.current = false;
          setIsPlaying(false);
        }}
        preload="none"
        controls={false}
        style={{ display: 'none' }}
      />

      {/* Play/Pause Button */}
      <Button
        onClick={handleButtonClick}
        disabled={isLoading || error || !isConnected}
        size={size}
        variant={variant}
        className="flex items-center gap-1"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <> <Pause className="h-4 w-4" /> Pause </>
        ) : (
          currentAudioUrl ? <> <Play className="h-4 w-4" /> Play </> : <> <AudioLines className="h-4 w-4" /> Listen to this summary</>
        )}
        {size !== "sm" && (
          isLoading ? "Streaming..." : 
          isPlaying ? "Pause" : 
          currentAudioUrl ? "Play" : "Listen"
        )}
      </Button>

      {/* Mute/Unmute Button */}
      {currentAudioUrl && (
        <Button
          onClick={toggleMute}
          size={size}
          variant="ghost"
          className="flex items-center gap-1"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      )}

      {/* Connection Status */}
      {!isConnected && !error && (
        <div className="flex items-center gap-1 text-yellow-600 text-sm">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          Connecting...
        </div>
      )}

      {/* Retry Button */}
      {error && error.includes('connect') && (
        <Button
          onClick={() => {
            setError(null);
            websocketTtsService.connect().then(() => {
              setIsConnected(true);
            }).catch((err) => {
              console.error('Retry connection failed:', err);
              setError('Retry failed. Please check if the backend server is running.');
            });
          }}
          size="sm"
          variant="outline"
          className="text-xs"
        >
          Retry Connection
        </Button>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-1 text-red-500 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Progress Info */}
      {/* {totalSize > 0 && (
        <div className="text-xs text-gray-500">
          {Math.round(totalSize / 1024)}KB
        </div>
      )} */}
    </div>
  );
};

export default SimpleStreamingAudioPlayer;
