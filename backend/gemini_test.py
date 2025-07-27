from google import genai
import dotenv
import os

def gemini_response(tmp_path:str) -> str | None:
    dotenv.load_dotenv('.env.local')
    API_KEY = os.getenv('GOOGLE_API_KEY')
    client = genai.Client(api_key=API_KEY)
    MODEL_ID = 'gemini-2.5-flash'

    audio_file=client.files.upload(file=tmp_path)

    response=client.models.generate_content(
        model=MODEL_ID,
        contents=[
            "respond to this audio like you are an arabic tutor",
            audio_file
        ]
    )
    return response.text
