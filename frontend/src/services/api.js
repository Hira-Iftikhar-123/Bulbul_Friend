import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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
    return api.post('/api/conversation/chat', {
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

// Chat API
export const chatAPI = {
  sendMessage: (message, language = 'arabic') => {
    return api.post('/api/chat', {
      message,
      language,
    }).then(res => res.data);
  },
};

// Health check
export const healthAPI = {
  check: () => {
    return api.get('/health').then(res => res.data);
  },
};

export default api; 