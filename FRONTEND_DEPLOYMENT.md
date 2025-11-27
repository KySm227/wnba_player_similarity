# Frontend Deployment on Render

## Setup Instructions

### 1. Deploy Backend First

Make sure your backend service is deployed and running on Render. Note the URL (e.g., `https://wnba-player-similarity-backend.onrender.com`).

### 2. Update Environment Variables

In the `render.yaml` file, update the `REACT_APP_API_URL` value to match your actual backend service URL:

```yaml
- key: REACT_APP_API_URL
  sync: false
  value: https://YOUR-BACKEND-SERVICE-NAME.onrender.com/api
```

Replace `YOUR-BACKEND-SERVICE-NAME` with your actual backend service name from Render.

### 3. Deploy Frontend Service

#### Option A: Using render.yaml (Recommended)

1. Push your code to GitHub
2. In Render dashboard, click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and create both services

#### Option B: Manual Setup

1. In Render dashboard, click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `wnba-player-similarity-frontend`
   - **Root Directory**: Leave empty (or `/`)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server-frontend.js`
   - **Environment Variables**:
     - `REACT_APP_API_URL`: `https://YOUR-BACKEND-SERVICE-NAME.onrender.com/api`
     - `NODE_ENV`: `production`

### 4. Important Notes

- The frontend service will build the React app and serve it using Express
- Make sure your backend service URL is correct in the environment variables
- The frontend will be available at the URL Render provides (e.g., `https://wnba-player-similarity-frontend.onrender.com`)

### 5. Troubleshooting

**Frontend can't connect to backend:**
- Check that `REACT_APP_API_URL` is set correctly
- Verify the backend service is running
- Check CORS settings in `API/server.js` (should allow your frontend domain)

**Build fails:**
- Make sure all dependencies are in `package.json`
- Check that `react-scripts` is installed
- Review build logs in Render dashboard

**Static files not loading:**
- Verify `build` folder is created after `npm run build`
- Check that `server-frontend.js` is serving from the correct path

