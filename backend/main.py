from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
from datetime import datetime

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

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 