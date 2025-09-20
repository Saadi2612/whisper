import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Play, Sparkles, Loader2, Video } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { searchCreators } from '../data/popularCreators';
import { apiService } from '../services/apiService';
import { toast } from 'sonner';

// Utility functions for URL detection and parsing
const detectVideoURL = (text) => {
  const videoPatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=/i,
    /^https?:\/\/(www\.)?youtu\.be\/[A-Za-z0-9_-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/embed\//i,
    /^https?:\/\/(www\.)?youtube\.com\/v\//i
  ];
  
  return videoPatterns.some(pattern => pattern.test(text.trim()));
};

const detectChannelURL = (text) => {
  const channelPatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/@[\w-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/channel\/[A-Za-z0-9_-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/c\/[\w-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/user\/[\w-]+/i,
    /^https?:\/\/(www\.)?youtu\.be\/c\/[\w-]+/i
  ];
  
  return channelPatterns.some(pattern => pattern.test(text.trim()));
};

const VideoProcessSearch = ({ onVideoProcessed, stayOnPage = false }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState('creators'); // 'creators' or 'videos'
  const searchRef = useRef(null);

  // Handle search input changes
  useEffect(() => {
    if (query.length >= 2 && !detectVideoURL(query) && !detectChannelURL(query)) {
      // First search creators
      const searchResults = searchCreators(query);
      setResults(searchResults);
      
      // If no creator results, search YouTube videos
      if (searchResults.length === 0) {
        searchYouTubeVideos(query);
      } else {
        setYoutubeResults([]);
        setSearchType('creators');
        setIsOpen(searchResults.length > 0);
      }
    } else {
      setResults([]);
      setYoutubeResults([]);
      setIsOpen(false);
    }
  }, [query]);

  // Search YouTube videos
  const searchYouTubeVideos = async (searchQuery) => {
    try {
      setIsSearching(true);
      const result = await apiService.getYouTubeVideos(searchQuery, 1, 5);
      
      if (result.status === 'success' && result.videos) {
        setYoutubeResults(result.videos);
        setSearchType('videos');
        setIsOpen(result.videos.length > 0);
      } else {
        setYoutubeResults([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('YouTube search error:', error);
      setYoutubeResults([]);
      setIsOpen(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProcessVideo = async () => {
    if (!query.trim()) {
      toast.error('Please enter a YouTube video URL');
      return;
    }

    const inputValue = query.trim();

    if (!detectVideoURL(inputValue)) {
      if (detectChannelURL(inputValue)) {
        toast.error('Please use a video URL, not a channel URL');
        return;
      }
      toast.error('Please enter a valid YouTube video URL');
      return;
    }

    try {
      setIsProcessing(true);
      
      // If on home page, redirect to dashboard without processing
      if (!stayOnPage) {
        console.log('🔀 VideoProcessSearch: Navigating to dashboard without API call');
        navigate('/dashboard', { 
          state: { 
            processingVideo: inputValue,
            videoTitle: 'Processing your video...'
          }
        });
        setQuery('');
        return; // Exit early, let Dashboard handle the processing
      } else {
        // If on dashboard, show processing notification and process video
        toast.info('🎥 Processing your video...');
        
        // Process video
        console.log('🎥 VideoProcessSearch: Calling API from dashboard');
        const result = await apiService.processVideo(inputValue);
        
        if (result.status === 'success') {
          toast.success('🎉 Video analysis complete!');
          
          if (onVideoProcessed) {
            onVideoProcessed(result.video);
          }
          
          setQuery('');
        } else {
          toast.error(result.error || 'Failed to process video');
        }
      }
      
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFollowCreator = async (creator) => {
    try {
      const result = await apiService.followChannel(creator.channelUrl);
      
      if (result.status === 'success' || result.status === 'already_following') {
        toast.success(`Now following ${creator.name}!`);
        setQuery('');
        setResults([]);
        setIsOpen(false);
      }
    } catch (error) {
      toast.error(`Failed to follow ${creator.name}`);
    }
  };

  const handleProcessYouTubeVideo = async (video) => {
    try {
      setIsProcessing(true);
      
      // If on home page, redirect to dashboard without processing
      if (!stayOnPage) {
        console.log('🔀 VideoProcessSearch: Navigating to dashboard with YouTube video');
        navigate('/dashboard', { 
          state: { 
            processingVideo: video.url,
            videoTitle: video.title
          }
        });
        setQuery('');
        return;
      } else {
        // If on dashboard, show processing notification and process video
        toast.info('🎥 Processing your video...');
        
        // Process video
        console.log('🎥 VideoProcessSearch: Calling API from dashboard');
        const result = await apiService.processVideo(video.url);
        
        if (result.status === 'success') {
          toast.success('🎉 Video analysis complete!');
          
          if (onVideoProcessed) {
            onVideoProcessed(result.video);
          }
          
          setQuery('');
        } else {
          toast.error(result.error || 'Failed to process video');
        }
      }
      
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto" ref={searchRef}>
      <div className="flex items-center space-x-3 p-2 bg-white rounded-2xl shadow-lg border border-purple-100">
        <Search className="w-6 h-6 text-gray-400 ml-4" />
        <Input
          type="text"
          placeholder="Paste YouTube video URL to process..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border-0 bg-transparent text-lg focus-visible:ring-0 placeholder:text-gray-400"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleProcessVideo();
            }
          }}
        />
        
        {detectVideoURL(query) && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Play className="h-4 w-4" />
            <span>Video URL</span>
          </div>
        )}
        
        {detectChannelURL(query) && (
          <div className="flex items-center gap-2 text-sm text-orange-500">
            <Users className="h-4 w-4" />
            <span>Channel URL</span>
          </div>
        )}
        
        <Button 
          onClick={handleProcessVideo}
          disabled={isProcessing || !query.trim()}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 px-8 py-3 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Process Video
            </>
          )}
        </Button>
      </div>

      {isOpen && (results.length > 0 || youtubeResults.length > 0) && !detectVideoURL(query) && !detectChannelURL(query) && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-xl border border-purple-100 max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            {searchType === 'creators' && results.length > 0 && (
              <>
                <div className="text-xs text-gray-500 px-3 py-2 border-b">
                  Or follow these creators to see their videos automatically
                </div>
                <div className="space-y-1 mt-2">
                  {results.map((creator) => (
                    <div
                      key={creator.id}
                      className="flex items-center space-x-3 p-3 rounded-xl hover:bg-purple-50 cursor-pointer transition-colors group"
                      onClick={() => handleFollowCreator(creator)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={creator.avatar} alt={creator.name} />
                        <AvatarFallback>{creator.name[0]}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate text-sm">{creator.name}</h4>
                        <p className="text-xs text-gray-500">{creator.subscribers}</p>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs opacity-100 border-purple-300 text-purple-700 hover:bg-purple-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowCreator(creator);
                        }}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Follow
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {searchType === 'videos' && youtubeResults.length > 0 && (
              <>
                <div className="text-xs text-gray-500 px-3 py-2 border-b">
                  Found YouTube videos - click to process
                </div>
                <div className="space-y-1 mt-2">
                  {youtubeResults.map((video) => (
                    <div
                      key={video.video_id}
                      className="flex items-center space-x-3 p-3 rounded-xl hover:bg-purple-50 cursor-pointer transition-colors group"
                      onClick={() => handleProcessYouTubeVideo(video)}
                    >
                      <div className="relative h-12 w-20 flex-shrink-0">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="h-full w-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-4 w-4 text-white bg-black bg-opacity-50 rounded-full p-1" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate text-sm line-clamp-2">{video.title}</h4>
                        <p className="text-xs text-gray-500">{video.channel.name}</p>
                        <p className="text-xs text-gray-400">{video.duration} • {video.view_count} views</p>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs opacity-100 border-purple-300 text-purple-700 hover:bg-purple-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProcessYouTubeVideo(video);
                        }}
                      >
                        <Video className="h-3 w-3 mr-1" />
                        Process
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {isSearching && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500">Searching YouTube...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {query.length >= 2 && !detectVideoURL(query) && !detectChannelURL(query) && results.length === 0 && youtubeResults.length === 0 && !isSearching && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg border border-purple-100">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">To get started:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• <strong>Primary:</strong> Paste a YouTube video URL to process and analyze</li>
              <li>• <strong>Alternative:</strong> Search for creators like "PewDiePie" to follow</li>
            </ul>
          </CardContent>
        </Card>
      )}
      
      {detectChannelURL(query) && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg border border-orange-200">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-sm text-orange-600 font-medium">Channel URL Detected</p>
            <p className="text-xs text-gray-500 mt-1">
              For processing individual videos, please use video URLs instead.
              <br />To follow this channel, use the Dashboard → My Channels section.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VideoProcessSearch;