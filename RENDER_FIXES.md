# Render Deployment Fixes

## Issues Fixed

### 1. "Invalid Host header" Error (Frontend)

**Problem:** React development server shows "Invalid Host header" when accessed via Render's domain.

**Solution:** 
- Use the production build, not the dev server
- The `server-frontend.js` serves the built React app
- Make sure `buildCommand` includes `npm run build`

**Configuration in render.yaml:**
```yaml
buildCommand: npm install && npm run build
startCommand: node server-frontend.js
```

### 2. "Cannot GET" Error (Backend)

**Problem:** Accessing the root URL of the backend returns "Cannot GET /"

**Solution:**
- Added a root route (`/`) to the backend server
- Returns a JSON message indicating it's the API server

### 3. Frontend Not Building

**Important:** Make sure the frontend service:
1. Has `REACT_APP_API_URL` environment variable set to your backend URL
2. Builds successfully with `npm run build`
3. Serves from the `build` folder using `server-frontend.js`

## Environment Variables Needed

### Backend Service:
- `DATABASE_URL`: Your MongoDB connection string
- `NODE_ENV`: `production`

### Frontend Service:
- `REACT_APP_API_URL`: `https://your-backend-service.onrender.com/api`
- `NODE_ENV`: `production`

## Testing After Deployment

1. **Backend:** Visit `https://your-backend.onrender.com/api/test`
   - Should return JSON with player count

2. **Backend Root:** Visit `https://your-backend.onrender.com/`
   - Should return: `{"message": "WNBA Player Similarity API Server", "status": "running"}`

3. **Frontend:** Visit `https://your-frontend.onrender.com`
   - Should show the React app
   - Should be able to search for players
   - Should connect to backend API

## Troubleshooting

**If frontend still shows "Invalid Host header":**
- Make sure you're using `server-frontend.js`, not `react-scripts start`
- Verify the build folder exists after build completes
- Check Render logs for build errors

**If backend shows "Cannot GET":**
- The root route has been added, so this should be fixed
- All API routes should work at `/api/*`

