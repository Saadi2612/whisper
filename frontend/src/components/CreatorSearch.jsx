import React, { useState, useEffect, useRef } from 'react';
import { Search, Users, Check, ExternalLink, Play, Sparkles, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { searchCreators } from '../data/popularCreators';
import { apiService } from '../services/apiService';
import { toast } from 'sonner';

// Utility functions for URL detection and parsing
const isVideoURL = (text) => {
  const videoPatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=/i,
    /^https?:\/\/(www\.)?youtu\.be\/[A-Za-z0-9_-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/embed\//i,
    /^https?:\/\/(www\.)?youtube\.com\/v\//i
  ];
  
  return videoPatterns.some(pattern => pattern.test(text.trim()));
};

const isChannelURL = (text) => {
  const channelPatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/@[\w-]+/i,           // @username format
    /^https?:\/\/(www\.)?youtube\.com\/channel\/[A-Za-z0-9_-]+/i,  // channel/ID format
    /^https?:\/\/(www\.)?youtube\.com\/c\/[\w-]+/i,         // /c/name format
    /^https?:\/\/(www\.)?youtube\.com\/user\/[\w-]+/i,      // /user/name format
    /^https?:\/\/(www\.)?youtu\.be\/c\/[\w-]+/i             // youtu.be/c/ format
  ];
  
  return channelPatterns.some(pattern => pattern.test(text.trim()));
};

// Utility functions for URL detection and parsing
const isVideoURL = (text) => {
  const videoPatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=/i,
    /^https?:\/\/(www\.)?youtu\.be\/[A-Za-z0-9_-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/embed\//i,
    /^https?:\/\/(www\.)?youtube\.com\/v\//i
  ];
  
  return videoPatterns.some(pattern => pattern.test(text.trim()));
};

const isChannelURL = (text) => {
  const channelPatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/@[\w-]+/i,           // @username format
    /^https?:\/\/(www\.)?youtube\.com\/channel\/[A-Za-z0-9_-]+/i,  // channel/ID format
    /^https?:\/\/(www\.)?youtube\.com\/c\/[\w-]+/i,         // /c/name format
    /^https?:\/\/(www\.)?youtube\.com\/user\/[\w-]+/i,      // /user/name format
    /^https?:\/\/(www\.)?youtu\.be\/c\/[\w-]+/i             // youtu.be/c/ format
  ];
  
  return channelPatterns.some(pattern => pattern.test(text.trim()));
};

