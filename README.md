# Bulbul Friend - AI-powered Arabic-speaking Companion

## Project Overview
Bulbul Friend is an AI-powered Arabic-speaking companion designed for convenient conversation practice during daily activities like driving or chores. The system provides personalized learning with progress tracking and adaptive AI responses.

## Core Components
- **English Competency**: Assessment and tracking of English language skills
- **Arabic Competency**: Arabic language learning and practice
- **Tutor Persona**: AI personality designed for engaging conversation
- **Curriculum**: Structured learning content and progression

## Project Timeline
- **MVP Launch**: August 31st, 2024
- **Phase 1**: Backend Development (June 20th - July 5th)
- **Phase 2**: Integration and TTS (July 6th - July 20th)
- **Phase 3**: Fine-tuning and Content Development (July 21st - August 31st)

### Technical Stack
- **ASR**: Whisper or Web Speech API
- **Backend**: FastAPI or Flask
- **LLM**: Cohere LLM, Gemini (GCP), or GPT models
- **TTS**: Text-to-Speech integration
- **Cloud**: 24/7 deployment solution

## ASR (Automatic Speech Recognition) Setup

### Prerequisites
- Python 3.8 or higher
- Microphone access
- Internet connection (for downloading Whisper model)

### Installation
1. **Install the required packages:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Verify installation:**
   ```bash
   python test_asr.py
   ```

### API Endpoints

#### 1. Transcribe Uploaded Audio File
**POST** `/api/transcribe-voice`

Upload an audio file (WAV, MP3, etc.) to get it transcribed.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Audio file

**Response:**
```json
{
  "transcription": "Hello, how are you?",
  "language": "en",
  "timestamp": "2024-01-01T12:00:00",
  "confidence": 0.95
}
```

#### 2. Record and Transcribe (Testing)
**POST** `/api/record-and-transcribe`

Record audio from microphone and transcribe it (for testing purposes).

**Parameters:**
- `duration`: Recording duration in seconds (default: 5)
- `sample_rate`: Audio sample rate (default: 16000)

### Usage Examples

#### Using curl to test file upload:
```bash
curl -X POST "http://localhost:8000/api/transcribe-voice" \
     -H "Content-Type: multipart/form-data" \
     -F "audio_file=@your_audio_file.wav"
```

#### Using curl to test recording:
```bash
curl -X POST "http://localhost:8000/api/record-and-transcribe?duration=3"
```

#### Frontend Integration Example:
```javascript
// Example frontend integration
const transcribeAudio = async (audioFile) => {
  const formData = new FormData();
  formData.append('audio_file', audioFile);
  
  const response = await fetch('/api/transcribe-voice', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  // Send transcribed text to chat
  const chatResponse = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: result.transcription,
      language: result.language
    })
  });
  
  return await chatResponse.json();
};
```

### Troubleshooting

#### Common Issues:

1. **"No module named 'whisper'"**
   - Run: `pip install openai-whisper`

2. **"No module named 'sounddevice'"**
   - Run: `pip install sounddevice`

3. **Audio recording fails**
   - Check microphone permissions
   - Ensure microphone is not being used by another application

4. **Whisper model download fails**
   - Check internet connection
   - Try downloading manually: `whisper --model base`

#### Testing:
Run the test script to verify everything works:
```bash
python test_asr.py
```

### Notes
- The Whisper model is loaded once when the server starts
- Audio files are temporarily saved and then deleted after transcription
- The system supports multiple languages automatically
- For production, consider using a larger Whisper model for better accuracy

## Development Phases

### Phase 1 (Current)
1. **Backend Development** (2 weeks - July 5th)
   - FastAPI/Flask backend setup
   - Platform research and framework selection
   - Frontend development foundation

2. **ASR Implementation** (10 days - June 30th)
   - Whisper integration
   - Speech recognition setup

3. **LLM Integration** (2 weeks - July 5th)
   - Cohere LLM research and implementation
   - Gemini/GPT model evaluation
   - Tarjama translation integration

### Phase 2
4. **TTS Implementation**
5. **System Integration**

### Phase 3
6. **Fine-tuning with Bulbul materials**
7. **Content development**

## Future Features
- Transcribing Arabic to different languages
- Advanced RAG implementation
- Custom data model development

## Project Management
- **GitHub**: Source code repository
- **Jira**: Project management and task tracking
- **Documentation**: Comprehensive handover from Rafay

## Cost Analysis
- 2-year projection for 2000 users
- 5 platform cost analysis
- Cloud computing considerations for 24/7 operation 