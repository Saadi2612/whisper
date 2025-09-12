import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('whisper_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - don't redirect automatically
      localStorage.removeItem('whisper_token');
      // Let the auth context handle the state update
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Authentication
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  },

  async register(email, password, name, preferences = null) {
    try {
      const requestData = { email, password, name };
      if (preferences) {
        requestData.preferences = preferences;
      }
      const response = await apiClient.post('/auth/register', requestData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  },

  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get user info');
    }
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Don't throw error for logout
      console.warn('Logout request failed:', error);
    }
  },

  // Settings
  async getUserSettings() {
    try {
      const response = await apiClient.get('/settings');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get settings');
    }
  },

  async updateUserSettings(settings) {
    try {
      const response = await apiClient.put('/settings', settings);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to update settings');
    }
  },

  // Preferences
  async getUserPreferences() {
    try {
      const response = await apiClient.get('/preferences');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get preferences');
    }
  },

  async updateUserPreferences(preferences) {
    try {
      const response = await apiClient.put('/preferences', preferences);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to update preferences');
    }
  },

  async dismissProfilePrompt() {
    try {
      const response = await apiClient.post('/preferences/dismiss');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to dismiss profile prompt');
    }
  },

  // Process YouTube video
  async processVideo(url, language = 'en') {
    try {
      console.log('🚀 API Service: processVideo called with URL:', url);
      const response = await apiClient.post('/videos/process', {
        url,
        language
      });
      console.log('✅ API Service: processVideo response received');
      return response.data;
    } catch (error) {
      console.error('❌ API Service: processVideo error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to process video');
    }
  },

  // Get list of processed videos
  async getVideos(page = 1, limit = 20) {
    try {
      const response = await apiClient.get('/videos', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch videos');
    }
  },

  // Get specific video by ID
  async getVideo(videoId) {
    try {
      const response = await apiClient.get(`/videos/${videoId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch video');
    }
  },

  // Follow a channel
  async followChannel(channelUrl) {
    try {
      const response = await apiClient.post('/channels/follow', {
        channel_url: channelUrl
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to follow channel');
    }
  },

  // Get followed channels
  async getFollowedChannels() {
    try {
      const response = await apiClient.get('/channels/following');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch followed channels');
    }
  },

  // Search videos
  async searchVideos(query, page = 1, limit = 20) {
    try {
      const response = await apiClient.get('/search/videos', {
        params: { q: query, page, limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to search videos');
    }
  },

  // Get user stats
  async getUserStats() {
    try {
      const response = await apiClient.get('/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch stats');
    }
  },

  // Ask question about video
  async askQuestionAboutVideo(videoId, question) {
    try {
      const response = await apiClient.post(`/videos/${videoId}/ask`, { question });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to ask question');
    }
  },

  // Get suggested questions for video
  async getSuggestedQuestions(videoId) {
    try {
      const response = await apiClient.get(`/videos/${videoId}/suggested-questions`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get suggested questions');
    }
  },

  // Refresh videos from followed channels
  async refreshChannelVideos() {
    try {
      const response = await apiClient.post('/channels/refresh-videos');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to refresh channel videos');
    }
  },

  // Get video timeline with timestamps
  async getVideoTimeline(videoId) {
    try {
      const response = await apiClient.get(`/videos/${videoId}/timeline`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get video timeline');
    }
  },

  // Get time range summary
  async getTimeRangeSummary(videoId, startTime, endTime) {
    try {
      const response = await apiClient.post(`/videos/${videoId}/time-range-summary`, {
        start_time: startTime,
        end_time: endTime
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get time range summary');
    }
  },

  // Compare multiple time ranges
  async compareTimeRanges(videoId, timeRanges) {
    try {
      const response = await apiClient.post(`/videos/${videoId}/compare-time-ranges`, {
        time_ranges: timeRanges
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to compare time ranges');
    }
  },

  // Get YouTube videos (search/discover)
  async getYouTubeVideos(query = '', page = 1, limit = 15, nextPageToken = null) {
    try {
      const body = {
        query,
        search_type: "topic",
        max_results: limit,
        sort_order: "relevance",
        duration: "medium",
        upload_time: "month",
        safe_search: true
      };
      
      // Add pagination token if provided
      if (nextPageToken) {
        body.next_page_token = nextPageToken;
      }
      
      const response = await apiClient.post('/search/youtube', body);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch YouTube videos');
    }
  }
};