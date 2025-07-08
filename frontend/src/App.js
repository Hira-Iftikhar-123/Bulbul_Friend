import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Chat from './pages/Chat';
import Auth from './pages/Auth';
import PersonalDashboard from './pages/PersonalDashboard';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<PersonalDashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
