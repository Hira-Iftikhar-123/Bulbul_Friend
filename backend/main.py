#!/usr/bin/env python3
print("Starting Bulbul Friend backend...")

try:
    print("Importing FastAPI...")
    from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
    print("✅ FastAPI imported successfully")
    
    print("Importing other modules...")
    from fastapi.middleware.cors import CORSMiddleware
    from GeminiLLM import query_gemini
    from pydantic import BaseModel
    from models import ChatRequest, ChatResponse
    # std libs / third-party
    from typing import Optional, List
    import uvicorn
    from datetime import datetime
    import sounddevice as sd
    import numpy as np
    import whisper
    import asyncio
    import json
    import base64
    import io
    import wave
    import threading
    import queue
    import time
    print("✅ All imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    raise

# Load Whisper model
print("Loading Whisper model (this may take a moment)...")
model = whisper.load_model("base")

print("✅ Whisper model loaded successfully")

# Ensure only one thread uses the Whisper model at a time (it is not thread-safe)
model_lock = threading.Lock()

# Real-time audio processing queue
audio_queue = queue.Queue()
transcription_queue = queue.Queue()

# Create FastAPI app
print("Creating FastAPI app...")
app = FastAPI(
    title="Bulbul Friend API",
    description="AI-powered Arabic-speaking companion",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)
print("✅ FastAPI app created successfully")

# Add CORS middleware
print("Adding CORS middleware...")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print("✅ CORS middleware added successfully")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.audio_buffers = {}
        self.transcription_workers = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.audio_buffers[websocket] = []
        print(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.audio_buffers:
            del self.audio_buffers[websocket]
        if websocket in self.transcription_workers:
            self.transcription_workers[websocket] = False
        print(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except:
            self.disconnect(websocket)

manager = ConnectionManager()

# Real-time transcription worker
def real_time_transcription_worker(websocket: WebSocket, audio_data: bytes, sample_rate: int = 16000):
    """Transcribe raw PCM 16-bit little-endian audio using Whisper; runs in background thread."""
    try:
        audio_array = np.frombuffer(audio_data, dtype=np.int16)
        audio_float = audio_array.astype(np.float32) / 32768.0

        # Require at least ~0.5 s of audio to get sensible output
        if len(audio_float) < sample_rate // 2:
            return

        # Transcribe – protect shared model with a lock
        with model_lock:
            result = model.transcribe(audio_float, fp16=False)
        transcription_text = str(result.get("text", "")).strip()
        detected_language = str(result.get("language", "unknown"))
        confidence_score = result.get("avg_logprob")

        if transcription_text:
            print(f"RT transcription: {transcription_text}")
            from starlette.websockets import WebSocketState
            if websocket.client_state == WebSocketState.CONNECTED:
                response = {
                    "type": "transcription",
                    "transcription": transcription_text,
                    "language": detected_language,
                    "confidence": confidence_score,
                    "timestamp": datetime.now().isoformat()
                }
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(manager.send_personal_message(json.dumps(response), websocket))
                finally:
                    loop.close()
    except Exception as e:
        print(f"Real-time transcription error: {e}")
        error_response = {
            "type": "error",
            "message": f"Transcription failed: {str(e)}"
        }
        
        # Send error response using the same threading approach
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(manager.send_personal_message(json.dumps(error_response), websocket))
        finally:
            loop.close()

# WebSocket endpoint for real-time audio streaming
@app.websocket("/ws/audio-stream")
async def websocket_audio_stream(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive audio data
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] in ("audio_chunk", "pcm_chunk"):
                # Decode base64 audio data (strip possible data URI header)
                base64_data = message["data"]
                if "," in base64_data:
                    base64_data = base64_data.split(",", 1)[1]
                audio_data = base64.b64decode(base64_data)
                sample_rate = message.get("sample_rate", 16000)

                # Accumulate PCM chunks per connection
                buf_list = manager.audio_buffers.get(websocket)
                if buf_list is None:
                    buf_list = []
                    manager.audio_buffers[websocket] = buf_list
                buf_list.append(audio_data)

                total_samples = sum(len(b)//2 for b in buf_list)
                if total_samples >= sample_rate:  # ~1 second
                    combined = b"".join(buf_list)
                    manager.audio_buffers[websocket] = []
                    print(f"RT worker: samples={len(combined)//2} max={np.frombuffer(combined, dtype=np.int16).max():.3f}")
                    thread = threading.Thread(
                        target=real_time_transcription_worker,
                        args=(websocket, combined, sample_rate),
                        daemon=True
                    )
                    thread.start()

            elif message["type"] == "end_stream":
                # Client signalled end of stream – nothing special to do for now
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

class VoiceTranscriptionResponse(BaseModel):
    transcription: str
    language: str
    timestamp: str
    confidence: Optional[float] = None

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Bulbul Friend API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

user_histories = []
# Basic chat endpoint
@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_bulbul(request: ChatRequest):
    """
    Basic chat endpoint with Bulbul AI
    """
    # Simple response for now - will be replaced with actual LLM integration
    if request.language == "arabic":
        response = query_gemini(request, user_histories)
    else:
        response = query_gemini(request,user_histories)
    
    if response.response!="error":
        user_histories.append({"role":"user", "parts":[request.message]})
        user_histories.append({"role":"model", "parts":[response.response]})
    return ChatResponse(
        response=response.response,
        language=request.language,
        timestamp=datetime.now().isoformat()
    )

# Get user information
@app.get("/api/user")
async def get_user_info():
    return {
        "name": "Bulbul Friend User",
        "language_preference": "arabic",
        "learning_level": "beginner"
    }

# Voice transcription endpoint (FALLBACK - File Upload)
@app.post("/api/transcribe-voice", response_model=VoiceTranscriptionResponse)
async def transcribe_voice(audio_file: UploadFile = File(...)):
    """
    FALLBACK: Transcribe voice input using Whisper ASR (File Upload)
    This is used when real-time streaming fails
    """
    try:
        print("Using FALLBACK file upload transcription...")
        
        # Check if file is audio
        if audio_file.content_type and not audio_file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        # Save uploaded file temporarily with original extension
        file_extension = audio_file.filename.split('.')[-1] if audio_file.filename else 'webm'
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as temp_file:
            content = await audio_file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Transcribe using Whisper
            print(f"Transcribing file: {temp_file_path}")
            result = model.transcribe(temp_file_path, fp16=False)
            print(f"Transcription result: {result}")
            
            # Clean up temporary file
            os.unlink(temp_file_path)
            
            # Ensure proper types for the response
            transcription_text = str(result.get("text", "")).strip()
            detected_language = str(result.get("language", "unknown"))
            confidence_score = result.get("avg_logprob")
            if confidence_score is not None and isinstance(confidence_score, (int, float)):
                confidence_score = float(confidence_score)
            else:
                confidence_score = None
            
            return VoiceTranscriptionResponse(
                transcription=transcription_text,
                language=detected_language,
                timestamp=datetime.now().isoformat(),
                confidence=confidence_score
            )
            
        except Exception as e:
            # Clean up temporary file in case of error
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
            print(f"Transcription error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
            
    except Exception as e:
        print(f"General error processing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")

# Voice recording endpoint (FALLBACK - Direct Recording)
@app.post("/api/record-and-transcribe", response_model=VoiceTranscriptionResponse)
async def record_and_transcribe(duration: int = 5, sample_rate: int = 16000):
    """
    FALLBACK: Record audio from microphone and transcribe it
    This is used when both real-time streaming and file upload fail
    """
    try:
        print("Using FALLBACK direct recording transcription...")
        
        # Record audio
        print("Recording audio...")
        audio = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1, dtype='int16')
        sd.wait()
        
        # Convert to float32
        audio = audio.flatten().astype(np.float32) / 32768.0
        
        # Transcribe using Whisper
        result = model.transcribe(audio, fp16=False)
        
        # Ensure proper types for the response
        transcription_text = str(result.get("text", "")).strip()
        detected_language = str(result.get("language", "unknown"))
        confidence_score = result.get("avg_logprob")
        if confidence_score is not None and isinstance(confidence_score, (int, float)):
            confidence_score = float(confidence_score)
        else:
            confidence_score = None
        
        return VoiceTranscriptionResponse(
            transcription=transcription_text,
            language=detected_language,
            timestamp=datetime.now().isoformat(),
            confidence=confidence_score
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recording/transcription failed: {str(e)}")

if __name__ == "__main__":
    print("Starting Uvicorn server...")
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        ) 
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        import traceback
        traceback.print_exc() 