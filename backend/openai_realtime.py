# backend/openai_realtime_http.py
import json
import base64
import os
import websockets
from fastapi import FastAPI, UploadFile
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

load_dotenv(".env.local")
API_KEY = os.getenv("OPENAI_API_KEY")
WS_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2025-06-03"

app = FastAPI()

async def openai_realtime_stream(audio_bytes: bytes):
    async with websockets.connect(
        WS_URL,
        extra_headers={
            "Authorization": f"Bearer {API_KEY}",
            "OpenAI-Beta": "realtime=v1"
        }
    ) as openai_ws:

        # Send audio file
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        await openai_ws.send(json.dumps({
            "type": "input_audio_buffer.append",
            "audio": audio_b64
        }))
        await openai_ws.send(json.dumps({"type": "input_audio_buffer.commit"}))

        # Request both text + audio
        await openai_ws.send(json.dumps({
            "type": "response.create",
            "response": {
                "modalities": ["text", "audio"],
                "instructions": "reply in audio like an arabic instructor",
                "voice": "verse"
            },
        }))

        # Stream events as they arrive
        async for msg in openai_ws:
            event = json.loads(msg)
            yield f"data: {json.dumps(event)}\n\n"
            if event.get("type") == "rate_limits.updated":
                break