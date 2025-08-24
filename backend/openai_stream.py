from dotenv import load_dotenv
from fastapi import UploadFile
from openai import OpenAI
import os
import subprocess
import tempfile
from io import BytesIO

load_dotenv('.env.local')
apikey = os.getenv('OPENAI_API_KEY')

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

async def OpenAIAudio(file: UploadFile):
    """
    Processes an audio file by converting it to MP3 and sending it to OpenAI's Whisper API
    for transcription.
    """
    client = OpenAI(api_key=apikey)
    audio_data = await file.read()

    if len(audio_data) < 100:  
        raise RuntimeError("Audio file too small, likely corrupted or empty")

    try:
        mp3_data = convert_to_mp3_bytes(audio_data)

        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
            temp_file.write(mp3_data)
            temp_file_path = temp_file.name

        try:
            with open(temp_file_path, 'rb') as audio_file:
                response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="json"
                )
            return response.text
        finally:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    except Exception as e:
        print(f"An error occurred during audio processing: {e}")
        raise RuntimeError(f"Failed to process audio. Error: {e}")