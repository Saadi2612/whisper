import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { apiService } from '../services/apiService';
import { useToast } from '../hooks/use-toast';

const AudioPlayer = ({ 
  text, 
  voiceId = null, 
  modelId = null, 
  outputFormat = null,
  className = "",
  size = "sm",
  variant = "outline"
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const { toast } = useToast();

  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Set up audio element when blob changes
  useEffect(() => {
    if (audioBlob && audioRef.current) {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;
      audioRef.current.load(); // Force reload
      
      console.log('Audio element updated with new blob:', {
        src: audioUrl,
        blobSize: audioBlob.size,
        blobType: audioBlob.type
      });
      
      // Test if audio can be played
      const testAudio = new Audio(audioUrl);
      testAudio.oncanplay = () => {
        console.log('Test audio can play - audio is valid');
      };
      testAudio.onerror = (e) => {
        console.error('Test audio error:', e);
      };
      testAudio.load();
    }
  }, [audioBlob]);

  const convertTextToSpeech = async () => {
    if (!text || !text.trim()) {
      toast({
        title: "No text to convert",
        description: "Please provide text to convert to speech.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.convertTextToSpeech(text, voiceId, modelId, outputFormat);
      
      if (response.status === 'success' && response.audio_base64) {
        console.log('TTS Response received:', {
          status: response.status,
          audioFormat: response.audio_format,
          textLength: response.text_length,
          audioBase64Length: response.audio_base64.length
        });
        
        // Convert base64 to blob - handle large strings
        let binaryString;
        try {
          binaryString = atob(response.audio_base64);
        } catch (error) {
          console.error('Base64 decode error:', error);
          throw new Error('Failed to decode audio data');
        }
        
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Determine MIME type based on audio format
        let mimeType = 'audio/mpeg'; // default
        if (response.audio_format?.includes('mp3')) {
          mimeType = 'audio/mpeg';
        } else if (response.audio_format?.includes('pcm')) {
          mimeType = 'audio/wav';
        }
        
        const blob = new Blob([bytes], { type: mimeType });
        console.log('Audio blob created:', {
          size: blob.size,
          type: blob.type,
          url: URL.createObjectURL(blob)
        });
        
        // Verify the blob is valid
        if (blob.size === 0) {
          throw new Error('Created audio blob is empty');
        }
        
        setAudioBlob(blob);
        
        toast({
          title: "Audio ready",
          description: `Text converted to speech (${response.text_length} characters)`,
        });
      } else {
        throw new Error(response.error || 'Failed to convert text to speech');
      }
    } catch (error) {
      console.error('TTS Error:', error);
      setError(error.message);
      toast({
        title: "Conversion failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async () => {
    if (!audioBlob) {
      convertTextToSpeech();
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          console.log('Attempting to play audio:', {
            src: audioRef.current.src,
            readyState: audioRef.current.readyState,
            networkState: audioRef.current.networkState
          });
          
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Audio play error:', error);
          setError('Failed to play audio: ' + error.message);
          toast({
            title: "Playback error",
            description: "Failed to play audio. Please try again.",
            variant: "destructive"
          });
        }
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleAudioError = () => {
    setIsPlaying(false);
    setError('Failed to play audio');
    toast({
      title: "Playback error",
      description: "Failed to play the audio file",
      variant: "destructive"
    });
  };

  const getButtonSize = () => {
    switch (size) {
      case 'sm': return 'h-8 w-8';
      case 'md': return 'h-10 w-10';
      case 'lg': return 'h-12 w-12';
      default: return 'h-8 w-8';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'h-4 w-4';
      case 'md': return 'h-5 w-5';
      case 'lg': return 'h-6 w-6';
      default: return 'h-4 w-4';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        onLoadStart={() => console.log('Audio load started')}
        onLoadedData={() => console.log('Audio data loaded')}
        onCanPlay={() => console.log('Audio can play')}
        onPlay={() => console.log('Audio started playing')}
        onPause={() => console.log('Audio paused')}
        preload="auto"
        controls={false}
        style={{ display: 'none' }}
      />

      {/* Play/Pause Button */}
      <Button
        onClick={playAudio}
        disabled={isLoading || error}
        variant={variant}
        size="icon"
        className={`${getButtonSize()} ${isPlaying ? 'bg-green-500 hover:bg-green-600' : ''}`}
        title={isLoading ? 'Converting...' : isPlaying ? 'Pause audio' : 'Play audio'}
      >
        {isLoading ? (
          <Loader2 className={`${getIconSize()} animate-spin`} />
        ) : isPlaying ? (
          <Pause className={getIconSize()} />
        ) : (
          <Play className={getIconSize()} />
        )}
      </Button>

      {/* Mute/Unmute Button (only show when audio is loaded) */}
      {audioBlob && (
        <Button
          onClick={toggleMute}
          variant="ghost"
          size="icon"
          className={`${getButtonSize()} ${isMuted ? 'text-red-500' : 'text-gray-500'}`}
          title={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          {isMuted ? (
            <VolumeX className={getIconSize()} />
          ) : (
            <Volume2 className={getIconSize()} />
          )}
        </Button>
      )}

      {/* Error indicator */}
      {error && (
        <div className="text-xs text-red-500 max-w-32 truncate" title={error}>
          Error
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
