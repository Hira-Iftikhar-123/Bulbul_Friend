from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    language: str = "arabic"

class ChatResponse(BaseModel):
    response: str
    language: str
    timestamp: str