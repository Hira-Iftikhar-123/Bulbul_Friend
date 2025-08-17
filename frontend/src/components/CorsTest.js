import React, { useState } from 'react';

const CorsTest = () => {
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testCors = async () => {
    setIsLoading(true);
    setTestResult('Testing...');

    try {
      // Test 1: Simple GET request
      const response1 = await fetch('https://bulbulfriend-backend.up.railway.app/api/health', {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response1.ok) {
        setTestResult('✅ GET request successful');
      } else {
        setTestResult(`❌ GET request failed: ${response1.status} ${response1.statusText}`);
      }
    } catch (error) {
      setTestResult(`❌ CORS Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testOptions = async () => {
    setIsLoading(true);
    setTestResult('Testing OPTIONS...');

    try {
      const response = await fetch('https://bulbulfriend-backend.up.railway.app/api/realtime-conversation', {
        method: 'OPTIONS',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      if (response.ok) {
        setTestResult('✅ OPTIONS request successful - CORS preflight working');
      } else {
        setTestResult(`❌ OPTIONS request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setTestResult(`❌ OPTIONS Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">CORS Test</h3>
      
      <div className="space-y-3">
        <button
          onClick={testCors}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test GET Request
        </button>
        
        <button
          onClick={testOptions}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 ml-2"
        >
          Test OPTIONS Request
        </button>
      </div>

      {testResult && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <pre className="text-sm">{testResult}</pre>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Current Frontend URL:</strong> {window.location.origin}</p>
        <p><strong>Backend URL:</strong> https://bulbulfriend-backend.up.railway.app</p>
      </div>
    </div>
  );
};

export default CorsTest;
