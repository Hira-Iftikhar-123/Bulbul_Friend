# Railway Backend Deployment Guide

## Prerequisites
- Railway account (https://railway.app)
- Git repository with your backend code

## Deployment Steps

### 1. Connect Repository
1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the `backend` folder as the source

### 2. Configure Build Settings
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 3. Set Environment Variables
In Railway dashboard, go to Variables tab and set:

#### Required Variables:
```
ENVIRONMENT=production
PORT=8000
```

#### API Keys:
```
OPENAI_API_KEY=your_actual_openai_key
GOOGLE_API_KEY=your_actual_google_key
GEMINI_API_KEY=your_actual_gemini_key
```

#### Optional Variables:
```
RAILWAY_STATIC_URL=https://your-frontend-service.up.railway.app
SECRET_KEY=your_secret_key_here
```

### 4. Deploy
1. Railway will automatically build and deploy
2. Monitor the build logs for any errors
3. Check the health endpoint: `https://your-service.up.railway.app/health`

### 5. Get Your Backend URL
- Copy the generated Railway URL (e.g., `https://your-backend-service.up.railway.app`)
- Use this URL in your frontend environment configuration

## Troubleshooting

### Common Issues:
1. **Port binding**: Ensure using `$PORT` environment variable
2. **CORS errors**: Check that `RAILWAY_STATIC_URL` is set correctly
3. **Missing dependencies**: Verify all packages in `requirements.txt`

### Health Check:
- Endpoint: `/health`
- Should return: `{"status": "healthy", "timestamp": "..."}`

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ENVIRONMENT` | Environment mode | Yes | `production` |
| `PORT` | Server port | Yes | `8000` |
| `OPENAI_API_KEY` | OpenAI API key | Yes | - |
| `GOOGLE_API_KEY` | Google API key | Yes | - |
| `GEMINI_API_KEY` | Gemini API key | Yes | - |
| `RAILWAY_STATIC_URL` | Frontend URL for CORS | No | - |
| `SECRET_KEY` | JWT secret key | No | - |
