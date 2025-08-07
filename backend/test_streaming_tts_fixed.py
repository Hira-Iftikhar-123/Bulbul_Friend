import httpx
import json
import base64
import asyncio
import time

async def test_streaming_tts_fixed():
    """
    Test the fixed streaming TTS endpoint
    """
    url = "http://localhost:8000/api/streaming-tts-fixed"
    
    try:
        print("Starting fixed streaming TTS test...")
        print("=" * 50)
        
        # Check if audio file exists
        try:
            with open("audio_input.mp3", "rb") as audio_file:
                audio_data = audio_file.read()
                print(f"Audio file loaded: {len(audio_data)} bytes")
        except Exception as e:
            print(f"Error loading audio file: {e}")
            return
        
        # Create files for upload
        files = {"audio": ("audio_input.mp3", audio_data, "audio/mp3")}
        
        # Set timeout for the request
        timeout = httpx.Timeout(60.0, connect=10.0)
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            print(f"Sending POST request to {url}...")
            start_time = time.time()
            
            try:
                async with client.stream("POST", url, files=files) as response:
                    print(f"Response status: {response.status_code}")
                    print(f"Response headers: {dict(response.headers)}")
                    
                    if response.status_code != 200:
                        error_text = await response.aread()
                        print(f"Error response: {error_text}")
                        return
                    
                    chunk_count = 0
                    error_count = 0
                    buffer = ""
                    async for chunk in response.aiter_text():
                        buffer += chunk
                        while "\n" in buffer:
                            line, buffer = buffer.split("\n", 1)
                            if line.strip():
                                try:
                                    data = json.loads(line)
                                    if "error" in data:
                                        print(f"Error: {data['error']}")
                                        error_count += 1
                                        continue
                                    chunk_count += 1
                                    print(f"Chunk {data.get('chunk_id', chunk_count)}:")
                                    print(f"Text: {data['text']}")
                                    print(f"Audio length: {len(data['audio'])} base64 chars")
                                    print("-" * 30)
                                except Exception as e:
                                    print(f"Failed to parse JSON: {e}")
                                    print(f"Raw line: {line[:100]}...")
                                    error_count += 1
                    print(f"Total chunks received: {chunk_count}")
                    print(f"Total errors: {error_count}")
                    print(f"Total time: {time.time() - start_time:.2f} seconds")
            except httpx.TimeoutException:
                print("Request timed out")
            except httpx.RequestError as e:
                print(f"Request error: {e}")
            except Exception as e:
                print(f"Unexpected error during streaming: {e}")
    except Exception as e:
        print(f"Error testing fixed streaming TTS: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_streaming_tts_fixed()) 