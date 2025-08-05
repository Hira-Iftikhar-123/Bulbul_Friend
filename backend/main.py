import asyncio
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from GeminiLLM import query_gemini
from pydantic import BaseModel
from models import ChatRequest, ChatResponse
from typing import Optional
import uvicorn
from datetime import datetime
import tempfile
import os
import subprocess
from openai_test import process_audio_with_llm
from gemini_test import gemini_response
from fastapi.responses import Response, StreamingResponse
from openai_stream import OpenAIAudio

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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)



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

@app.get("/api/test")
async def test_endpoint():
    return {"message": "Backend is working", "timestamp": datetime.now().isoformat()}

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

@app.post("/api/process-audio")
async def getresponse_openai(
    audio: UploadFile = File(...)
):

    try:
        audio_data = convert_webm_to_mp3_bytes(await audio.read())
        response_data = await process_audio_with_llm(audio_data)
        return Response(
            content=response_data,
            media_type="audio/mpeg",
            headers={"Content-Disposition":"attachment; filename=response.mp3"}
        )
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))
    
def convert_webm_to_mp3_bytes(webm_bytes: bytes) -> bytes:
    process = subprocess.Popen(
        ['ffmpeg', '-i', 'pipe:0', '-ar', '16000', '-ac', '1', '-f', 'mp3', 'pipe:1'],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    mp3_bytes, stderr = process.communicate(input=webm_bytes)
    if process.returncode != 0:
        raise RuntimeError(f"ffmpeg error: {stderr.decode()}")
    return mp3_bytes


@app.post("/api/gemini-process")
async def getresponse_gemini(
    audio: UploadFile = File(...)
):
    try:
        audio_bytes = await audio.read()
        mp3_bytes = convert_webm_to_mp3_bytes(audio_bytes)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp:
            tmp.write(mp3_bytes)
            tmp_path = tmp.name

        def streamer():
            try:
                for chunk in gemini_response(tmp_path):
                    yield chunk
            finally:
                os.unlink(tmp_path)

        return StreamingResponse(streamer(), media_type="application/json")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/openai")
async def openaipipe(
    audio: UploadFile = File(...)
):
    try:
        transcript_text = await OpenAIAudio(audio)
        return {"text": transcript_text}
    except Exception as e:
        print(f"Error in openaipipe: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