const VideoProcessSearch = ({ onVideoProcessed }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const searchRef = useRef(null);

  // Handle search input changes - show creator results only for names, not URLs
  useEffect(() => {
    if (query.length >= 2 && !isVideoURL(query) && !isChannelURL(query)) {
      const searchResults = searchCreators(query);
      setResults(searchResults);
      setIsOpen(searchResults.length > 0);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

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

    // Check if it's a video URL
    if (!isVideoURL(inputValue)) {
      if (isChannelURL(inputValue)) {
        toast.error('Please use a video URL, not a channel URL');
        return;
      }
      
      if (results.length > 0) {
        // If there are search results, process the first creator's latest video
        toast.error('Please enter a YouTube video URL to process');
        return;
      }
      
      toast.error('Please enter a valid YouTube video URL');
      return;
    }

    try {
      setIsProcessing(true);
      
      const result = await apiService.processVideo(inputValue);
      
      if (result.status === 'success') {
        toast.success('Video processed successfully! Redirecting to dashboard...');
        
        if (onVideoProcessed) {
          onVideoProcessed(result.video);
        }
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
        
        setQuery('');
      } else {
        toast.error(result.error || 'Failed to process video');
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

  return (
    <div className="relative max-w-2xl mx-auto" ref={searchRef}>
      {/* Search Input */}
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
        
        {/* Show URL type indicators */}
        {isVideoURL(query) && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Play className="h-4 w-4" />
            <span>Video URL</span>
          </div>
        )}
        
        {isChannelURL(query) && (
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
              <Loader2 className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Process Video
            </>
          )}
        </Button>
      </div>

      {/* Creator Search Results Dropdown - only show for creator name searches */}
      {isOpen && results.length > 0 && !isVideoURL(query) && !isChannelURL(query) && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-xl border border-purple-100 max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            <div className="text-xs text-gray-500 px-3 py-2 border-b">
              Want to follow creators? Click below or use channel URLs
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
          </CardContent>
        </Card>
      )}

      {/* Helper text for different input types */}
      {query.length >= 2 && !isVideoURL(query) && !isChannelURL(query) && results.length === 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg border border-purple-100">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">To get started:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Paste a YouTube video URL to process and analyze</li>
              <li>• Search for creators like "PewDiePie" or "MrBeast" to follow</li>
            </ul>
          </CardContent>
        </Card>
      )}
      
      {/* Channel URL helper */}
      {isChannelURL(query) && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg border border-orange-200">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-sm text-orange-600 font-medium">Channel URL Detected</p>
            <p className="text-xs text-gray-500 mt-1">
              To follow this channel, go to "My Channels" and use the follow feature there.
              <br />For processing, please use individual video URLs.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

  return (
    <div className="relative max-w-2xl mx-auto" ref={searchRef}>
      {/* Search Input */}
      <div className="flex items-center space-x-3 p-2 bg-white rounded-2xl shadow-lg border border-purple-100">
        <Search className="w-6 h-6 text-gray-400 ml-4" />
        <Input
          type="text"
          placeholder="Search creator name or paste channel URL..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border-0 bg-transparent text-lg focus-visible:ring-0 placeholder:text-gray-400"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleDirectFollow();
            }
          }}
        />
        
        {/* Show URL indicator when channel URL is detected */}
        {isChannelURL(query) && (
          <div className="flex items-center gap-2 text-sm text-purple-600">
            <ExternalLink className="h-4 w-4" />
            <span>Channel URL</span>
          </div>
        )}
        
        {/* Show warning for video URLs */}
        {isVideoURL(query) && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <span>❌ Use channel URL</span>
          </div>
        )}
        
        <Button 
          onClick={handleDirectFollow}
          disabled={isFollowing || !query.trim() || isVideoURL(query)}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 px-8 py-3 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
        >
          {isFollowing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Following...
            </>
          ) : (
            'Follow'
          )}
        </Button>
      </div>

      {/* Search Results Dropdown - only show for creator name searches */}
      {isOpen && results.length > 0 && !isChannelURL(query) && !isVideoURL(query) && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-xl border border-purple-100 max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            <div className="space-y-1">
              {results.map((creator) => (
                <div
                  key={creator.id}
                  className="flex items-center space-x-3 p-3 rounded-xl hover:bg-purple-50 cursor-pointer transition-colors group"
                  onClick={() => handleFollowCreator(creator)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={creator.avatar} alt={creator.name} />
                    <AvatarFallback>{creator.name[0]}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900 truncate">{creator.name}</h4>
                      {followingCreators.has(creator.id) && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{creator.handle} • {creator.subscribers}</p>
                    <p className="text-xs text-gray-400 truncate">{creator.category}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {creator.category.split(',')[0]}
                    </Badge>
                    
                    {followingCreators.has(creator.id) ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <Check className="h-3 w-3 mr-1" />
                        Following
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="opacity-0 group-hover:opacity-100 transition-opacity border-purple-300 text-purple-700 hover:bg-purple-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowCreator(creator);
                        }}
                        disabled={isFollowing}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Follow
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {query.length >= 2 && results.length === 0 && !isChannelURL(query) && !isVideoURL(query) && (
              <div className="text-center py-6 text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No creators found for "{query}"</p>
                <p className="text-xs mt-1">Try searching for popular YouTubers like "PewDiePie" or "MrBeast"</p>
                <p className="text-xs mt-1 text-purple-600">Or paste a YouTube channel URL to follow directly</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show helper text for URLs */}
      {(isChannelURL(query) || isVideoURL(query)) && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg border border-purple-100">
          <CardContent className="p-4">
            {isChannelURL(query) ? (
              <div className="text-center text-sm">
                <ExternalLink className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-gray-700 font-medium">Channel URL detected!</p>
                <p className="text-gray-500 text-xs mt-1">Click "Follow" to add this channel</p>
              </div>
            ) : (
              <div className="text-center text-sm">
                <span className="text-2xl mb-2 block">❌</span>
                <p className="text-red-600 font-medium">Video URLs not supported</p>
                <p className="text-gray-500 text-xs mt-1">Please use the channel URL instead</p>
                <p className="text-xs mt-2 text-gray-400">
                  Example: youtube.com/@channelname or youtube.com/channel/UCxxxxx
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreatorSearch;