import React, { useState } from 'react';
import AudioRecorder from '../components/AudioRecorder';

const StreamingTTSTest = () => {
  const [testResults, setTestResults] = useState([]);

  const handleChunkReceived = (chunk) => {
    console.log('Chunk received:', chunk);
    setTestResults(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      chunk: chunk
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'url(/Wallpaper_Bulbul.jpeg) no-repeat center center fixed',
      backgroundSize: 'cover',
      fontFamily: 'serif',
      position: 'relative'
    }}>
      <div className="max-w-6xl mx-auto p-4">
        <div className="card">
          <h1 className="text-3xl font-bold mb-6 text-center">Streaming TTS Test</h1>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Audio Recorder Section */}
            <div className="card bg-white">
              <AudioRecorder onResponse={handleChunkReceived} />
            </div>

            {/* Test Results Section */}
            <div className="card bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Test Results</h3>
                <button
                  onClick={clearResults}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                >
                  Clear
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {testResults.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No test results yet. Record audio to see streaming chunks.
                  </p>
                ) : (
                  testResults.map((result, index) => (
                    <div key={index} className="mb-3 p-3 bg-white border border-gray-200 rounded">
                      <div className="text-xs text-gray-500 mb-1">
                        {result.timestamp}
                      </div>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.chunk, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 card bg-blue-50 border border-blue-200">
            <h3 className="font-semibold mb-2 text-blue-800">How to Test:</h3>
            <ol className="list-decimal list-inside text-blue-700 space-y-1">
              <li>Click "Start Recording" to begin recording your voice</li>
              <li>Speak clearly into your microphone</li>
              <li>Click "Stop Recording" when done</li>
              <li>Click "Send Audio" to process with streaming TTS</li>
              <li>Watch the test results panel for real-time chunks</li>
              <li>Audio will play automatically as chunks arrive</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingTTSTest; 