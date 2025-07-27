import google.generativeai as genai
from models import ChatRequest, ChatResponse
from datetime import datetime
import re
from typing import List

API_KEY = "AIzaSyAXyPvVUS6_nAPC0rzRpYTRz69W9mK7HWs"
genai.configure(api_key=API_KEY) # type: ignore

model = genai.GenerativeModel(model_name="models/gemini-2.0-flash") # type: ignore

def postprocess_response(response:str) -> str:
    response = response.strip()
    if not response:
        return "Sorry, I didn't understand that."
    
    response = re.sub(r'e \*', r'*', response) # Fix the artifact
    if response.endswith('.'):
        response = response[:-1]
        return response
    if not response.endswith(('?','!','.')):
        response += '.'
    return response

def query_gemini(prompt: ChatRequest, history: list[dict]) -> ChatResponse:
    try:
        chat_history = history + [{"role":"user", "parts":prompt.message}]
        response = model.generate_content(prompt.message)
        processed_response = postprocess_response(response.text)
        return ChatResponse(
            response=processed_response,
            language=prompt.language,
            timestamp=datetime.utcnow().isoformat()
        )
    except Exception as e:
        print(history)
        return ChatResponse(
            response=f"error {e}",
            language=prompt.language,
            timestamp=datetime.utcnow().isoformat()
        )

# if __name__ == "__main__":
#     sample_prompt = "how many arabic dialects are there?"
#     print("User Prompt:", sample_prompt)
#     print("Gemini Response:\n", query_gemini(sample_prompt))
#     sample_prompt = "give a sentence in khaleej dialect?"
#     print("User Prompt:", sample_prompt)
#     response =  query_gemini(sample_prompt)
#     print("Raw Response:\n", response)
#     response = postprocess_response(response)
#     print("Gemini Response:\n", response)
#     sample_prompt = "hello in arabic"
#     print("User Prompt:", sample_prompt)
#     print("Gemini Response:\n", query_gemini(sample_prompt))

