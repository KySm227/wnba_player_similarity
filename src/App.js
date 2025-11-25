/* global globalThis */
import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

// API URL - matches server port
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5002/api";

const SECTION_CONFIG = [
  {
    id: "per_game",
    title: "Per Game",
    description: "Traditional counting stats averaged per game.",
    keys: ["per_game"],
  },
  {
    id: "per_100",
    title: "Per 100 Possessions",
    description: "Scaled totals for pace-neutral comparisons.",
    keys: ["per_100_possessions", "per_100", "per100"],
  },
  {
    id: "advanced",
    title: "Advanced",
    description: "Efficiency, usage, and on/off impact metrics.",
    keys: ["advanced"],
  },
  {
    id: "shooting",
    title: "Shooting",
    description: "Breakdown by zone and shot value.",
    keys: ["shooting"],
  },
  {
    id: "pbp",
    title: "Play By Play",
    description: "Lineup role, positional splits, and on/off data.",
    keys: ["pbp", "play_by_play"],
  },
];

const formatLabel = (label) => {
  if (!label) return "";
  return label
    .replaceAll("_", " ")
    .split(" ")
    .map((word) =>
      word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""
    )
    .join(" ");
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const numberValue = Number(value);
  if (!Number.isNaN(numberValue) && value !== true && value !== false) {
    if (Number.isInteger(numberValue)) {
      return numberValue.toString();
    }
    return numberValue.toFixed(2);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
};

const TEAM_NAME_MAP = {
  LAS: "Los Angeles Sparks",
  SAC: "Sacramento Monarchs",
  DET: "Detroit Shock",
  MIN: "Minnesota Lynx",
  ATL: "Atlanta Dream",
  DAL: "Dallas Wings",
  CHI: "Chicago Sky",
  CON: "Connecticut Sun",
  GSV: "Golden State Valkyries",
  IND: "Indiana Fever",
  SEA: "Seattle Storm",
  NYL: "New York Liberty",
  PHO: "Phoenix Mercury",
  LVA: "Las Vegas Aces",
  WAS: "Washington Mystics",
  CHA: "Charlotte Sting",
  SAS: "San Antonio Stars",
  CLE: "Cleveland Rockers",
  HOU: "Houston Comets",
  MIA: "Miami Sol",
  ORL: "Orlando Miracle",
  POR: "Portland Fire",
  TUL: "Tulsa Shock",
  UTA: "Utah Starzz",
};

const formatTeamName = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const upper = trimmed.toUpperCase();
  return TEAM_NAME_MAP[upper] || trimmed;
};

const normalizeAgeDisplay = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }
  return String(numeric);
};

const resolveTeamNames = (data) => {
  if (!data || typeof data !== "object") {
    return { full: "", short: "" };
  }

  const fullName =
    data.team ||
    data.Team ||
    data.per_game?.Team ||
    data.per_game?.team ||
    data.advanced?.Team ||
    data.advanced?.team ||
    "";

  const shortName =
    data.Tm ||
    data.tm ||
    data.per_game?.Tm ||
    data.per_game?.tm ||
    data.advanced?.Tm ||
    data.advanced?.tm ||
    "";

  return {
    full: fullName || shortName || "",
    short: shortName || fullName || "",
  };
};

const getInitialTheme = () => {
  if (typeof globalThis === "undefined") {
    return "light";
  }
  const browserWindow = globalThis.window;
  if (browserWindow) {
    const storedTheme = browserWindow.localStorage?.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }
    if (browserWindow.matchMedia?.("(prefers-color-scheme: light)")?.matches) {
      return "light";
    }
  }
  return "light";
};

const IGNORED_AGE_KEYS = new Set([
  "name",
  "id",
  "_id",
  "stats",
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
  "createdAt",
  "updatedAt",
  "__v",
]);

const buildAgeEntries = (player) => {
  if (!player || typeof player !== "object") {
    return [];
  }

  const entries = [];

  const pushEntry = (key, source, data) => {
    if (!data || typeof data !== "object") {
      return;
    }
    const teamNames = resolveTeamNames(data);
    entries.push({
      originalKey: key,
      displayAge: normalizeAgeDisplay(key),
      team: teamNames.full,
      shortTeam: teamNames.short,
      source,
      data,
      uniqueKey: `${source}-${key}`,
    });
  };

  for (const key of Object.keys(player)) {
    if (IGNORED_AGE_KEYS.has(key)) {
      continue;
    }
    const data = player[key];
    pushEntry(key, "root", data);
  }

  if (player.stats && typeof player.stats === "object") {
    for (const key of Object.keys(player.stats)) {
      const data = player.stats[key];
      pushEntry(key, "stats", data);
    }
  }

  return entries.sort((a, b) => {
    const aNum = Number(a.originalKey);
    const bNum = Number(b.originalKey);
    if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
      return String(a.originalKey).localeCompare(String(b.originalKey));
    }
    return aNum - bNum;
  });
};

