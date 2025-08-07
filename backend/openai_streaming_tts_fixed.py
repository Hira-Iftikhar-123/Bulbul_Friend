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
    """
    Fixed streaming GPT-4o response with proper error handling
    """
    client = AsyncOpenAI(api_key=apikey)
    
    instruction = "respond like you are an arabic instructor helping your student learn through dialogues"
    
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
    """
    Converts text to speech using OpenAI TTS API with timeout
    """
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

async def process_audio_with_streaming_tts_fixed(audio_data: bytes) -> AsyncGenerator[str, None]:
    """
    Fixed main function that processes audio input and returns streaming TTS response
    """
    try:
        # First, transcribe the audio
        transcript = await transcribe_audio(audio_data)
        
        if not transcript:
            yield json.dumps({"error": "Could not transcribe audio"}) + "\n"
            return
        
        # Then stream GPT-4o response with TTS
        async for chunk in stream_gpt4o_response_fixed(transcript):
            # Ensure proper JSON formatting
            try:
                json_str = json.dumps(chunk, ensure_ascii=False)
                yield json_str + "\n"
            except Exception as e:
                print(f"JSON serialization error: {e}")
                yield json.dumps({"error": "JSON serialization failed"}) + "\n"
                
    except Exception as e:
        print(f"Error in main processing: {e}")
        yield json.dumps({"error": f"Processing error: {str(e)}"}) + "\n"

async def transcribe_audio(audio_data: bytes) -> str:
    """
    Transcribes audio using OpenAI Whisper API with timeout
    """
    client = AsyncOpenAI(api_key=apikey)
    
    try:
        # Convert to MP3 if needed
        mp3_data = convert_to_mp3_bytes(audio_data)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
            temp_file.write(mp3_data)
            temp_file_path = temp_file.name
        
        try:
            with open(temp_file_path, 'rb') as audio_file:
                response = await asyncio.wait_for(
                    client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="json"
                    ),
                    timeout=30.0  # 30 second timeout
                )
            return response.text
        finally:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except asyncio.TimeoutError:
        print("Transcription timeout")
        return ""
    except Exception as e:
        print(f"Error in transcription: {e}")
        return ""

def convert_to_mp3_bytes(data: bytes) -> bytes:
    """Converts audio data to MP3 format using ffmpeg."""
    try:
        process = subprocess.Popen(
            ['ffmpeg', '-i', 'pipe:0', '-ar', '16000', '-ac', '1', '-f', 'mp3', 'pipe:1'],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        mp3_bytes, stderr = process.communicate(input=data)
        if process.returncode != 0:
            raise RuntimeError(f"ffmpeg error: {stderr.decode()}")
        return mp3_bytes
    except FileNotFoundError:
        raise RuntimeError("ffmpeg not found. Please install ffmpeg and ensure it's in your PATH.") 