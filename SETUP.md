# Bulbul Friend - Basic Setup

This is a basic setup for the Bulbul Friend AI-powered Arabic learning companion.

## Backend Setup (FastAPI)

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Run the backend server:
```bash
python main.py
```

The backend will be available at: http://localhost:8000
API documentation: http://localhost:8000/docs

## Frontend Setup (React)

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at: http://localhost:3000

## Current Features

### Backend
- Basic FastAPI server
- Health check endpoint (`/health`)
- Simple chat endpoint (`/api/chat`)
- User info endpoint (`/api/user`)

### Frontend
- Home page with landing content
- Simple chat interface
- Language switching (Arabic/English)
- Custom CSS styling (no Tailwind dependencies)

## File Structure

```
bulbul-friend/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── requirements.txt     # Python dependencies
│   └── env.example         # Environment variables template
├── frontend/
│   ├── public/
│   │   └── index.html      # Main HTML file
│   ├── src/
│   │   ├── App.js          # Main React component
│   │   ├── index.js        # React entry point
│   │   ├── index.css       # Custom CSS styles
│   │   ├── services/
│   │   │   └── api.js      # API service functions
│   │   └── pages/
│   │       ├── Home.js     # Landing page
│   │       └── Chat.js     # Chat interface
│   └── package.json        # Node.js dependencies
├── README.md               # Project overview
└── SETUP.md               # This file
```

## Next Steps

Once the basic setup is working, you can:

1. **Add LLM Integration**: Connect with OpenAI, Cohere, or Gemini APIs
2. **Add ASR**: Implement speech-to-text with Whisper or Google Speech API
3. **Add TTS**: Implement text-to-speech functionality
4. **Add Authentication**: User registration and login
5. **Add Database**: Store user data and conversation history
6. **Add Voice Features**: Real-time voice recording and playback

## API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check
- `POST /api/chat` - Send message to Bulbul
- `GET /api/user` - Get user information

## Testing the Chat

1. Start both backend and frontend servers
2. Go to http://localhost:3000
3. Click "Start Chatting"
4. Type a message and see Bulbul's response

The current implementation returns a simple welcome message in Arabic or English based on the selected language.

## Troubleshooting

### Frontend Issues
If you encounter dependency issues with npm:
1. Delete `node_modules` folder and `package-lock.json`
2. Run `npm install` again
3. If issues persist, try `npm cache clean --force`

### Backend Issues
If you encounter Python dependency issues:
1. Delete the virtual environment
2. Create a new one: `python -m venv venv`
3. Activate and install dependencies again

## Dependencies

### Backend
- FastAPI 0.104.1
- Uvicorn 0.24.0
- Pydantic 2.5.0
- Python-dotenv 1.0.0

### Frontend
- React 18.2.0
- React Router DOM 6.3.0
- Axios 1.4.0
- React Scripts 5.0.1 