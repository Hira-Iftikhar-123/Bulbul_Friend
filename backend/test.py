import httpx

with httpx.stream("POST", "http://localhost:8000/api/gemini-process", files={"audio": ("audio_input.mp3", open("audio_input.mp3", "rb"), "audio/mp3")}) as response:
    for line in response.iter_text():
        print(line)
