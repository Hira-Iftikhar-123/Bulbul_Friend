# Railway Frontend Deployment Guide

## Prerequisites
- Railway account (https://railway.app)
- Git repository with your frontend code
- Backend service already deployed on Railway

## Deployment Steps

### 1. Connect Repository
1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the `frontend` folder as the source

### 2. Configure Build Settings
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run serve`

### 3. Set Environment Variables
In Railway dashboard, go to Variables tab and set:

#### Required Variables:
```
REACT_APP_API_URL=https://your-backend-service.up.railway.app
NODE_ENV=production
PORT=3000
```

**Important**: Replace `your-backend-service.up.railway.app` with your actual backend Railway service URL.

#### Optional Variables:
```
REACT_APP_GA_TRACKING_ID=your_ga_tracking_id_here
REACT_APP_SENTRY_DSN=your_sentry_dsn_here
```

### 4. Deploy
1. Railway will automatically build and deploy
2. Monitor the build logs for any errors
3. Check that the app loads correctly

### 5. Get Your Frontend URL
- Copy the generated Railway URL (e.g., `https://your-frontend-service.up.railway.app`)
- Update your backend's `RAILWAY_STATIC_URL` environment variable with this URL

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REACT_APP_API_URL` | Backend API URL | Yes | `http://localhost:8000` |
| `NODE_ENV` | Environment mode | Yes | `production` |
| `PORT` | Server port | Yes | `3000` |
| `REACT_APP_GA_TRACKING_ID` | Google Analytics ID | No | - |
| `REACT_APP_SENTRY_DSN` | Sentry DSN | No | - |

## Build Process

The frontend build process:
1. Installs dependencies (`npm install`)
2. Builds production bundle (`npm run build`)
3. Serves static files (`npm run serve`)

## Troubleshooting

### Common Issues:
1. **Build failures**: Check that all dependencies are properly specified
2. **API connection errors**: Verify `REACT_APP_API_URL` is correct
3. **CORS errors**: Ensure backend has correct CORS configuration
4. **Port binding**: Frontend uses `$PORT` environment variable

### Health Check:
- Endpoint: `/`
- Should serve the React app

## Post-Deployment

After successful deployment:
1. Test all API endpoints work correctly
2. Verify CORS is working between frontend and backend
3. Update backend's `RAILWAY_STATIC_URL` if needed
4. Test the complete user flow
