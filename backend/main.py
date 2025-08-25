import asyncio
import logging
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from GeminiLLM import query_gemini
from pydantic import BaseModel
from models import ChatRequest, ChatResponse
from typing import Optional
import uvicorn
from datetime import datetime
import tempfile
import os
from openai_realtime import openai_realtime_stream
import subprocess
from openai_test import process_audio_with_llm
from gemini_test import gemini_response
from fastapi.responses import Response, StreamingResponse
from openai_stream import OpenAIAudio
from openai_streaming_tts_fixed import process_audio_with_streaming_tts_fixed, process_transcript_with_streaming_tts_fixed
from starlette.websockets import WebSocketDisconnect
import io
import sys
import json


if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    force=True
)

# Create FastAPI app
app = FastAPI(
    title="Bulbul Friend API",
    description="AI-powered Arabic-speaking companion",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)
@app.get("/check_ffmpeg")
async def check_ffmpeg():
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        return {"status": "found", "version": result.stdout.splitlines()[0]}
    except FileNotFoundError:
        return {"status": "not found"}

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://bulbulfriend-frontend.up.railway.app",  
    ],
    allow_credentials=True,
    allow_methods=["*"],
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
        ['ffmpeg', '-f', 'webm', '-i', 'pipe:0', '-ar', '16000', '-ac', '1', '-f', 'wav', 'pipe:1'],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    mp3_bytes, stderr = process.communicate(input=webm_bytes)
    if process.returncode != 0:
        raise RuntimeError(f"ffmpeg error: {stderr.decode()}")
    return mp3_bytes


# @app.post("/api/gemini-process")
# async def getresponse_gemini(
#     audio: UploadFile = File(...)
# ):
#     try:
#         audio_bytes = await audio.read()
#         mp3_bytes = convert_webm_to_mp3_bytes(audio_bytes)
        
#         with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp:
#             tmp.write(mp3_bytes)
#             tmp_path = tmp.name

#         async def streamer():
#             try:
#                 async for chunk in gemini_response(tmp_path):
#                     yield chunk
#             finally:
#                 os.unlink(tmp_path)

#         return StreamingResponse(streamer(), media_type="application/json")

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/openai")
async def openaipipe(websocket: WebSocket):
    await websocket.accept()
    audio_chunks = []
    
    try:
        while True:
            # Receive a new audio chunk
            chunk = await websocket.receive_bytes()
            audio_chunks.append(chunk)
            
            # Combine all chunks received so far into a single byte string
            full_audio_bytes = b"".join(audio_chunks)
            
            # Create a file-like object from the combined audio data
            audio_file = io.BytesIO(full_audio_bytes)
            audio_file.name = "recording.webm"
            
            # Transcribe the entire audio received up to this point
            transcript = await OpenAIAudio(audio_file)
            
            # Send the latest transcript back to the client
            await websocket.send_text(transcript)

    except WebSocketDisconnect:
        print("WebSocket client disconnected.")
    except Exception as e:
        error_message = f'{{"error": "An error occurred: {str(e)}"}}'
        print(error_message)
        try:
            await websocket.send_text(error_message)
        except Exception:
            pass  # Client might have already disconnected
    finally:
        await websocket.close()

@app.post("/api/streaming-tts-fixed")
async def streaming_tts_fixed_endpoint(
    transcript:str
):
    try:
        async def streamer():
            async for chunk in process_audio_with_streaming_tts_fixed(transcript=transcript):
                yield chunk
        
        return StreamingResponse(
            streamer(), 
            media_type="application/json",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "application/json"
            }
        )
        
    except Exception as e:
        print(f"Error in fixed streaming TTS endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class TranscriptRequest(BaseModel):
    transcript: str
    language: Optional[str] = 'arabic'

@app.post("/api/openai")
async def openaipipe(
    audio: UploadFile = File(...)
):
    try:
        transcript_text = await OpenAIAudio(audio) # type: ignore
        return {"text": transcript_text}
    except Exception as e:
        print(f"Error in openaipipe: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/streaming-tts-transcript")
async def streaming_tts_transcript_endpoint(
    request: TranscriptRequest
):
    try:
        async def streamer():
            async for chunk in process_transcript_with_streaming_tts_fixed(request.transcript):
                yield chunk
        
        return StreamingResponse(
            streamer(), 
            media_type="application/json",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "application/json"
            }
        )
        
    except Exception as e:
        print(f"Error in transcript streaming TTS endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# @app.post("/api/realtime-conversation")
# async def realtime_conversation(file: UploadFile):
#     audio_bytes = await file.read()
#     return StreamingResponse(
#         openai_realtime_stream(audio_bytes),
#         media_type="text/event-stream",
#         headers={
#             "Access-Control-Allow-Origin": "*",
#             "Cache-Control": "no-cache",
#             "Connection": "keep-alive",
#         },
#     )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
