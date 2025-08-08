import base64
import os
import json
import asyncio
from typing import AsyncGenerator
from dotenv import load_dotenv
from openai import AsyncOpenAI
import subprocess
import tempfile
from openai.types.chat import ChatCompletionMessageParam

load_dotenv('.env')
apikey = os.getenv('OPENAI_API_KEY')

async def stream_gpt4o_response_fixed(transcript: str) -> AsyncGenerator[dict, None]:
    client = AsyncOpenAI(api_key=apikey)
    
    instruction = "respond like you are an arabic instructor helping your student learn through dialogues respond in three sentences"
    
    messages: list[ChatCompletionMessageParam] = [
        {
            "role": "system",
            "content": instruction
        },
        {
            "role": "user",
            "content": transcript
        }
    ]
    
    try:
        stream = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=500,  # Reduced for faster response
            stream=True,
            temperature=0.7
        )
        
        current_chunk = ""
        chunk_count = 0
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                current_chunk += content
                
                # Send chunk when we have a complete sentence or phrase
                if any(punct in content for punct in ['.', '!', '?', '،', '؛', '\n', ':', ';']):
                    if current_chunk.strip():
                        try:
                            # Convert text chunk to TTS audio
                            audio_bytes = await text_to_speech(current_chunk.strip())
                            
                            yield {
                                "text": current_chunk.strip(),
                                "audio": base64.b64encode(audio_bytes).decode('utf-8'),
                                "chunk_id": chunk_count
                            }
                            
                            current_chunk = ""
                            chunk_count += 1
                        except Exception as e:
                            print(f"Error processing chunk: {e}")
                            # Send text without audio if TTS fails
                            yield {
                                "text": current_chunk.strip(),
                                "audio": "",
                                "chunk_id": chunk_count
                            }
                            current_chunk = ""
                            chunk_count += 1
        
        # Send any remaining text
        if current_chunk.strip():
            try:
                audio_bytes = await text_to_speech(current_chunk.strip())
                yield {
                    "text": current_chunk.strip(),
                    "audio": base64.b64encode(audio_bytes).decode('utf-8'),
                    "chunk_id": chunk_count
                }
            except Exception as e:
                print(f"Error processing final chunk: {e}")
                yield {
                    "text": current_chunk.strip(),
                    "audio": "",
                    "chunk_id": chunk_count
                }
            
    except Exception as e:
        print(f"Error in GPT-4o streaming: {e}")
        yield {
            "error": f"Streaming error: {str(e)}",
            "text": "",
            "audio": "",
            "chunk_id": 0
        }

async def text_to_speech(text: str) -> bytes:
    client = AsyncOpenAI(api_key=apikey)
    
    try:
        # Add timeout to prevent hanging
        response = await asyncio.wait_for(
            client.audio.speech.create(
                model="tts-1",
                voice="alloy",
                input=text,
                response_format="mp3"
            ),
            timeout=10.0  # 10 second timeout
        )
        
        return response.content
        
    except asyncio.TimeoutError:
        print(f"TTS timeout for text: {text[:50]}...")
        return b""
    except Exception as e:
        print(f"Error in TTS conversion: {e}")
        return b""

async def process_audio_with_streaming_tts_fixed(transcript:str) -> AsyncGenerator[str, None]:
    """
    Fixed main function that processes audio input and returns streaming TTS response
    """
    try:
        async for chunk in stream_gpt4o_response_fixed(transcript):
            try:
                json_str = json.dumps(chunk, ensure_ascii=False)
                yield json_str + "\n"
            except Exception as e:
                print(f"JSON serialization error: {e}")
                yield json.dumps({"error": "JSON serialization failed"}) + "\n"
                
    except Exception as e:
        print(f"Error in main processing: {e}")
        yield json.dumps({"error": f"Processing error: {str(e)}"}) + "\n"


async def process_transcript_with_streaming_tts_fixed(transcript: str) -> AsyncGenerator[str, None]:
    """
    New function that processes transcript input directly and returns streaming TTS response
    """
    try:
        if not transcript:
            yield json.dumps({"error": "Empty transcript provided"}) + "\n"
            return
        
        # Stream GPT-4o response with TTS
        async for chunk in stream_gpt4o_response_fixed(transcript):
            # Ensure proper JSON formatting
            try:
                json_str = json.dumps(chunk, ensure_ascii=False)
                yield json_str + "\n"
            except Exception as e:
                print(f"JSON serialization error: {e}")
                yield json.dumps({"error": "JSON serialization failed"}) + "\n"
                
    except Exception as e:
        print(f"Error in transcript processing: {e}")
        yield json.dumps({"error": f"Processing error: {str(e)}"}) + "\n"
