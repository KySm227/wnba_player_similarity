# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Prerequisites

Before running this application, you need to install the following:

### Required Software

1. **Node.js** (v14 or higher) and **npm**

   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version` and `npm --version`

2. **Python** (v3.9 or higher)

   - Download from [python.org](https://www.python.org/)
   - Verify installation: `python3 --version`

3. **MongoDB**
   - Download from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Or use MongoDB Atlas (cloud): [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

### Installing Dependencies

1. **Install Node.js dependencies:**

   ```bash
   npm install
   ```

   This will install all frontend and backend dependencies including:

   - React and React DOM
   - Express.js (backend server)
   - MongoDB driver
   - CORS and other middleware

2. **Install Python dependencies:**

   ```bash
   pip3 install beautifulsoup4 requests pymongo pandas numpy scikit-learn pillow python-dotenv
   ```

   Or create a `requirements.txt` file and install:

   ```bash
   pip3 install -r requirements.txt
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```
   DATABASE_URL=your_mongodb_connection_string
   ```

## Web Scraping Basketball-Reference

This project scrapes player statistics from [Basketball-Reference.com](https://www.basketball-reference.com/wnba/). The scraping is done using Python with the following approach:

### Scraping Process

1. **Player Links**: The project uses a `links.py` file containing a dictionary of player names mapped to their Basketball-Reference URLs (e.g., `"Player Name": "https://www.basketball-reference.com/wnba/players/..."`).

2. **Data Extraction**: The `API.py` script:

   - Uses `requests` to fetch HTML pages from Basketball-Reference
   - Uses `BeautifulSoup` to parse HTML and extract data from HTML comments (where some tables are stored)
   - Extracts multiple stat categories:
     - **Per Game Stats**: Basic statistics per game
     - **Per 100 Possessions**: Pace-adjusted statistics
     - **Advanced Stats**: Advanced metrics (PER, TS%, etc.)
     - **Shooting Stats**: Shooting percentages by distance
     - **Play-by-Play Stats**: On/off court statistics
   - Uses `pandas` to convert HTML tables to DataFrames for easier processing
   - Organizes stats by player age (season)

3. **Data Storage**:

   - Player statistics are stored in MongoDB with age as keys
   - Each age contains nested stat categories (per_game, advanced, etc.)
   - The script checks if a player already exists before inserting to avoid duplicates

4. **Image Scraping**:
   - The `transparent.py` script downloads player headshots from Basketball-Reference
   - Extracts player IDs from URLs in `player_links`
   - Downloads images and processes them to make backgrounds transparent
   - Saves processed images to `API/Image/` directory

### Important Notes

- The scraping script includes:

  - **Rate limiting**: 10-second delays between insertions to be respectful to the server
  - **User-Agent rotation**: Random user agents to avoid being blocked
  - **Error handling**: Checks for existing players and handles missing data gracefully

- **Ethical Scraping**: Always respect website terms of service and robots.txt. Consider using official APIs when available.

## Running the Application

This application requires both the frontend React app and the backend server to be running simultaneously.

### Start the Backend Server

First, start the backend server:

```bash
npm run server
```

The server will run on port 5001 by default and connect to your MongoDB database. Make sure you have:

- MongoDB running and accessible
- A `.env` file with your `DATABASE_URL` configured

### Start the Frontend

In a separate terminal, start the React development server:

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000) and will automatically connect to the backend server running on port 5001.

**Note:** Both servers must be running for the application to work properly. The frontend will display an error if it cannot connect to the backend server.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
