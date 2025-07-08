from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
from datetime import datetime
import sounddevice as sd
import numpy as np
import whisper
import tempfile
import os
import ffmpeg

# Load Whisper model
model = whisper.load_model("base")

# Create FastAPI app
app = FastAPI(
    title="Bulbul Friend API",
    description="AI-powered Arabic-speaking companion",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    language: str = "arabic"

class ChatResponse(BaseModel):
    response: str
    language: str
    timestamp: str

class VoiceTranscriptionResponse(BaseModel):
    transcription: str
    language: str
    timestamp: str
    confidence: Optional[float] = None

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to Bulbul Friend API",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Basic chat endpoint
@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_bulbul(request: ChatRequest):
    """
    Basic chat endpoint with Bulbul AI
    """
    # Simple response for now - will be replaced with actual LLM integration
    if request.language == "arabic":
        response = "مرحباً! أنا بلبل، صديقك في تعلم اللغة العربية. كيف يمكنني مساعدتك اليوم؟"
    else:
        response = "Hello! I'm Bulbul, your Arabic learning companion. How can I help you today?"
    
    return ChatResponse(
        response=response,
        language=request.language,
        timestamp=datetime.now().isoformat()
    )

# Basic user info endpoint
@app.get("/api/user")
async def get_user_info():
    """
    Get basic user information
    """
    return {
        "id": 1,
        "username": "demo_user",
        "arabic_level": "beginner",
        "english_level": "intermediate",
        "preferred_language": "arabic"
    }

# Voice transcription endpoint
@app.post("/api/transcribe-voice", response_model=VoiceTranscriptionResponse)
async def transcribe_voice(audio_file: UploadFile = File(...)):
    """
    Transcribe voice input using Whisper ASR
    """
    try:
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

# Voice recording endpoint (for testing)
@app.post("/api/record-and-transcribe", response_model=VoiceTranscriptionResponse)
async def record_and_transcribe(duration: int = 5, sample_rate: int = 16000):
    """
    Record audio from microphone and transcribe it
    Note: This endpoint is for testing purposes and may not work in all environments
    """
    try:
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
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 