function App() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedAge, setSelectedAge] = useState(null);
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [similarPlayers, setSimilarPlayers] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [playerImageMap, setPlayerImageMap] = useState({});
  const [theme, setTheme] = useState(getInitialTheme);
  const searchInputRef = useRef(null);
  const year = new Date().getFullYear();

  // Fetch player image mapping
  useEffect(() => {
    const fetchImageMapping = async () => {
      try {
        const response = await fetch(`${API_URL}/players/images/mapping`);
        if (response.ok) {
          const mapping = await response.json();
          setPlayerImageMap(mapping);
        }
      } catch (err) {
        console.error("Error fetching image mapping:", err);
      }
    };
    fetchImageMapping();
  }, []);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_URL}/players`);

        // Check if response is actually JSON
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          const text = await response.text();
          throw new Error(
            `Server returned HTML instead of JSON. Make sure the backend server is running on port 5001. Response: ${text.substring(
              0,
              100
            )}`
          );
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch players: ${response.statusText}`);
        }

        const data = await response.json();
        setPlayers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching players:", err);
        // Provide more helpful error message
        if (err.message === "Failed to fetch" || err.name === "TypeError") {
          setError(
            "Cannot connect to server. Make sure the backend server is running on port 5002. Run: npm run server"
          );
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
    if (typeof globalThis === "undefined") {
      return;
    }
    const browserWindow = globalThis.window;
    browserWindow?.localStorage?.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Helper function to get player image path
  const getPlayerImagePath = (playerName) => {
    if (!playerName || !playerImageMap[playerName]) {
      return null;
    }
    return `${API_URL}/images/${playerImageMap[playerName]}`;
  };

  const filteredPlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return players;
    }
    return players.filter((player) => {
      const name = (player.name || "").toLowerCase();
      return name.includes(normalized);
    });
  }, [players, query]);

  const handleSelect = (playerId) => {
    if (!playerId) {
      setSelectedPlayer(null);
      setSelectedAge(null);
      setQuery("");
      setIsDropdownOpen(false);
      return;
    }
    const player = players.find((candidate) => candidate._id === playerId);
    setSelectedPlayer(player ?? null);
    setQuery(player?.name ?? "");
    setIsDropdownOpen(false);

    // Set default age to first available age (normalized for display)
    if (player) {
      const playerAges = buildAgeEntries(player);
      setSelectedAge(playerAges[0]?.displayAge || null);
    }
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  // Get available ages for selected player combining root-level and stats object entries
  const availableAges = useMemo(
    () => buildAgeEntries(selectedPlayer),
    [selectedPlayer]
  );

  // Team references for selected player (handles team/Tm fields)
  const playerTeamNames = useMemo(
    () => resolveTeamNames(selectedPlayer),
    [selectedPlayer]
  );

  // Get stats for selected age - need to find original key
  const selectedAgeStats = useMemo(() => {
    if (!selectedPlayer || !selectedAge) {
      return null;
    }
    // Find the original key that matches the selected age (normalized)
    const ageEntry =
      availableAges.find((age) => age.displayAge === selectedAge) || null;
    if (ageEntry) {
      return ageEntry.data || null;
    }
    return null;
  }, [selectedAge, availableAges, selectedPlayer]);

  const statSections = useMemo(() => {
    if (!selectedAgeStats || typeof selectedAgeStats !== "object") {
      return [];
    }

    return SECTION_CONFIG.map((section) => {
      const data =
        section.keys
          .map((key) => selectedAgeStats[key])
          .find((value) => value && typeof value === "object") || null;

      if (!data) {
        return null;
      }

      const rows = Object.entries(data)
        .filter(([statKey, value]) => {
          const normalizedKey = String(statKey).toLowerCase();
          const shouldSkip =
            normalizedKey === "year" ||
            normalizedKey === "team" ||
            normalizedKey === "tm" ||
            normalizedKey === "age";
          return (
            !shouldSkip && value !== null && value !== undefined && value !== ""
          );
        })
        .map(([statKey, value]) => ({
          label: formatLabel(statKey),
          value: formatValue(value),
        }));

      if (rows.length === 0) {
        return null;
      }

      return {
        id: section.id,
        title: section.title,
        description: section.description,
        rows,
      };
    }).filter(Boolean);
  }, [selectedAgeStats]);

  const activeAgeEntry = useMemo(() => {
    if (!selectedAge) {
      return null;
    }
    return availableAges.find((age) => age.displayAge === selectedAge) || null;
  }, [availableAges, selectedAge]);

  const readableSelectedAge = useMemo(() => {
    if (!selectedAge) {
      return "";
    }
    const numeric = Number(selectedAge);
    return Number.isNaN(numeric) ? selectedAge : numeric;
  }, [selectedAge]);

  const seasonTeamNames = useMemo(
    () => resolveTeamNames(selectedAgeStats),
    [selectedAgeStats]
  );

  const currentTeam =
    activeAgeEntry?.team ||
    seasonTeamNames.full ||
    playerTeamNames.full ||
    activeAgeEntry?.shortTeam ||
    seasonTeamNames.short ||
    playerTeamNames.short ||
    "";

  const playerHeaderTeam = formatTeamName(
    playerTeamNames.full || playerTeamNames.short || ""
  );
  const badgeTeamName = formatTeamName(currentTeam);

  // Fetch similar players when player and age are selected
  useEffect(() => {
    const fetchSimilarPlayers = async () => {
      if (!selectedPlayer || !selectedAge) {
        setSimilarPlayers([]);
        return;
      }

      try {
        setLoadingSimilar(true);
        const ageKey = activeAgeEntry?.originalKey || selectedAge;
        const url = `${API_URL}/players/${selectedPlayer._id}/similar${
          ageKey ? `?age=${ageKey}` : ""
        }`;

        console.log("Fetching similar players:", {
          playerId: selectedPlayer._id,
          selectedAge,
          ageKey,
          url,
        });

        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error Response:", errorText);
          throw new Error(
            `Failed to fetch similar players: ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("Similar players response:", data);
        setSimilarPlayers(data.similar || []);
      } catch (err) {
        console.error("Error fetching similar players:", err);
        setSimilarPlayers([]);
      } finally {
        setLoadingSimilar(false);
      }
    };

    fetchSimilarPlayers();
  }, [selectedPlayer, selectedAge, activeAgeEntry]);

  return (
    <div className="app">
      <header className="hero hero--slim">
        <div className="hero__top">
          <p className="hero__eyebrow">WNBA Player Database</p>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
        <h1>WNBA Player Comp Finder</h1>
        <p className="hero__lead">
          Type to search. Select a player to see their stored data from MongoDB.
        </p>
      </header>

      <main className="layout">
        <aside className="sidebar panel">
          <div>
            <h2>Search Players</h2>
            <p className="sidebar__hint">
              Player names populate directly from your MongoDB collection.
            </p>
          </div>
          {loading && <p className="empty-hint">Loading players...</p>}
          {error && (
            <div>
              <p className="empty-hint" style={{ color: "var(--accent)" }}>
                Error: {error}
              </p>
              <p
                className="empty-hint"
                style={{ fontSize: "0.85rem", marginTop: "8px" }}
              >
                Make sure the server is running: <code>npm run server</code>
              </p>
            </div>
          )}
          <div className="search-dropdown">
            <input
              ref={searchInputRef}
              id="player-search"
              type="text"
              placeholder="Search players..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                setIsDropdownOpen(true);
                if (selectedPlayer && query === (selectedPlayer.name || "")) {
                  setQuery("");
                }
              }}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 150)}
              className="search-input"
              autoComplete="off"
            />

            {isDropdownOpen && (
              <div className="dropdown-menu">
                {filteredPlayers.length === 0 ? (
                  <div className="dropdown-empty">No players found</div>
                ) : (
                  <ul className="dropdown-list">
                    {filteredPlayers.map((player) => {
                      return (
                        <li key={player._id}>
                          <button
                            type="button"
                            className={`dropdown-item${
                              selectedPlayer?._id === player._id
                                ? " is-active"
                                : ""
                            }`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelect(player._id)}
                          >
                            <span className="dropdown-item__name">
                              {player.name || "Unknown Player"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </aside>

        <section className="content">
          {selectedPlayer ? (
            <article className="panel">
              <div className="player-header">
                {getPlayerImagePath(selectedPlayer.name) && (
                  <img
                    src={getPlayerImagePath(selectedPlayer.name)}
                    alt={selectedPlayer.name}
                    className="player-header__image"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                )}
                <div className="player-header__info">
                  <h2>{selectedPlayer.name}</h2>
                  {playerHeaderTeam && (
                    <p className="player-meta">{playerHeaderTeam}</p>
                  )}
                </div>
              </div>

              {availableAges.length > 0 && (
                <div className="age-selector">
                  <p className="age-selector__label">Age</p>
                  <div className="age-buttons">
                    {availableAges.map((age) => {
                      const isActive = age.displayAge === selectedAge;
                      return (
                        <button
                          key={age.uniqueKey || age.originalKey}
                          type="button"
                          className={`age-button${
                            isActive ? " is-active" : ""
                          }`}
                          onClick={() => setSelectedAge(age.displayAge)}
                        >
                          <span className="age-button__label">
                            {age.displayAge}
                          </span>
                          {(age.shortTeam || age.team) && (
                            <span className="age-button__team">
                              {age.shortTeam || age.team}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {statSections.length > 0 && (
                <div className="player-stats">
                  <div className="player-stats__header">
                    <div>
                      <p className="player-stats__eyebrow">Season snapshot</p>
                      <h3>
                        Age {readableSelectedAge || "—"}
                        {selectedAgeStats?.per_game?.Year
                          ? ` • ${selectedAgeStats.per_game.Year}`
                          : ""}
                      </h3>
                    </div>
                    {badgeTeamName && (
                      <div className="player-stats__meta">
                        <span className="badge badge--soft">
                          {badgeTeamName}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="stat-accordion-list">
                    {statSections.map((section, index) => (
                      <details
                        key={section.id}
                        className="panel stat-accordion"
                        open={index === 0}
                      >
                        <summary className="stat-accordion__summary">
                          <div>
                            <h3>{section.title}</h3>
                            <p>{section.description}</p>
                          </div>
                          <span
                            className="stat-accordion__chevron"
                            aria-hidden="true"
                          />
                        </summary>
                        <div className="stat-accordion__content">
                          <dl>
                            {section.rows.map((row) => (
                              <div key={row.label} className="stat-row">
                                <dt>{row.label}</dt>
                                <dd>{row.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}
              {selectedPlayer && selectedAge && (
                <section className="panel similar-template">
                  <div className="similar-template__header">
                    <div>
                      <h3>Similar Players</h3>
                    </div>
                  </div>
                  {loadingSimilar && (
                    <p className="empty-hint">Loading similar players...</p>
                  )}
                  {!loadingSimilar && similarPlayers.length > 0 && (
                    <div className="similar-template__grid">
                      {similarPlayers.map((similar) => {
                        const teamName = formatTeamName(similar.team || "");
                        const similarImagePath = getPlayerImagePath(
                          similar.name
                        );
                        return (
                          <button
                            key={similar.playerId}
                            type="button"
                            className="similar-template__card similar-template__card--clickable"
                            onClick={() => {
                              if (similar.playerId) {
                                handleSelect(similar.playerId);
                              }
                            }}
                          >
                            <div className="similar-template__badge">
                              {similar.similarity}% Match
                            </div>
                            {similarImagePath && (
                              <img
                                src={similarImagePath}
                                alt={similar.name}
                                className="similar-template__image"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            )}
                            <h4 className="similar-template__name">
                              {similar.name || "Unknown Player"}
                            </h4>
                            {teamName && (
                              <p className="similar-template__team">
                                {teamName}
                              </p>
                            )}
                            <p className="similar-template__caption">
                              Age {similar.age}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!loadingSimilar && similarPlayers.length === 0 && (
                    <p className="empty-hint">
                      No similar players found for this age.
                    </p>
                  )}
                </section>
              )}
              {selectedAgeStats && statSections.length === 0 && (
                <p className="empty-hint">
                  Stats for this age exist but could not be formatted. Check the
                  raw data structure in MongoDB.
                </p>
              )}
              {!selectedAgeStats && availableAges.length === 0 && (
                <p className="empty-hint">
                  No stats have been stored for this player yet.
                </p>
              )}
            </article>
          ) : (
            <div className="panel empty-panel">
              <h2>Select a Player</h2>
              <p>
                Use the dropdown on the left to pick a player from your MongoDB
                collection.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>© {year} WNBA Player Similarity</p>
        <p className="footer__note">Live data from MongoDB</p>
      </footer>
    </div>
  );
}

export default App;
