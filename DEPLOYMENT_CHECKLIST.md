# 🚀 Railway Deployment Checklist

## 📋 Pre-Deployment Checklist

### ✅ Codebase Ready
- [x] Backend `railway.json` configured
- [x] Frontend `railway.json` configured  
- [x] CORS settings updated for production
- [x] Environment variables configured
- [x] Build commands specified
- [x] Start commands specified

### 🔑 Required API Keys
- [ ] OpenAI API Key
- [ ] Google API Key (for Gemini)
- [ ] Any other service API keys

## 🎯 Deployment Order: Backend First!

### Step 1: Deploy Backend Service

1. **Go to Railway Dashboard**
   - Visit https://railway.app
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository: `Hira-Iftikhar-123/Bulbul_Friend`

3. **Configure Backend Service**
   - **Source Directory**: `backend` (IMPORTANT!)
   - Railway will auto-detect `railway.json`

4. **Set Environment Variables**
   Go to Variables tab and add:
   ```
   ENVIRONMENT=production
   PORT=8000
   OPENAI_API_KEY=your_actual_openai_key
   ```

5. **Deploy Backend**
   - Click "Deploy"
   - Wait for build to complete
   - Copy the generated URL (e.g., `https://your-backend.up.railway.app`)

6. **Test Backend**
   - Visit: `https://your-backend.up.railway.app/health`
   - Should return: `{"status": "healthy", "timestamp": "..."}`

### Step 2: Deploy Frontend Service

1. **Create Another Service**
   - In the same project, click "New Service"
   - Select "Deploy from GitHub repo"
   - Choose the same repository

2. **Configure Frontend Service**
   - **Source Directory**: `frontend` (IMPORTANT!)
   - Railway will auto-detect `railway.json`

3. **Set Environment Variables**
   ```
   REACT_APP_API_URL=https://your-backend.up.railway.app
   NODE_ENV=production
   PORT=3000
   ```
   **Replace** `your-backend.up.railway.app` with your actual backend URL!

4. **Deploy Frontend**
   - Click "Deploy"
   - Wait for build to complete
   - Copy the generated URL (e.g., `https://your-frontend.up.railway.app`)

### Step 3: Final Configuration

1. **Update Backend CORS**
   In your backend service Variables tab, add:
   ```
   RAILWAY_STATIC_URL=https://your-frontend.up.railway.app
   ```
   **Replace** with your actual frontend URL!

2. **Test Complete Flow**
   - Visit your frontend URL
   - Test audio recording
   - Test chat functionality
   - Verify all API calls work

## 🔧 Railway Configuration Files

### Backend (`backend/railway.json`)
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health"
  }
}
```

### Frontend (`frontend/railway.json`)
```json
{
  "build": {
    "builder": "NIXPACKS", 
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm run serve",
    "healthcheckPath": "/"
  }
}
```

## 🌍 Environment Variables Summary

### Backend Required:
- `ENVIRONMENT=production`
- `PORT=8000`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `GEMINI_API_KEY`
- `SECRET_KEY`

### Frontend Required:
- `REACT_APP_API_URL` (your backend Railway URL)
- `NODE_ENV=production`
- `PORT=3000`

### Backend Optional:
- `RAILWAY_STATIC_URL` (your frontend Railway URL)

## 🚨 Common Issues & Solutions

### Build Failures
- **Backend**: Check `requirements.txt` dependencies
- **Frontend**: Check `package.json` dependencies

### CORS Errors
- Ensure `RAILWAY_STATIC_URL` is set in backend
- Check URLs match exactly (including https://)

### Port Binding Issues
- Both services use `$PORT` environment variable
- Railway automatically sets this

### API Connection Errors
- Verify `REACT_APP_API_URL` is correct
- Check backend is running and accessible

## 📱 Testing After Deployment

1. **Backend Health Check**
   - `https://your-backend.up.railway.app/health`

2. **Frontend Load Test**
   - `https://your-frontend.up.railway.app/`

3. **API Integration Test**
   - Test chat functionality
   - Test audio recording
   - Test streaming TTS

## 🎉 Success Indicators

- ✅ Both services show "Deployed" status
- ✅ Health checks return success
- ✅ Frontend loads without errors
- ✅ API calls work correctly
- ✅ CORS errors are resolved
- ✅ Audio recording works
- ✅ Chat functionality works

## 📞 Need Help?

- Check Railway logs for errors
- Verify environment variables are set
- Ensure source directories are correct
- Test locally before deploying
