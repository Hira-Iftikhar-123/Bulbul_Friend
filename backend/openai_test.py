# backend/services/audio_processor.py
import base64
import os
from dotenv import load_dotenv
from openai import AsyncOpenAI
import asyncio


async def process_audio_with_llm(audio_data: bytes) -> bytes:
    instruction="respond like you are an arabic instructor helping your student learn through dialogues"
    audio_b64 = base64.b64encode(audio_data).decode()

    load_dotenv('.env.local') 
    apikey = os.getenv('OPENAI_API_KEY')

    client=AsyncOpenAI(api_key=apikey)


    messages = [
        {
            "role": "system",
            "content":instruction
        },
        {
            "role":"user",
            "content": [
                {
                    "type":"input_audio",
                    "input_audio":{
                        "data":audio_b64,
                        "format":"mp3"
                    }
                }
            ]
        }
    ]
    output_message = await client.chat.completions.create(
        model="gpt-4o-audio-preview",
        modalities=["text", "audio"],
        audio={"voice": "alloy", "format": "mp3"},
        messages=messages,
        max_tokens=1000,
    )
    
    try:
        audio_b64 = output_message.choices[0].message.audio.data #type:ignore
        if not audio_b64:
            raise ValueError("API response did not contain audio data in the expected location.")
        
        audio_bytes = base64.b64decode(audio_b64)
        return audio_bytes
    except (AttributeError, IndexError, TypeError) as e:
        print("--- Failed to extract audio from the expected path ---")
        print(f"Error encountered: {e}")
        print("Full API response object for debugging:")
        print(output_message.model_dump_json(indent=2))
        raise ValueError("Could not extract audio data from the API response. Check the console for details.")