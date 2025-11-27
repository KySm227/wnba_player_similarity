const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { getSimilarPlayers } = require("./similarity");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Serve static images from API/Image folder
app.use("/api/images", express.static(path.join(__dirname, "Image")));

// Load player image mapping
let playerImageMap = {};
try {
  const mapPath = path.join(__dirname, "player_image_map.json");
  if (fs.existsSync(mapPath)) {
    playerImageMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    console.log(
      `Loaded ${Object.keys(playerImageMap).length} player image mappings`
    );
  }
} catch (error) {
  console.error("Error loading player image map:", error);
}

// Helper function to get player image filename
function getPlayerImageFilename(playerName) {
  return playerImageMap[playerName] || null;
}

// Root route
app.get("/", (req, res) => {
  res.json({ message: "WNBA Player Similarity API Server", status: "running" });
});

// Get player image by name
app.get("/api/players/:name/image", async (req, res) => {
  try {
    const { name } = req.params;

    // Find the player in MongoDB to get exact name match
    const player = await playersCollection.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Get image filename from mapping
    const imageFilename = getPlayerImageFilename(player.name);

    if (!imageFilename) {
      return res.status(404).json({ error: "Image not found for this player" });
    }

    // Return the image path (relative to /api/images)
    res.json({
      imagePath: `/api/images/${imageFilename}`,
      imageFilename: imageFilename,
      playerName: player.name,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all player images mapping
app.get("/api/players/images/mapping", (req, res) => {
  res.json(playerImageMap);
});

const uri = process.env.DATABASE_URL;
const client = new MongoClient(uri);

let db;
let playersCollection;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("WNBA_API");
    playersCollection = db.collection("Players");
    console.log("Connected to MongoDB - WNBA_API database");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

connectDB();

// Test route
app.get("/api/test", async (req, res) => {
  try {
    const count = await playersCollection.countDocuments();
    const samples = await playersCollection.find({}).limit(3).toArray();

    res.json({
      totalPlayers: count,
      message: `Found ${count} players in the database`,
      samplePlayers: samples.map((p) => ({
        _id: p._id.toString(),
        name: p.name,
        ages: Object.keys(p).filter((key) => !isNaN(parseFloat(key))),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all players
app.get("/api/players", async (req, res) => {
  try {
    const players = await playersCollection.find({}).toArray();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get player by ID
app.get("/api/players/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let player;

    if (ObjectId.isValid(id) && id.length === 24) {
      player = await playersCollection.findOne({ _id: new ObjectId(id) });
    }

    if (!player) {
      player = await playersCollection.findOne({ _id: id });
    }

    if (!player) {
      return res.status(404).json({
        error: "Player not found",
        searchedId: id,
      });
    }

    res.json(player);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search players by name
app.get("/api/players/search/:name", async (req, res) => {
  try {
    const players = await playersCollection
      .find({
        name: { $regex: req.params.name, $options: "i" },
      })
      .toArray();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get player stats by age
app.get("/api/players/:id/age/:age", async (req, res) => {
  try {
    const { id, age } = req.params;
    let player;

    if (ObjectId.isValid(id) && id.length === 24) {
      player = await playersCollection.findOne({ _id: new ObjectId(id) });
    } else {
      player = await playersCollection.findOne({ _id: id });
    }

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    const ageStats = player[age];

    if (!ageStats) {
      return res.status(404).json({
        error: `No stats found for age ${age}`,
        availableAges: Object.keys(player).filter((key) => !isNaN(key)),
      });
    }

    res.json({
      name: player.name,
      age: age,
      stats: ageStats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get similar players for a given player (optional age query parameter)
app.get("/api/players/:id/similar", async (req, res) => {
  try {
    const { id } = req.params;
    const { age } = req.query;

    const ageDisplay = age ? String(age) : "first available";
    console.log(
      `Fetching similar players for player ID: ${id}, age: ${ageDisplay}`
    );

    const results = await getSimilarPlayers(id, age || null);

    console.log(`Found ${results.length} similar players`);

    res.json({
      playerId: id,
      age: age || null,
      similar: results,
    });
  } catch (error) {
    console.error("Error computing similar players:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
