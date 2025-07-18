#!/usr/bin/env python3
"""
Test script for Bulbul Friend ASR (Automatic Speech Recognition) functionality.
Tests real-time processing, file upload, and direct recording methods.
"""

import asyncio
import websockets
import json
import base64
import sounddevice as sd
import numpy as np
import requests
import tempfile
import wave
import os
from datetime import datetime

# Configuration
BACKEND_URL = "http://localhost:8000"
WEBSOCKET_URL = "ws://localhost:8000/ws/audio-stream"
SAMPLE_RATE = 16000
DURATION = 3  # seconds

def test_direct_recording():
    """Test the direct recording endpoint (fallback method)"""
    print("\n=== Testing Direct Recording (Fallback) ===")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/record-and-transcribe",
            params={"duration": DURATION, "sample_rate": SAMPLE_RATE},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Direct recording successful!")
            print(f"   Transcription: '{result['transcription']}'")
            print(f"   Language: {result['language']}")
            print(f"   Confidence: {result.get('confidence', 'N/A')}")
            return True
        else:
            print(f"❌ Direct recording failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Direct recording error: {e}")
        return False

def test_file_upload():
    """Test the file upload endpoint"""
    print("\n=== Testing File Upload ===")
    
    try:
        # Record audio to a temporary file
        print("Recording audio for file upload test...")
        audio_data = sd.rec(int(DURATION * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype='int16')
        sd.wait()
        
        # Save to temporary WAV file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            with wave.open(temp_file.name, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(SAMPLE_RATE)
                wav_file.writeframes(audio_data.tobytes())
            
            temp_file_path = temp_file.name
        
        # Upload file
        with open(temp_file_path, 'rb') as audio_file:
            files = {'audio_file': ('test_audio.wav', audio_file, 'audio/wav')}
            response = requests.post(f"{BACKEND_URL}/api/transcribe-voice", files=files, timeout=30)
        
        # Clean up
        os.unlink(temp_file_path)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ File upload successful!")
            print(f"   Transcription: '{result['transcription']}'")
            print(f"   Language: {result['language']}")
            print(f"   Confidence: {result.get('confidence', 'N/A')}")
            return True
        else:
            print(f"❌ File upload failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ File upload error: {e}")
        return False

async def test_realtime_websocket():
    """Test real-time WebSocket streaming"""
    print("\n=== Testing Real-time WebSocket Streaming ===")
    
    try:
        # Connect to WebSocket
        async with websockets.connect(WEBSOCKET_URL) as websocket:
            print("✅ WebSocket connected")
            
            # Record audio
            print("Recording audio for real-time streaming...")
            audio_data = sd.rec(int(DURATION * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype='int16')
            sd.wait()
            
            # Convert to bytes and base64
            audio_bytes = audio_data.tobytes()
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            # Send audio chunk
            message = {
                "type": "audio_chunk",
                "data": audio_base64,
                "sample_rate": SAMPLE_RATE
            }
            await websocket.send(json.dumps(message))
            
            # Signal end of stream
            end_message = {
                "type": "end_stream",
                "sample_rate": SAMPLE_RATE
            }
            await websocket.send(json.dumps(end_message))
            
            # Wait for response
            print("Waiting for transcription...")
            response = await asyncio.wait_for(websocket.recv(), timeout=30)
            result = json.loads(response)
            
            if result.get("type") == "transcription":
                print(f"✅ Real-time streaming successful!")
                print(f"   Transcription: '{result['transcription']}'")
                print(f"   Language: {result['language']}")
                print(f"   Confidence: {result.get('confidence', 'N/A')}")
                return True
            else:
                print(f"❌ Real-time streaming failed: {result}")
                return False
                
    except Exception as e:
        print(f"❌ Real-time streaming error: {e}")
        return False

def test_backend_health():
    """Test if the backend is running"""
    print("\n=== Testing Backend Health ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is healthy")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend health check error: {e}")
        return False

def test_chat_integration():
    """Test chat integration with transcribed text"""
    print("\n=== Testing Chat Integration ===")
    
    try:
        test_message = "Hello, how are you today?"
        
        response = requests.post(
            f"{BACKEND_URL}/api/chat",
            json={"message": test_message, "language": "english"},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Chat integration successful!")
            print(f"   Input: '{test_message}'")
            print(f"   Response: '{result['response']}'")
            print(f"   Language: {result['language']}")
            return True
        else:
            print(f"❌ Chat integration failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Chat integration error: {e}")
        return False

async def main():
    """Run all tests"""
    print("🎤 Bulbul Friend ASR Test Suite")
    print("=" * 50)
    
    # Test results
    results = {
        "backend_health": False,
        "chat_integration": False,
        "realtime_websocket": False,
        "file_upload": False,
        "direct_recording": False
    }
    
    # Run tests
    results["backend_health"] = test_backend_health()
    
    if results["backend_health"]:
        results["chat_integration"] = test_chat_integration()
        
        print("\n🎙️ Starting voice tests...")
        print("Please speak clearly when prompted!")
        
        # Test in priority order (same as frontend)
        results["realtime_websocket"] = await test_realtime_websocket()
        results["file_upload"] = test_file_upload()
        results["direct_recording"] = test_direct_recording()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    total_tests = len(results)
    passed_tests = sum(results.values())
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed! ASR system is working correctly.")
    elif results["backend_health"]:
        print("⚠️  Some tests failed, but fallback methods are available.")
    else:
        print("❌ Backend is not running. Please start the backend server first.")
    
    print("\n💡 Usage Priority:")
    print("1. Real-time WebSocket streaming (best performance)")
    print("2. File upload (good reliability)")
    print("3. Direct recording (fallback method)")

if __name__ == "__main__":
    print("Starting ASR tests...")
    print("Make sure your microphone is working and the backend is running!")
    input("Press Enter to continue...")
    
    asyncio.run(main()) 