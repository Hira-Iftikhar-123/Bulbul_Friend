import axios from 'axios';

// API base URL - use environment variable or fallback to production backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://bulbulfriend-backend.up.railway.app';

// Create axios instance with CORS configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  },
  withCredentials: false, // Disable credentials for CORS
  timeout: 30000 // 30 second timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request for debugging
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      headers: config.headers,
      data: config.data
    });
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.message,
      response: error.response?.data
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Handle CORS errors specifically
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      console.error('CORS or Network Error detected. This usually means:');
      console.error('1. The backend server is not running');
      console.error('2. CORS is not properly configured on the backend');
      console.error('3. The API endpoint does not exist');
      console.error('4. Network connectivity issues');
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    return api.post('/api/auth/login', formData).then(res => res.data);
  },

  register: (userData) => {
    return api.post('/api/auth/register', userData).then(res => res.data);
  },

  getCurrentUser: () => {
    return api.get('/api/auth/me').then(res => res.data);
  },

  updateProfile: (profileData) => {
    return api.put('/api/auth/profile', profileData).then(res => res.data);
  },
};

// Conversation API
export const conversationAPI = {
  chat: (message, language = 'arabic', context = null) => {
    return api.post('/api/chat', {
      message,
      language,
      context,
    }).then(res => res.data);
  },

  getHistory: (limit = 50, offset = 0) => {
    return api.get(`/api/conversation/history?limit=${limit}&offset=${offset}`).then(res => res.data);
  },

  getStats: () => {
    return api.get('/api/conversation/stats').then(res => res.data);
  },

  clearHistory: () => {
    return api.delete('/api/conversation/history').then(res => res.data);
  },
};

// Learning API
export const learningAPI = {
  updateProgress: (progressData) => {
    return api.post('/api/learning/progress', progressData).then(res => res.data);
  },

  getProgress: () => {
    return api.get('/api/learning/progress').then(res => res.data);
  },

  getTopics: (language = 'arabic', level = 'beginner') => {
    return api.get(`/api/learning/topics?language=${language}&level=${level}`).then(res => res.data);
  },

  getStats: () => {
    return api.get('/api/learning/stats').then(res => res.data);
  },
};

// Assessment API
export const assessmentAPI = {
  evaluate: (assessmentData) => {
    return api.post('/api/assessment/evaluate', assessmentData).then(res => res.data);
  },

  getHistory: () => {
    return api.get('/api/assessment/history').then(res => res.data);
  },

  getCurrentLevel: () => {
    return api.get('/api/assessment/current-level').then(res => res.data);
  },

  getRecommendations: (language = 'arabic') => {
    return api.get(`/api/assessment/recommendations?language=${language}`).then(res => res.data);
  },
};

// Speech API
export const speechAPI = {
  speechToText: (audioFile, language = 'arabic') => {
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    formData.append('language', language);
    return api.post('/api/speech-to-text', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data);
  },

  textToSpeech: (text, language = 'arabic', voice = 'default') => {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('language', language);
    formData.append('voice', voice);
    return api.post('/api/text-to-speech', formData, {
      responseType: 'blob',
    }).then(res => res.data);
  },
};

// Chat API with realtime conversation support
export const chatAPI = {
  sendMessage: (message, language = 'arabic') => {
    return api.post('/api/chat', {
      message,
      language,
    }).then(res => res.data);
  },

  realtimeConversation: (formData) => {
    // Create a new axios instance for multipart form data
    const realtimeApi = axios.create({
      baseURL: API_BASE_URL,
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      withCredentials: false,
      timeout: 60000 // 60 second timeout for audio processing
    });

    // Add request interceptor for debugging
    realtimeApi.interceptors.request.use(
      (config) => {
        console.log('Realtime API Request:', {
          method: config.method,
          url: config.url,
          headers: config.headers,
          dataType: config.data instanceof FormData ? 'FormData' : typeof config.data
        });
        return config;
      },
      (error) => {
        console.error('Realtime API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for debugging
    realtimeApi.interceptors.response.use(
      (response) => {
        console.log('Realtime API Response:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        });
        return response;
      },
      (error) => {
        console.error('Realtime API Response Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          code: error.code,
          response: error.response?.data
        });

        // Provide specific error messages for common issues
        if (error.response?.status === 405) {
          console.error('Method Not Allowed: The backend endpoint does not support POST requests');
        } else if (error.response?.status === 404) {
          console.error('Endpoint Not Found: The /api/realtime-conversation endpoint does not exist');
        } else if (error.message === 'Network Error') {
          console.error('CORS Error: The backend is not allowing requests from this origin');
          console.error('Frontend Origin:', window.location.origin);
          console.error('Backend URL:', API_BASE_URL);
        }

        return Promise.reject(error);
      }
    );

    return realtimeApi.post('/api/realtime-conversation', formData);
  },
};

// Streaming TTS API
export const streamingTTSAPI = {
  processAudio: async (transcript, onChunk) => {
    const formData = new FormData();
    formData.append('transcript',transcript );
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/streaming-tts-fixed`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line);
              onChunk(chunk);
            } catch (e) {
              console.warn('Failed to parse JSON chunk:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming TTS error:', error);
      throw error;
    }
  },

  processTranscript: async (transcript, language = 'arabic', onChunk) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/streaming-tts-transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcript,
          language: language
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line);
              onChunk(chunk);
            } catch (e) {
              console.warn('Failed to parse JSON chunk:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming TTS transcript error:', error);
      throw error;
    }
  },
};

// Health check
export const healthAPI = {
  check: () => {
    return api.get('/health').then(res => res.data);
  },
};

export default api; 