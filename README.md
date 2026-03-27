# WNBA Player Similarity

A tool to find WNBA players similar to a given player based on historical statistics and/or learned embeddings. This project includes a Python backend for data processing and similarity computation and a JavaScript frontend for an interactive UI. The app is hosted on Render and stores processed player data in MongoDB.

## Live demo
Hosted on Render — replace the placeholder with your render URL:
[https://<your-render-service>.onrender.com](https://wnbaedges.onrender.com/)

## Features
- Compute player similarity using configurable features or learned embeddings
- Interactive UI to search players and view the top-N similar players
- API endpoints for programmatic queries
- Scripts to preprocess WNBA data and update similarity indices
- MongoDB for persistent storage of raw/processed player data and indices
- Deployed to Render for zero-downtime hosting

## Tech stack
- Python (backend, data processing) — ~64%
- JavaScript (frontend) — ~26%
- MongoDB (data storage)
- CSS, HTML for styling and layout
- Typical libraries: pandas, scikit-learn, numpy, pymongo/motor, fastapi/flask, uvicorn/gunicorn (backend); React/Vue/vanilla JS (frontend)

## Quickstart

Prerequisites
- Python 3.9+
- Node.js 16+ (if there's a separate frontend)
- pip, npm
- Git
- MongoDB instance (local mongod or MongoDB Atlas)

Option A — Single Python app (e.g., FastAPI / Streamlit / Flask)
1. Clone the repo
   git clone https://github.com/KySm227/wnba_player_similarity.git
   cd wnba_player_similarity
2. Create and activate a virtual environment
   python -m venv .venv
   source .venv/bin/activate  # macOS/Linux
   .venv\Scripts\activate     # Windows
3. Install dependencies
   pip install -r requirements.txt
4. Configure environment variables (example `.env`):
   MONGODB_URI="mongodb+srv://<user>:<pass>@cluster0.mongodb.net/wnba?retryWrites=true&w=majority"
   SECRET_KEY="replace-with-secret"
   PORT=8000
   (Use a local URI for local development: mongodb://localhost:27017/wnba)
5. Run the app
   # FastAPI example
   uvicorn app.main:app --reload --port 8000
   # Streamlit example
   streamlit run app.py
6. Open http://localhost:8000 (or the port your app uses)

Option B — Python backend + JavaScript frontend
1. Backend
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
2. Frontend
   cd frontend
   npm ci
   npm run start
3. Visit the frontend URL (usually http://localhost:3000) and ensure it calls the backend API.

## MongoDB — Usage & Setup

Where data is stored
- MongoDB stores raw player data, processed stat vectors/embeddings, similarity indices, and optionally metadata (timestamps, source).
- Collections suggested:
  - players (one doc per player with metadata)
  - season_stats (season-level stats per player)
  - embeddings (precomputed embeddings or vectors)
  - similarity_cache (cached top-N results)

Connection
- Use a single environment variable for your connection string: MONGODB_URI.
- Example connection strings:
  - Local: mongodb://localhost:27017/wnba
  - Atlas: mongodb+srv://<username>:<password>@cluster0.xyz.mongodb.net/wnba?retryWrites=true&w=majority

Python example (pymongo):
```python
from pymongo import MongoClient
import os

uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/wnba")
client = MongoClient(uri)
db = client.get_default_database()  # or client["wnba"]
players = db["players"]
# find example
player = players.find_one({"name": "A'ja Wilson"})
```

Async example (motor + FastAPI):
```python
from motor.motor_asyncio import AsyncIOMotorClient
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
db = client.get_default_database()
```

Seeding data
- Provide a script (e.g., scripts/seed_db.py) that:
  - Reads CSVs or raw data in `data/`
  - Normalizes features and computes embeddings/stat vectors
  - Inserts documents into the collections above
- Example CLI:
  python scripts/seed_db.py --source data/wnba_players.csv --drop-existing

Indexes & performance
- Create indexes on frequently queried fields:
  - players: { name: 1 } (unique), { player_id: 1 }
  - embeddings: if using approximate search, maintain appropriate indexes
  - similarity_cache: { player_id: 1 }
- Consider embedding vectors stored in a vector DB or use approximate nearest neighbors libraries (FAISS, Annoy) for faster similarity. You can store precomputed neighbors in MongoDB if real-time performance is needed.

Backups & hosting
- For production use, prefer MongoDB Atlas or a managed cluster and enable automated backups and monitoring.
- Keep sensitive credentials out of the repository; use Render environment variables or a secrets manager.

## Example API usage
Assuming the backend exposes an endpoint like `/api/similar` which queries MongoDB-based indices:

Get top 5 similar players to "A'ja Wilson":
curl -G "http://localhost:8000/api/similar" --data-urlencode "player=A'ja Wilson" --data-urlencode "n=5"

Example JSON response:
{
  "player": "A'ja Wilson",
  "similar": [
    {"name": "Player A", "score": 0.93},
    {"name": "Player B", "score": 0.91}
  ]
}

## Data
- Keep raw and processed data in a `data/` directory (e.g., `data/wnba_players.csv`, `data/season_stats.csv`).
- Add a `scripts/seed_db.py` to import the CSVs and write them into MongoDB.
- Document data sources (WNBA stats API, Basketball-Reference, Kaggle) in `data/README.md`.

## Similarity methodology

### How cosine similarity works

Each player is represented as a numeric vector of their season statistics (e.g., points, rebounds, assists, steals, blocks, field goal percentage, minutes per game). To compare two players, the app computes the **cosine similarity** between their stat vectors.

Cosine similarity measures the angle between two vectors rather than their absolute magnitude, which means two players can be rated as highly similar even if one averages more minutes per game — what matters is the *shape* of their statistical profile, not raw volume. The score ranges from **-1** (opposite profiles) to **1** (identical profiles); in practice, all stat values are non-negative so scores fall between **0** and **1**.

```
cosine_similarity(A, B) = (A · B) / (||A|| × ||B||)
```

A score of **1.0** means the players have a perfectly proportional statistical profile. A score of **0.0** means their profiles share no meaningful overlap.

### Implementation

Stat vectors are normalized with `StandardScaler` before similarity is computed, so no single stat (e.g., points) dominates the result.

```python
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_similarity

# --- Build stat matrix ---
# Each row is one player, each column is one stat feature.
features = ["pts", "reb", "ast", "stl", "blk", "fg_pct", "min"]
stat_matrix = df[features].values          # shape: (n_players, n_features)

scaler = StandardScaler()
stat_matrix_scaled = scaler.fit_transform(stat_matrix)

# --- Compute all pairwise cosine similarities ---
similarity_matrix = cosine_similarity(stat_matrix_scaled)
# similarity_matrix[i][j] is the score between player i and player j

# --- Look up the top-N most similar players for a given player ---
def get_similar_players(player_name: str, player_names: list, top_n: int = 5):
    idx = player_names.index(player_name)
    scores = similarity_matrix[idx]

    # Sort descending; exclude the player themselves (index idx)
    ranked = sorted(
        [(player_names[j], round(float(scores[j]), 4)) for j in range(len(scores)) if j != idx],
        key=lambda x: x[1],
        reverse=True,
    )
    return ranked[:top_n]

# Example
results = get_similar_players("A'ja Wilson", player_names=df["name"].tolist(), top_n=5)
# [("Breanna Stewart", 0.9721), ("Jonquel Jones", 0.9589), ...]
```

### Precomputing and caching similarity scores

Because the full pairwise matrix is computed offline and stored in MongoDB, the API returns results in O(1) time per query.

```python
from pymongo import MongoClient
import os

client = MongoClient(os.getenv("MONGODB_URI"))
db = client.get_default_database()
cache = db["similarity_cache"]

# Seed the cache after building the similarity matrix
def seed_similarity_cache(player_names, similarity_matrix, top_n=10):
    docs = []
    for i, name in enumerate(player_names):
        scores = similarity_matrix[i]
        top = sorted(
            [{"name": player_names[j], "score": round(float(scores[j]), 4)}
             for j in range(len(scores)) if j != i],
            key=lambda x: x["score"],
            reverse=True,
        )[:top_n]
        docs.append({"player": name, "similar": top})

    cache.delete_many({})          # drop stale data
    cache.insert_many(docs)
    print(f"Cached similarity scores for {len(docs)} players.")

# Query the cache at request time
def get_similar_from_cache(player_name: str, top_n: int = 5):
    doc = cache.find_one({"player": player_name})
    if not doc:
        return []
    return doc["similar"][:top_n]
```

### Feature selection & tuning

| Feature | Notes |
|---|---|
| `pts`, `reb`, `ast`, `stl`, `blk` | Core counting stats; always included |
| `fg_pct`, `3p_pct`, `ft_pct` | Efficiency metrics; can be weighted higher |
| `min` | Controls for playing time; normalize before use |
| `tov`, `pf` | Negative-impact stats; include with care |

- **Adding features:** extend the `features` list and re-run `scripts/seed_db.py` to recompute and re-cache.
- **Weighting:** multiply individual feature columns by a weight factor before scaling if you want certain stats to carry more influence.
- **Alternative measures:** Euclidean distance or Pearson correlation can be substituted; cosine similarity is the default because it is scale-invariant.

## Render deployment notes
To deploy on Render:
1. Create a new Web Service in Render and connect your GitHub repo.
2. Set environment variables on Render (very important):
   - MONGODB_URI (your connection string)
   - SECRET_KEY (if used)
   - Any API keys or config toggles
3. Build and start commands (examples):
   - Python (FastAPI): Build Command: `pip install -r requirements.txt`
     Start Command: `gunicorn app.main:app -b 0.0.0.0:$PORT -w 4`
   - Python + frontend: Build Command:
     cd frontend && npm ci && npm run build && cd ..
     pip install -r requirements.txt
     Start Command: `gunicorn app.main:app -b 0.0.0.0:$PORT`
4. If your MongoDB instance (Atlas) restricts IPs, ensure Render's outbound IPs or VPC peering are allowed or use a private networking option.
5. Avoid committing MONGODB_URI to the repository — keep it in Render's environment settings.

## Development
- Run tests: pytest (add tests in `tests/`)
- Linting/formatting: flake8 / black for Python, eslint / prettier for JS
- Local environment variables: use `.env` and load with python-dotenv (do not commit .env)
- Example local .env:
  MONGODB_URI="mongodb://localhost:27017/wnba"
  SECRET_KEY="dev-secret"

## Contributing
- Open an issue to discuss major changes.
- Create feature branches off `main` and open pull requests.
- Follow the code style and ensure tests pass before requesting review.

## Contact
Maintainer: KySm227 (https://github.com/KySm227)
