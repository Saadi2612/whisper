# Whisper Dashboard API Contracts

## Overview
This document defines the API contracts between the frontend and backend for the Whisper Dashboard application.

## Backend Integration Points

### 1. Video Processing API
**Endpoint**: `POST /api/videos/process`
**Purpose**: Process YouTube videos to get transcripts and AI analysis

**Request**:
```json
{
  "url": "https://youtube.com/watch?v=xyz",
  "language": "en"
}
```

**Response**:
```json
{
  "status": "success",
  "video": {
    "id": "uuid",
    "title": "Video title",
    "channel_name": "Channel Name",
    "transcript": "Full transcript...",
    "analysis": {
      "executive_summary": "...",
      "key_insights": ["..."],
      "topics": ["..."],
      "key_quotes": ["..."]
    },
    "chart_data": {
      "keyPoints": [{"label": "...", "score": 85}],
      "timeline": [{"step": "T1", "open": 70, "closed": 75}]
    }
  }
}
```

### 2. Video List API
**Endpoint**: `GET /api/videos`
**Purpose**: Get paginated list of processed videos

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

### 3. Channel Following API
**Endpoint**: `POST /api/channels/follow`
**Purpose**: Follow YouTube channels

**Request**:
```json
{
  "channel_url": "https://youtube.com/@channel"
}
```

### 4. Search API
**Endpoint**: `GET /api/search/videos?q=query`
**Purpose**: Search processed videos

### 5. Stats API
**Endpoint**: `GET /api/stats`
**Purpose**: Get user statistics

## Frontend Updates Required

1. **Remove Mock Data**: Replace mockData.js with real API calls
2. **Add API Service**: Create apiService.js for backend communication
3. **Update Dashboard Component**: Connect to real video data
4. **Add Video Processing**: Handle YouTube URL submission
5. **Real-time Updates**: Implement polling for new videos
6. **Error Handling**: Add proper error states and loading indicators

## Integration Flow

1. User submits YouTube URL → POST /api/videos/process
2. Backend gets transcript via Supadata API
3. Backend generates AI summary via Emergent LLM
4. Frontend displays processed video in dashboard
5. User can view detailed analysis with charts

## Database Collections

- `processed_videos`: Stores video data, transcripts, and analysis
- `followed_channels`: Stores followed YouTube channels
- `user_sessions`: (Future) User authentication data

## External Services

- **Supadata API**: YouTube transcript extraction
- **Emergent LLM**: AI summary generation
- **MongoDB**: Data persistence