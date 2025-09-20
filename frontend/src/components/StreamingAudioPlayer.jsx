import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Speaker, Pause, Play, Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';
import websocketTtsService from '../services/websocketTtsService';
import { toast } from 'sonner';

const StreamingAudioPlayer = ({ 
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
  
  const audioRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  // Initialize MediaSource
  const initializeMediaSource = useCallback(() => {
    if (!audioRef.current) return;

    try {
      // Clean up existing MediaSource
      if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
        mediaSourceRef.current.endOfStream();
      }
      
      // Create new MediaSource for streaming audio
      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;
      
      audioRef.current.src = URL.createObjectURL(mediaSource);
      
      mediaSource.addEventListener('sourceopen', () => {
        console.log('MediaSource opened');
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
          sourceBufferRef.current = sourceBuffer;
          
          // Process any queued audio chunks
          processAudioQueue();
        } catch (error) {
          console.error('Error creating source buffer:', error);
          setError('Failed to create audio source buffer');
        }
      });
      
      mediaSource.addEventListener('error', (e) => {
        console.error('MediaSource error:', e);
        setError('MediaSource error occurred');
      });
      
    } catch (error) {
      console.error('Error setting up MediaSource:', error);
      setError('Failed to setup audio streaming');
    }
  }, [processAudioQueue]);

  // Initialize audio context and media source
  useEffect(() => {
    initializeMediaSource();

    return () => {
      if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
        mediaSourceRef.current.endOfStream();
      }
    };
  }, [initializeMediaSource]);

  // Process queued audio chunks
  const processAudioQueue = useCallback(() => {
    if (!sourceBufferRef.current || audioQueueRef.current.length === 0) return;
    
    const sourceBuffer = sourceBufferRef.current;
    const mediaSource = mediaSourceRef.current;
    
    // Check if source buffer is still valid
    if (!mediaSource || mediaSource.readyState !== 'open' || sourceBuffer.updating) {
      // If source buffer is updating, queue the chunk for later
      if (sourceBuffer.updating) {
        return;
      }
      // If media source is not open, try to recreate
      if (!mediaSource || mediaSource.readyState !== 'open') {
        console.warn('MediaSource not open, recreating...');
        initializeMediaSource();
        return;
      }
    }
    
    const chunk = audioQueueRef.current.shift();
    
    try {
      sourceBuffer.appendBuffer(chunk);
      console.log('Audio chunk appended to source buffer');
    } catch (error) {
      console.error('Error appending audio chunk:', error);
      if (error.name === 'InvalidStateError') {
        console.warn('SourceBuffer invalid, recreating MediaSource...');
        initializeMediaSource();
      } else {
        setError('Failed to append audio chunk');
      }
    }
  }, []);

  // Handle source buffer update end
  useEffect(() => {
    if (!sourceBufferRef.current) return;

    const sourceBuffer = sourceBufferRef.current;
    
    const handleUpdateEnd = () => {
      console.log('Source buffer update ended');
      processAudioQueue();
    };
    
    sourceBuffer.addEventListener('updateend', handleUpdateEnd);
    
    return () => {
      sourceBuffer.removeEventListener('updateend', handleUpdateEnd);
    };
  }, [processAudioQueue]);

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
        
        // Add to audio queue
        audioQueueRef.current.push(bytes);
        
        // Ensure MediaSource is ready before processing
        if (!mediaSourceRef.current || mediaSourceRef.current.readyState !== 'open') {
          console.log('MediaSource not ready, initializing...');
          initializeMediaSource();
          return;
        }
        
        processAudioQueue();
        setTotalSize(data.total_size);
        
        // Auto-play first chunk if enabled
        if (autoPlay && !isPlayingRef.current && audioQueueRef.current.length === 1) {
          // Wait a bit for the first chunk to be processed
          setTimeout(() => {
            playAudio();
          }, 100);
        }
        
      } catch (error) {
        console.error('Error processing audio chunk:', error);
        setError('Failed to process audio chunk');
      }
    };
    
    const handleFinal = (data) => {
      console.log('Audio streaming completed:', data);
      setIsLoading(false);
      
      // End the media source stream
      if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
        try {
          mediaSourceRef.current.endOfStream();
        } catch (error) {
          console.error('Error ending stream:', error);
        }
      }
      
      toast.success(`Audio streaming completed (${data.total_size} bytes)`);
    };
    
    const handleError = (data) => {
      console.error('WebSocket TTS error:', data);
      setError(data.message || 'Unknown error occurred');
      setIsLoading(false);
      toast.error(data.message || 'TTS streaming failed');
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
  }, [autoPlay, processAudioQueue, initializeMediaSource]);

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
    audioQueueRef.current = [];
    
    // Reset audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Reset media source and reinitialize
    if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
      try {
        mediaSourceRef.current.endOfStream();
      } catch (error) {
        console.error('Error ending previous stream:', error);
      }
    }
    
    // Reinitialize MediaSource for new stream
    initializeMediaSource();
    
    try {
      websocketTtsService.streamTextToSpeech(text, {
        voiceId,
        modelId,
        voiceSettings,
        chunkLengthSchedule
      });
      
      toast.success("Starting audio streaming...");
    } catch (error) {
      console.error('Error starting TTS streaming:', error);
      setError(error.message);
      setIsLoading(false);
      toast.error(error.message);
    }
  }, [text, voiceId, modelId, voiceSettings, chunkLengthSchedule, isConnected]);

  const handleButtonClick = () => {
    if (isLoading) {
      return; // Don't allow interaction while loading
    }
    
    if (isPlaying) {
      pauseAudio();
    } else if (audioQueueRef.current.length > 0 || totalSize > 0) {
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
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {size !== "sm" && (
          isLoading ? "Streaming..." : 
          isPlaying ? "Pause" : 
          totalSize > 0 ? "Play" : "Listen"
        )}
      </Button>

      {/* Mute/Unmute Button */}
      {(totalSize > 0 || isPlaying) && (
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
      {totalSize > 0 && (
        <div className="text-xs text-gray-500">
          {Math.round(totalSize / 1024)}KB
        </div>
      )}
    </div>
  );
};

export default StreamingAudioPlayer;
