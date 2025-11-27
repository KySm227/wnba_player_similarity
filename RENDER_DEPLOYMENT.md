# Render Deployment Guide

## Important Settings for Render

When deploying to Render, make sure to configure these settings in the Render dashboard:

### Service Settings

1. **Root Directory**: Leave this **EMPTY** (or set to `/`). Do NOT set it to `src` or any subdirectory.

2. **Build Command**: 
   ```
   npm install
   ```

3. **Start Command**: 
   ```
   node API/server.js
   ```

4. **Environment Variables**:
   - `DATABASE_URL`: Your MongoDB connection string
   - `NODE_ENV`: `production` (optional, but recommended)
   - `PORT`: Leave this empty - Render will automatically assign a port

### Why the Error Occurred

The error `/opt/render/project/src/API/API/server.js` suggests:
- Render might have the Root Directory set to `src`
- Or it's looking in a build output directory

**Solution**: Make sure Root Directory is empty/blank in Render dashboard settings.

### Verifying the Setup

After deployment, test the health endpoint:
```
https://your-service.onrender.com/api/test
```

This should return JSON with player count if everything is working.

