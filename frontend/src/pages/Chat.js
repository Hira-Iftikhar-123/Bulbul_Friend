import React, { useState } from 'react';
import { chatAPI } from '../services/api';

const Chat = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('arabic');

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const result = await chatAPI.sendMessage(message, language);
      setResponse(result.response);
    } catch (error) {
      console.error('Error sending message:', error);
      setResponse('Sorry, there was an error processing your message.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'url(/Wallpaper_Bulbul.jpeg) no-repeat center center fixed',
      backgroundSize: 'cover',
      fontFamily: 'serif',
      position: 'relative'
    }}>
      <div className="max-w-4xl mx-auto p-4"> 
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">Chat with Bulbul</h1>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language:
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="input-field w-auto"
          >
            <option value="arabic">العربية</option>
            <option value="english">English</option>
          </select>
        </div>

        <form onSubmit={sendMessage} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={language === 'arabic' ? 'اكتب رسالتك هنا...' : 'Type your message here...'}
              className="input-field flex-1"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>

        {response && (
          <div className="card bg-gray-50">
            <h3 className="font-semibold mb-2">Bulbul's Response:</h3>
            <div className={language === 'arabic' ? 'arabic-text' : ''}>
              {response}
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default Chat; 