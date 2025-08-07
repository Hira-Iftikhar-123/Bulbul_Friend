# Streaming TTS with GPT-4o

This implementation provides streaming text-to-speech functionality using GPT-4o for text generation and OpenAI's TTS API for audio synthesis.

## Overview

The system processes audio input through the following pipeline:
1. **Audio Transcription**: Converts audio to text using OpenAI Whisper
2. **GPT-4o Streaming**: Streams response from GPT-4o in real-time
3. **TTS Conversion**: Converts each text chunk to audio using OpenAI TTS
4. **Streaming Response**: Returns both text and audio chunks as they're generated

## Files

### Core Implementation
- `openai_streaming_tts.py` - Basic streaming implementation
- `openai_streaming_tts_optimized.py` - Optimized version with better chunking and batching

### API Endpoints
- `/api/streaming-tts` - Basic streaming endpoint
- `/api/streaming-tts-optimized` - Optimized streaming endpoint

### Test Files
- `test_streaming_tts.py` - Basic test script
- `test_streaming_tts_comprehensive.py` - Comprehensive testing with audio saving

## API Usage

### Endpoint: `/api/streaming-tts`

**Method**: POST  
**Content-Type**: multipart/form-data

**Request**:
```bash
curl -X POST "http://localhost:8000/api/streaming-tts" \
  -F "audio=@your_audio_file.mp3"
```

**Response Format**:
```json
{"text": "Hello, how are you?", "audio": "base64_encoded_audio_data", "chunk_id": 0}
{"text": "I'm here to help you learn Arabic.", "audio": "base64_encoded_audio_data", "chunk_id": 1}
```

### Endpoint: `/api/streaming-tts-optimized`

Same interface as above but with improved performance through:
- Better chunking logic for Arabic text
- Batched TTS processing
- Optimized natural break detection

## Features

### 1. Smart Chunking
- Detects natural break points (sentences, phrases)
- Handles Arabic punctuation (، ؛)
- Considers Arabic sentence endings
- Minimum chunk length to avoid too small audio files

### 2. Batching
- Processes multiple text chunks in parallel
- Reduces API latency
- Better error handling for individual chunks

### 3. Error Handling
- Graceful handling of TTS failures
- Continues processing even if some chunks fail
- Detailed error logging

## Testing

### Basic Test
```bash
python test_streaming_tts.py
```

### Comprehensive Test
```bash
python test_streaming_tts_comprehensive.py
```

This will:
- Test both endpoints
- Save audio chunks to timestamped directories
- Compare performance and output

## Configuration

### Environment Variables
Make sure your `.env.local` file contains:
```
OPENAI_API_KEY=your_openai_api_key_here
```

### Dependencies
Install required packages:
```bash
pip install -r requirements.txt
```

## Performance Considerations

### Optimized vs Regular
- **Regular**: Processes each chunk individually
- **Optimized**: Batches chunks for better performance

### Chunking Strategy
- Breaks on punctuation marks
- Considers Arabic text patterns
- Minimum 50 characters per chunk
- Maximum 3 chunks per batch

### TTS Settings
- Model: `tts-1`
- Voice: `alloy`
- Format: `mp3`
- Sample rate: 16kHz (converted from input)

## Client Integration

### JavaScript Example
```javascript
const formData = new FormData();
formData.append('audio', audioFile);

const response = await fetch('/api/streaming-tts-optimized', {
  method: 'POST',
  body: formData
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.trim()) {
      const data = JSON.parse(line);
      // Process text and audio data
      console.log('Text:', data.text);
      console.log('Audio length:', data.audio.length);
      
      // Convert base64 audio to playable format
      const audioBlob = new Blob([
        Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
      ], { type: 'audio/mp3' });
      
      // Play audio
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
    }
  }
}
```

### Python Example
```python
import httpx
import json
import base64

async def process_audio_streaming(audio_file_path):
    url = "http://localhost:8000/api/streaming-tts-optimized"
    
    with open(audio_file_path, "rb") as f:
        files = {"audio": f}
        
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", url, files=files) as response:
                for line in response.aiter_text():
                    if line.strip():
                        data = json.loads(line)
                        print(f"Text: {data['text']}")
                        
                        # Save audio chunk
                        audio_bytes = base64.b64decode(data['audio'])
                        with open(f"chunk_{data['chunk_id']}.mp3", "wb") as f:
                            f.write(audio_bytes)
```