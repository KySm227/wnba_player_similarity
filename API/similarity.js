const { MongoClient, ObjectId } = require("mongodb");
const { config } = require("dotenv");

config();

const SECTION_ALIASES = {
  per_game: ["per_game"],
  per_100: ["per_100", "per_100_possessions"],
  advanced: ["advanced"],
  pbp: ["pbp", "play_by_play"],
  shooting: ["shooting"],
};

const METRICS = {
  per_game: ["eFG%", "3P", "3PA", "2P", "2PA", "FT", "FTA"],
  per_100: ["Ortg", "Drtg"],
  advanced: [
    "PER",
    "TS%",
    "3PAr",
    "FTr",
    "ORB%",
    "DRB%",
    "TRB%",
    "AST%",
    "STL%",
    "BLK%",
    "TOV%",
    "USG%",
    "OWS",
    "DWS",
    "WS",
  ],
  pbp: [
    "BadPass",
    "LostBall",
    "And1",
    "PGA",
    "OnCourt",
    "On-Off",
    "Shoot",
    "Off",
  ],
  shooting: ["2P", "0-3", "3-10", "10-16", "16-3P", "3P", "%FGA", "#", "Att."],
};

const IGNORED_PLAYER_KEYS = new Set([
  "name",
  "team",
  "position",
  "height",
  "weight",
  "college",
  "bio",
  "number",
  "imageUrl",
  "similarPlayers",
  "ageProfiles",
  "stats",
  "_id",
  "id",
  "createdAt",
  "updatedAt",
  "__v",
]);

const client = new MongoClient(process.env.DATABASE_URL);
let playersCollection;

async function getCollection() {
  if (!playersCollection) {
    await client.connect();
    playersCollection = client.db("WNBA_API").collection("Players");
  }
  return playersCollection;
}

function getSection(stats, sectionKey) {
  if (!stats) return null;
  const aliases = SECTION_ALIASES[sectionKey] || [sectionKey];
  for (const alias of aliases) {
    if (stats[alias] && typeof stats[alias] === "object") {
      return stats[alias];
    }
  }
  return null;
}

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildStatVector(ageStats) {
  const vector = {};
  if (!ageStats || typeof ageStats !== "object") {
    return vector;
  }

  for (const [section, keys] of Object.entries(METRICS)) {
    const sectionData = getSection(ageStats, section);
    if (!sectionData) {
      continue;
    }
    for (const key of keys) {
      const value = toNumber(sectionData[key]);
      if (value !== null) {
        vector[`${section}.${key}`] = value;
      }
    }
  }

  return vector;
}

function getSharedMetrics(vectorA, vectorB) {
  return Object.keys(vectorA).filter((metric) =>
    Object.hasOwn(vectorB, metric)
  );
}

function computeSimilarity(targetVector, comparisonVector) {
  const sharedMetrics = getSharedMetrics(targetVector, comparisonVector);
  if (sharedMetrics.length === 0) {
    return null;
  }

  let totalDiff = 0;
  for (const metric of sharedMetrics) {
    const targetValue = targetVector[metric];
    const comparisonValue = comparisonVector[metric];
    const denominator = Math.abs(targetValue) + Math.abs(comparisonValue);
    const normalizedDiff =
      denominator === 0
        ? 0
        : Math.abs(targetValue - comparisonValue) / denominator;
    totalDiff += normalizedDiff;
  }

  const averageDiff = totalDiff / sharedMetrics.length;
  return Math.max(1 - averageDiff, 0) * 100;
}

function resolveTeam(ageStats) {
  return (
    ageStats?.team ||
    ageStats?.Team ||
    ageStats?.per_game?.Team ||
    ageStats?.per_game?.team ||
    ""
  );
}

function addEntry(entries, age, stats) {
  if (stats && typeof stats === "object") {
    entries.push({ age, stats, team: resolveTeam(stats) });
  }
}

function hasTrackedSections(value) {
  return Object.keys(METRICS).some((section) =>
    Boolean(getSection(value, section))
  );
}

function collectAgeEntries(player) {
  if (!player || typeof player !== "object") {
    return [];
  }

  const entries = [];

  if (player.stats && typeof player.stats === "object") {
    for (const [age, stats] of Object.entries(player.stats)) {
      addEntry(entries, age, stats);
    }
  }

  for (const [key, value] of Object.entries(player)) {
    if (IGNORED_PLAYER_KEYS.has(key)) {
      continue;
    }
    if (value && typeof value === "object" && hasTrackedSections(value)) {
      addEntry(entries, key, value);
    }
  }

  return entries;
}

