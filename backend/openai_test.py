# backend/services/audio_processor.py
from langchain_openai import ChatOpenAI
import base64
import os
from dotenv import load_dotenv


def process_audio_with_llm(audio_data: bytes) -> bytes:
    instruction="respond like you are an arabic instructor helping your student learn through dialogues"
    audio_b64 = base64.b64encode(audio_data).decode()

    load_dotenv('.env.local') 
    api_key = os.getenv('OPENAI_API_KEY')

    llm=ChatOpenAI(
        model='gpt-4o-audio-preview',
        temperature=0,
        model_kwargs={
        "modalities":["text", "audio"],
        "audio":{"voice":"alloy", "format":"mp3"}
        }
    )

    messages = [
        (
            "human",
            [
                {"type": "input_audio", "input_audio": {"data": audio_b64, "format": "mp3"}},
            ],
        )
    ]
    output_message = llm.invoke(messages)  # type: ignore
    
    if 'audio' not in output_message.additional_kwargs:
        raise ValueError("No audio response generated")
    
    return base64.b64decode(output_message.additional_kwargs['audio']['data'])