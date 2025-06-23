import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Meet <span className="text-yellow-300">Bulbul</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Your AI-powered Arabic learning companion
            </p>
            <p className="text-lg mb-12 text-blue-200 max-w-2xl mx-auto">
              Practice Arabic conversation anytime, anywhere. Bulbul adapts to your level, 
              provides personalized feedback, and makes learning fun and engaging.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/chat" 
                className="btn-primary bg-white text-blue-600 hover:bg-gray-100"
              >
                Start Chatting
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Bulbul Friend?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform combines cutting-edge technology with proven learning methods 
              to make Arabic learning accessible, engaging, and effective.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card-hover text-center">
              <div className="text-blue-600 mb-4 text-4xl">💬</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI Conversation Partner
              </h3>
              <p className="text-gray-600">
                Practice Arabic with our intelligent AI companion, Bulbul, designed to adapt to your learning level.
              </p>
            </div>
            
            <div className="card-hover text-center">
              <div className="text-blue-600 mb-4 text-4xl">🎤</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Voice Recognition
              </h3>
              <p className="text-gray-600">
                Speak naturally and get instant feedback on your pronunciation and fluency.
              </p>
            </div>
            
            <div className="card-hover text-center">
              <div className="text-blue-600 mb-4 text-4xl">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Personalized Learning
              </h3>
              <p className="text-gray-600">
                Track your progress and get customized lessons based on your current level.
              </p>
            </div>
            
            <div className="card-hover text-center">
              <div className="text-blue-600 mb-4 text-4xl">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Progress Tracking
              </h3>
              <p className="text-gray-600">
                Monitor your learning journey with detailed analytics and assessments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Start Your Arabic Journey?
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Join thousands of learners who are already improving their Arabic skills with Bulbul Friend.
          </p>
          
          <Link 
            to="/chat" 
            className="btn-primary bg-white text-blue-600 hover:bg-gray-100"
          >
            Start Learning Today
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home; 