function resolveTargetAge(player, ageKey) {
  if (!player) return null;
  if (ageKey) {
    const directStats = player.stats?.[ageKey] || player[ageKey];
    if (directStats) {
      return {
        age: ageKey,
        stats: directStats,
        team: resolveTeam(directStats),
      };
    }
  }
  const [first] = collectAgeEntries(player);
  return first || null;
}

function evaluateCandidate(candidateEntries, targetVector) {
  let bestEntry = null;
  let bestScore = -Infinity;

  for (const entry of candidateEntries) {
    const candidateVector = buildStatVector(entry.stats);
    const score = computeSimilarity(targetVector, candidateVector);
    if (score !== null && score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return { bestEntry, bestScore };
}

async function getSimilarPlayers(playerId, ageKey) {
  const collection = await getCollection();
  let targetId;

  try {
    targetId = typeof playerId === "string" ? new ObjectId(playerId) : playerId;
  } catch (error) {
    console.error("Invalid player id", error);
    return [];
  }

  const targetPlayer = await collection.findOne({ _id: targetId });
  if (!targetPlayer) {
    return [];
  }

  const targetEntry = resolveTargetAge(targetPlayer, ageKey);
  if (!targetEntry) {
    return [];
  }

  const targetVector = buildStatVector(targetEntry.stats);
  if (Object.keys(targetVector).length === 0) {
    return [];
  }

  const results = [];
  const cursor = collection.find({});

  // eslint-disable-next-line no-restricted-syntax
  for await (const candidate of cursor) {
    if (candidate._id.equals(targetId)) {
      continue;
    }

    const candidateEntries = collectAgeEntries(candidate);
    const { bestEntry, bestScore } = evaluateCandidate(
      candidateEntries,
      targetVector
    );

    if (bestEntry && bestScore >= 0) {
      results.push({
        playerId: candidate._id.toString(),
        name: candidate.name || "Unknown Player",
        team: candidate.team || bestEntry.team || "",
        age: bestEntry.age,
        similarity: Number(bestScore.toFixed(2)),
      });
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, 3);
}

async function testSimilarity() {
  const playerName = process.argv[2];

  if (!playerName) {
    console.log("Usage: node similarity.js <player-name> [age]");
    console.log("Example: node similarity.js 'A'ja Wilson' 25");
    process.exit(1);
  }

  const ageKey = process.argv[3] || null;

  try {
    const collection = await getCollection();

    // Find player by name (case-insensitive)
    const player = await collection.findOne({
      name: { $regex: new RegExp(`^${playerName}$`, "i") },
    });

    if (!player) {
      console.log(`\n❌ Player "${playerName}" not found in database.`);
      console.log("\nAvailable players (first 10):");
      const samplePlayers = await collection.find({}).limit(10).toArray();
      for (const p of samplePlayers) {
        console.log(`  - ${p.name}`);
      }
      process.exit(1);
    }

    console.log(`\n✅ Found player: ${player.name}`);
    console.log(`   Player ID: ${player._id}`);

    if (ageKey) {
      console.log(`   Testing with age: ${ageKey}`);
    } else {
      console.log(`   Testing with first available age`);
    }

    console.log("\n🔍 Computing similarity scores...\n");

    const similarPlayers = await getSimilarPlayers(
      player._id.toString(),
      ageKey
    );

    if (similarPlayers.length === 0) {
      console.log("❌ No similar players found.");
      console.log("   This might mean:");
      console.log("   - The player has no stats for the specified age");
      console.log("   - No other players have matching stat categories");
      process.exit(1);
    }

    console.log("📊 Top 3 Similar Players:\n");
    console.log("─".repeat(60));

    for (const [index, similar] of similarPlayers.entries()) {
      console.log(`\n${index + 1}. ${similar.name}`);
      console.log(`   Similarity: ${similar.similarity}%`);
      console.log(`   Age: ${similar.age}`);
      console.log(`   Team: ${similar.team || "N/A"}`);
      console.log(`   Player ID: ${similar.playerId}`);
    }

    console.log("\n" + "─".repeat(60));
    console.log(`\n✅ Test completed successfully!\n`);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run test if file is executed directly
if (require.main === module) {
  testSimilarity();
}

module.exports = {
  getSimilarPlayers,
};
