from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from GeminiLLM import query_gemini
from pydantic import BaseModel
from models import ChatRequest, ChatResponse
from typing import Optional
import uvicorn
from datetime import datetime
import sounddevice as sd
import numpy as np
import whisper
import tempfile
import os
import ffmpeg
from openai_test import process_audio_with_llm
from gemini_test import gemini_response
from fastapi.responses import Response

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
    
@app.post("/api/process-audio")
async def getresponse_openai(
    audio: UploadFile = File(...)
):
    try:
        # Save the uploaded webm file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp_webm:
            tmp_webm.write(await audio.read())
            tmp_webm_path = tmp_webm.name

        # Convert webm to mp3
        tmp_mp3_path = tmp_webm_path.replace('.webm', '.mp3')
        try:
            (
                ffmpeg
                .input(tmp_webm_path)
                .output(tmp_mp3_path, format='mp3')
                .run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
            )
        except ffmpeg.Error as e:
            os.unlink(tmp_webm_path)
            raise HTTPException(status_code=500, detail=f"FFmpeg error: {e.stderr.decode()}")

        # Read the converted mp3 file
        with open(tmp_mp3_path, "rb") as f:
            audio_data = f.read()

        # Clean up temporary files
        os.unlink(tmp_webm_path)
        os.unlink(tmp_mp3_path)

        response_data = process_audio_with_llm(audio_data)
        return Response(
            content=response_data,
            media_type="audio/mpeg",
            headers={"Content-Disposition":"attachment; filename=response.mp3"}
        )
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/gemini-process")
async def getresponse_gemini(
    audio: UploadFile = File(...)
):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name
        response_data = gemini_response(tmp_path)
        os.unlink(tmp_path)
        return {"response": response_data}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )