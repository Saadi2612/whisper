const WS_URL = process.env.WEBSOCKET_URL;
class WebSocketTTSService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.listeners = new Map();
    this.keepAliveInterval = null;
  }

  connect() {
    return new Promise((resolve, reject) => {

      try {
        // Use localhost:8000 for development
        const wsUrl = `${WS_URL}/ws/text-to-speech`;
        
        console.log('Connecting to WebSocket TTS service:', wsUrl);
        console.log('Current location:', window.location.href);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ WebSocket TTS connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.emit('connected', true);
          
          // Start keep-alive ping every 30 seconds
          this.startKeepAlive();
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 WebSocket message received:', data.type);
            this.handleMessage(data);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket TTS disconnected:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          this.isConnected = false;
          this.emit('connected', false);
          
          // Only attempt reconnection if it wasn't a clean close
          if (!event.wasClean && event.code !== 1000) {
            this.attemptReconnect();
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket TTS error:', error);
          console.error('Error details:', {
            type: error.type,
            target: error.target,
            readyState: error.target?.readyState
          });
          this.emit('error', { message: 'WebSocket connection failed' });
          reject(error);
        };
        
      } catch (error) {
        console.error('❌ Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms`);
      
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection attempt failed:', error);
          this.reconnectDelay *= 2; // Exponential backoff
        });
      }, this.reconnectDelay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.emit('error', { message: 'Connection lost and reconnection failed. Please refresh the page.' });
    }
  }

  handleMessage(data) {
    const { type } = data;
    
    switch (type) {
      case 'audio_chunk':
        this.emit('audioChunk', data);
        break;
      case 'final':
        this.emit('final', data);
        break;
      case 'error':
        this.emit('error', data);
        break;
      default:
        console.log('Unknown message type:', type);
    }
  }

  sendMessage(message) {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
      throw new Error('WebSocket not connected');
    }
  }

  streamTextToSpeech(text, options = {}) {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected. Call connect() first.');
    }

    const message = {
      text,
      voice_id: options.voiceId,
      model_id: options.modelId,
      voice_settings: options.voiceSettings,
      chunk_length_schedule: options.chunkLengthSchedule
    };

    this.sendMessage(message);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  startKeepAlive() {
    // Clear any existing keep-alive
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    
    // Send ping every 30 seconds to keep connection alive
    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('🏓 Sending keep-alive ping');
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  disconnect() {
    this.stopKeepAlive();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}

// Create a singleton instance
const websocketTtsService = new WebSocketTTSService();

export default websocketTtsService;
