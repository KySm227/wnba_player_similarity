import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import "./App.css";

const SECTION_METADATA = {
  perGame: {
    title: "Per Game",
    description: "Box-score staples for the chosen season snapshot.",
  },
  advanced: {
    title: "Advanced",
    description: "Impact metrics, usage, and efficiency indicators.",
  },
  per100: {
    title: "Per 100 Possessions",
    description: "Scaled output for pace-agnostic comparisons.",
  },
  shooting: {
    title: "Shooting",
    description: "Shot profile and conversion splits.",
  },
  playByPlay: {
    title: "Play-by-Play",
    description: "On/off data and lineup versatility.",
  },
};

const SECTION_ORDER = [
  "perGame",
  "advanced",
  "per100",
  "shooting",
  "playByPlay",
];

const baseSimilarPlayers = [
  {
    name: "Breanna Stewart",
    score: 94,
    season: "2023 Liberty",
    description:
      "Versatile two-way star with matching usage and defensive range.",
  },
  {
    name: "Napheesa Collier",
    score: 90,
    season: "2024 Lynx",
    description:
      "Face-up forward who blends on-ball creation with elite help defense.",
  },
  {
    name: "Lauren Jackson",
    score: 87,
    season: "2007 Storm",
    description:
      "Peak MVP stretch with similar rim pressure and spacing gravity.",
  },
];

const samplePlayer = {
  id: "aja-wilson",
  name: "A'ja Wilson",
  team: "Las Vegas Aces",
  number: 22,
  position: "F/C",
  height: "6'4\"",
  weight: "195 lbs",
  college: "South Carolina",
  yearsPro: "7th season",
  hometown: "Hopkins, SC",
  bio: "Dominant two-way anchor powering the Aces with interior scoring, rim protection, and emerging perimeter range.",
  imageUrl: "https://cdn.nba.com/headshots/wnba/latest/1040x760/1628883.png",
  badges: ["2x MVP", "2x Champion", "5x All-Star"],
  ageProfiles: [
    {
      age: 27,
      season: "2024",
      tagline: "Third MVP pace with improved spacing and switch defense.",
      stats: {
        perGame: [
          { label: "PTS", value: "24.3" },
          { label: "REB", value: "9.8" },
          { label: "AST", value: "2.6" },
          { label: "STL", value: "1.5" },
          { label: "BLK", value: "2.2" },
          { label: "TS%", value: "63.1" },
        ],
        advanced: [
          { label: "PER", value: "30.8" },
          { label: "USG%", value: "32.6" },
          { label: "WS/48", value: ".322" },
          { label: "BPM", value: "9.4" },
          { label: "DWS", value: "3.1" },
          { label: "Off RTG", value: "121" },
        ],
        per100: [
          { label: "PTS", value: "36.8" },
          { label: "REB", value: "14.9" },
          { label: "AST", value: "3.9" },
          { label: "FTM", value: "10.2" },
          { label: "Blocks", value: "3.4" },
          { label: "FGA", value: "24.6" },
        ],
        shooting: [
          { label: "At Rim", value: "69%" },
          { label: "Midrange", value: "47%" },
          { label: "Corner 3", value: "41%" },
          { label: "3PA", value: "1.4" },
          { label: "FTA", value: "7.9" },
          { label: "eFG%", value: "58%" },
        ],
        playByPlay: [
          { label: "Net On/Off", value: "+14.6" },
          { label: "Lineup Usage", value: "78%" },
          { label: "Small-Ball 5", value: "62%" },
          { label: "Post Touches", value: "11.4" },
          { label: "Touches/Game", value: "61" },
          { label: "Deflections", value: "3.1" },
        ],
      },
      similarPlayers: baseSimilarPlayers,
    },
    {
      age: 26,
      season: "2023",
      tagline: "Back-to-back title run fueled by interior dominance.",
      stats: {
        perGame: [
          { label: "PTS", value: "21.8" },
          { label: "REB", value: "9.5" },
          { label: "AST", value: "2.2" },
          { label: "STL", value: "1.4" },
          { label: "BLK", value: "1.9" },
          { label: "TS%", value: "60.4" },
        ],
        advanced: [
          { label: "PER", value: "28.6" },
          { label: "USG%", value: "30.1" },
          { label: "WS/48", value: ".298" },
          { label: "BPM", value: "8.7" },
          { label: "DWS", value: "2.9" },
          { label: "Off RTG", value: "118" },
        ],
        per100: [
          { label: "PTS", value: "34.1" },
          { label: "REB", value: "15.1" },
          { label: "AST", value: "3.6" },
          { label: "FTM", value: "8.8" },
          { label: "Blocks", value: "3.1" },
          { label: "FGA", value: "22.8" },
        ],
        shooting: [
          { label: "At Rim", value: "67%" },
          { label: "Midrange", value: "45%" },
          { label: "Corner 3", value: "33%" },
          { label: "3PA", value: "0.7" },
          { label: "FTA", value: "7.0" },
          { label: "eFG%", value: "56%" },
        ],
        playByPlay: [
          { label: "Net On/Off", value: "+12.8" },
          { label: "Lineup Usage", value: "74%" },
          { label: "Small-Ball 5", value: "55%" },
          { label: "Post Touches", value: "10.6" },
          { label: "Touches/Game", value: "57" },
          { label: "Deflections", value: "2.8" },
        ],
      },
      similarPlayers: [
        baseSimilarPlayers[0],
        baseSimilarPlayers[2],
        {
          name: "Candace Parker",
          score: 85,
          season: "2013 Sparks",
          description: "Point-forward skillset with interior rim deterrence.",
        },
      ],
    },
    {
      age: 24,
      season: "2021",
      tagline: "Early-prime leap with higher usage and rim attempts.",
      stats: {
        perGame: [
          { label: "PTS", value: "19.0" },
          { label: "REB", value: "8.3" },
          { label: "AST", value: "2.5" },
          { label: "STL", value: "1.3" },
          { label: "BLK", value: "1.8" },
          { label: "TS%", value: "59.2" },
        ],
        advanced: [
          { label: "PER", value: "26.9" },
          { label: "USG%", value: "28.4" },
          { label: "WS/48", value: ".260" },
          { label: "BPM", value: "7.5" },
          { label: "DWS", value: "2.4" },
          { label: "Off RTG", value: "114" },
        ],
        per100: [
          { label: "PTS", value: "31.6" },
          { label: "REB", value: "13.2" },
          { label: "AST", value: "4.0" },
          { label: "FTM", value: "8.0" },
          { label: "Blocks", value: "2.8" },
          { label: "FGA", value: "20.2" },
        ],
        shooting: [
          { label: "At Rim", value: "66%" },
          { label: "Midrange", value: "42%" },
          { label: "Corner 3", value: "29%" },
          { label: "3PA", value: "0.3" },
          { label: "FTA", value: "6.6" },
          { label: "eFG%", value: "55%" },
        ],
        playByPlay: [
          { label: "Net On/Off", value: "+10.3" },
          { label: "Lineup Usage", value: "70%" },
          { label: "Small-Ball 5", value: "41%" },
          { label: "Post Touches", value: "9.8" },
          { label: "Touches/Game", value: "52" },
          { label: "Deflections", value: "2.2" },
        ],
      },
      similarPlayers: [
        {
          name: "Elena Delle Donne",
          score: 88,
          season: "2015 Sky",
          description: "Pick-and-pop star with elite touch and foul magnetism.",
        },
        {
          name: "Lauren Jackson",
          score: 85,
          season: "2004 Storm",
          description: "Stretch-five toolkit with rim deterrence and footwork.",
        },
        {
          name: "Sylvia Fowles",
          score: 83,
          season: "2012 Sky",
          description: "Paint dominant finisher with glass-cleaning prowess.",
        },
      ],
    },
  ],
};

const roster = [samplePlayer];

function StatGroup({ title, description, rows }) {
  return (
    <article className="stat-group panel">
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <dl>
        {rows.map((row) => (
          <div key={row.label} className="stat-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

StatGroup.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
};

function SimilarPlayerCard({ name, score, season, description }) {
  return (
    <article className="similar-card">
      <div className="similar-card__score">{score}% match</div>
      <div>
        <h4>{name}</h4>
        <p className="similar-card__season">{season}</p>
        <p className="similar-card__description">{description}</p>
      </div>
    </article>
  );
}

SimilarPlayerCard.propTypes = {
  name: PropTypes.string.isRequired,
  score: PropTypes.number.isRequired,
  season: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};

function App() {
  const [query, setQuery] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedAgeByPlayer, setSelectedAgeByPlayer] = useState({});
  const year = new Date().getFullYear();

  const filteredPlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return roster;
    }
    return roster.filter((player) =>
      player.name.toLowerCase().includes(normalized)
    );
  }, [query]);

  const selectedPlayer =
    roster.find((player) => player.id === selectedPlayerId) ?? null;
  const activeAge =
    selectedPlayer?.ageProfiles?.length &&
    (selectedAgeByPlayer[selectedPlayer.id] ??
      selectedPlayer.ageProfiles[0].age);
  const activeProfile =
    selectedPlayer?.ageProfiles?.find((profile) => profile.age === activeAge) ??
    selectedPlayer?.ageProfiles?.[0] ??
    null;

  return (
    <div className="app">
      <header className="hero hero--slim">
        <p className="hero__eyebrow">Sample Experience</p>
        <h1>A'ja Wilson Search Demo</h1>
        <p className="hero__lead">
          Type her name, tap the only result, and preview a fully mocked
          scouting profile with stat families and three closest comps.
        </p>
      </header>

      <main className="layout">
        <aside className="sidebar panel">
          <div>
            <h2>Search Players</h2>
            <p className="sidebar__hint">
              This sample only includes A&apos;ja Wilson to show the flow.
            </p>
          </div>
          <input
            id="player-search"
            type="search"
            placeholder="Search for A'ja Wilson"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {filteredPlayers.length === 0 ? (
            <p className="empty-hint">No players match that search.</p>
          ) : (
            <ul className="search-results">
              {filteredPlayers.map((player) => {
                const isActive = player.id === selectedPlayerId;
                return (
                  <li key={player.id}>
                    <button
                      type="button"
                      className={`search-results__item${
                        isActive ? " is-active" : ""
                      }`}
                      onClick={() => {
                        setSelectedPlayerId(player.id);
                        setSelectedAgeByPlayer((prev) => {
                          if (prev[player.id] !== undefined) {
                            return prev;
                          }
                          const defaultAge = player.ageProfiles?.[0]?.age;
                          if (defaultAge === undefined) {
                            return prev;
                          }
                          return { ...prev, [player.id]: defaultAge };
                        });
                      }}
                      aria-pressed={isActive}
                    >
                      <span className="search-results__name">
                        {player.name}
                      </span>
                      <span className="search-results__meta">
                        {player.team} • {player.position}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="content">
          {selectedPlayer ? (
            <>
              <article className="profile panel">
                <div className="profile__header">
                  <img
                    src={selectedPlayer.imageUrl}
                    alt={`${selectedPlayer.name} headshot`}
                    className="profile__photo"
                  />
                  <div className="profile__info">
                    <div className="profile__meta">
                      <span className="profile__number">
                        #{selectedPlayer.number}
                      </span>
                      <span className="profile__position">
                        {selectedPlayer.position}
                      </span>
                      <span>{selectedPlayer.team}</span>
                    </div>
                    <h2>{selectedPlayer.name}</h2>
                    <p className="profile__bio">{selectedPlayer.bio}</p>
                    <ul className="badge-list">
                      <li>{selectedPlayer.height}</li>
                      <li>{selectedPlayer.weight}</li>
                      <li>{selectedPlayer.college}</li>
                      <li>{selectedPlayer.yearsPro}</li>
                    </ul>
                    <ul className="badge-list badge-list--pills">
                      {selectedPlayer.badges.map((badge) => (
                        <li key={badge}>{badge}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {activeProfile ? (
                  <div className="age-control">
                    <div className="age-control__header">
                      <label htmlFor={`age-select-${selectedPlayer.id}`}>
                        Season focus
                      </label>
                      <span className="age-control__season">
                        Age {activeProfile.age}
                        {activeProfile.season
                          ? ` • ${activeProfile.season}`
                          : ""}
                      </span>
                    </div>
                    <select
                      id={`age-select-${selectedPlayer.id}`}
                      value={activeProfile.age}
                      onChange={(event) => {
                        const nextAge = Number(event.target.value);
                        if (Number.isNaN(nextAge)) {
                          return;
                        }
                        setSelectedAgeByPlayer((prev) => ({
                          ...prev,
                          [selectedPlayer.id]: nextAge,
                        }));
                      }}
                    >
                      {selectedPlayer.ageProfiles?.map((profile) => (
                        <option key={profile.age} value={profile.age}>
                          Age {profile.age}
                          {profile.season ? ` • ${profile.season}` : ""}
                        </option>
                      ))}
                    </select>
                    {activeProfile.tagline ? (
                      <p className="age-control__note">
                        {activeProfile.tagline}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>

              {activeProfile ? (
                <>
                  <section className="stat-grid">
                    {SECTION_ORDER.map((sectionKey) => {
                      const metadata = SECTION_METADATA[sectionKey];
                      const rows = activeProfile.stats[sectionKey];

                      return (
                        <StatGroup
                          key={sectionKey}
                          title={metadata.title}
                          description={metadata.description}
                          rows={rows}
                        />
                      );
                    })}
                  </section>

                  <section className="panel similar">
                    <div className="similar__header">
                      <h2>Top Similar Players</h2>
                      <p>
                        Data model compares size, usage, efficiency, and
                        defensive impact to surface these comps.
                      </p>
                    </div>
                    <div className="similar__list">
                      {activeProfile.similarPlayers
                        .slice(0, 3)
                        .map((player) => (
                          <SimilarPlayerCard key={player.name} {...player} />
                        ))}
                    </div>
                  </section>
                </>
              ) : null}
            </>
          ) : (
            <div className="panel empty-panel">
              <h2>Select A'ja Wilson</h2>
              <p>
                Use the search on the left to load the full profile, stat
                sections, and top three similar players.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>© {year} WNBA Player Similarity • Sample UI</p>
        <p className="footer__note">Fully static demo wired to one player.</p>
      </footer>
    </div>
  );
}

export default App;
