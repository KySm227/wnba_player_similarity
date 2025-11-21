import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { load_dotenv } from 'dotenv';
import { MongoClient } from 'mongodb';

const SECTION_METADATA = {
  perGame: {
    title: 'Per Game',
    description: 'Regular season per-game production.',
  },
  advanced: {
    title: 'Advanced',
    description: 'Efficiency, possession usage, and overall impact indicators.',
  },
  per100: {
    title: 'Per 100 Possessions',
    description: 'Scaled production per 100 possessions.',
  },
  playByPlay: {
    title: 'Play-by-Play',
    description: 'On/off splits and lineup impact metrics.',
  },
  shooting: {
    title: 'Shooting',
    description: 'Shot profile and conversion rates.',
  },
};

const SECTION_ORDER = ['perGame', 'advanced', 'per100', 'playByPlay', 'shooting'];

function StatCard({ title, description, rows }) {
  return (
    <section className="stat-card">
      <header className="stat-card__header">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </header>
      {rows && rows.length > 0 ? (
        <dl className="stat-card__grid">
          {rows.map((row) => (
            <div key={row.label} className="stat-card__row">
              <dt>{row.label}</dt>
            </div>
          ))}
        </dl>
      ) : (
        <p className="empty-state">Stats coming soon.</p>
      )}
    </section>
  );
}

function App() {
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedAges, setSelectedAges] = useState({});

  // Fetch players from database on component mount
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(DATABASE_URL);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch players: ${response.statusText}`);
        }
        
        const data = await response.json();
        // Handle both array response and object with players property
        const playersData = Array.isArray(data) ? data : data.players || [];
        setPlayers(playersData);
        
        // Set first player as selected if available
        if (playersData.length > 0) {
          setSelectedPlayerId(playersData[0].id);
        }
      } catch (err) {
        console.error('Error fetching players:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const filteredPlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return players;
    }

    return players.filter((player) => {
      const haystack = `${player.name} ${player.team} ${player.position}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, players]);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [selectedPlayerId, players],
  );

  useEffect(() => {
    if (!selectedPlayer?.ageProfiles?.length) {
      return;
    }

    const defaultAge = selectedPlayer.ageProfiles[0]?.age;

    if (defaultAge === undefined) {
      return;
    }

    setSelectedAges((prev) => {
      if (prev[selectedPlayer.id] !== undefined) {
        return prev;
      }
      return { ...prev, [selectedPlayer.id]: defaultAge };
    });
  }, [selectedPlayer]);

  const selectedAgeProfile = useMemo(() => {
    if (!selectedPlayer?.ageProfiles?.length) {
      return null;
    }

    const activeAge = selectedAges[selectedPlayer.id];

    return (
      selectedPlayer.ageProfiles.find((profile) => profile.age === activeAge) ??
      selectedPlayer.ageProfiles[0]
    );
  }, [selectedAges, selectedPlayer]);

  const similarPlayers = useMemo(() => {
    if (!selectedAgeProfile?.similarPlayers?.length) {
      return [];
    }

    return selectedAgeProfile.similarPlayers
      .map((similar) => {
        const player = players.find(
          (candidate) => candidate.id === similar.playerId,
        );

        if (!player) {
          return null;
        }

        const ageProfile =
          player.ageProfiles?.find((profile) => profile.age === similar.age) ?? null;

        return { ...similar, player, ageProfile };
      })
      .filter(Boolean);
  }, [selectedAgeProfile, players]);

  const ageTimeline = useMemo(() => {
    if (!selectedPlayer?.ageProfiles?.length) {
      return [];
    }

    return selectedPlayer.ageProfiles.map((profile) => {
      const expandedSimilar =
        (profile.similarPlayers ?? [])
          .map((similar) => {
            const player = players.find(
              (candidate) => candidate.id === similar.playerId,
            );

            if (!player) {
              return null;
            }

            return { ...similar, player };
          })
          .filter(Boolean);

      return { profile, expandedSimilar };
    });
  }, [selectedPlayer, players]);

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>WNBA Player Similarity Finder</h1>
          <p>Explore player profiles and compare advanced metrics across the league.</p>
        </div>
      </header>

      <main className="app__layout">
        <aside className="app__sidebar" aria-label="Player navigation">
          <section className="panel panel--search">
            <h2>Search Players</h2>
            <input
              id="player-search"
              type="search"
              value={query}
              placeholder="Search by name, team, or position"
              onChange={(event) => setQuery(event.target.value)}
              disabled={loading}
            />
            {loading ? (
              <p className="empty-state">Loading players...</p>
            ) : error ? (
              <p className="empty-state" style={{ color: 'var(--accent)' }}>
                Error loading players: {error}
              </p>
            ) : filteredPlayers.length === 0 ? (
              <p className="empty-state">No players match your search.</p>
            ) : (
              <ul className="player-list" role="list">
                {filteredPlayers.map((player) => {
                  const isActive = player.id === selectedPlayerId;
                  return (
                    <li key={player.id}>
                      <button
                        type="button"
                        className={`player-list__item${isActive ? ' is-active' : ''}`}
                        onClick={() => setSelectedPlayerId(player.id)}
                        aria-pressed={isActive}
                      >
                        <span className="player-list__name">{player.name}</span>
                        <span className="player-list__meta">
                          {player.team} • {player.position}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

        <section className="panel">
          <h2>Similar Players</h2>
          {selectedPlayer && selectedAgeProfile ? (
            <p className="panel__subtitle">
              Comparing {selectedPlayer.name} at Age {selectedAgeProfile.age}
              {selectedAgeProfile.season ? ` • ${selectedAgeProfile.season} Season` : ''}
            </p>
          ) : null}
          {!selectedPlayer ? (
            <p className="empty-state">Select a player to see their closest comps.</p>
          ) : similarPlayers.length === 0 ? (
            <p className="empty-state">
              {selectedAgeProfile
                ? 'Similarity scores are not available for this age snapshot yet.'
                : 'Similarity scores are not available for this player yet.'}
            </p>
          ) : (
            <ul className="similarity-list" role="list">
                {similarPlayers.map((similar) => {
                  const activeAgeForPlayer = selectedAges[similar.player.id];
                  const isActive =
                    similar.player.id === selectedPlayerId &&
                    activeAgeForPlayer === similar.age;
                  const fallbackAge =
                    similar.age ??
                    similar.ageProfile?.age ??
                    similar.player.ageProfiles?.[0]?.age;
                  return (
                    <li key={`${similar.player.id}-${fallbackAge ?? 'default'}`}>
                      <button
                        type="button"
                        className={`similarity-list__item${isActive ? ' is-active' : ''}`}
                        onClick={() => {
                          if (fallbackAge !== undefined) {
                            setSelectedAges((prev) => ({
                              ...prev,
                              [similar.player.id]: fallbackAge,
                            }));
                          }
                          setSelectedPlayerId(similar.player.id);
                        }}
                        aria-pressed={isActive}
                      >
                        <div className="similarity-list__content">
                          <div className="similarity-list__identity">
                            <span className="similarity-list__name">
                              {similar.player.name}
                            </span>
                            <span className="similarity-list__meta">
                              Age {fallbackAge}
                              {similar.season ? ` • ${similar.season} Season` : ''}
                            </span>
                          </div>
                          <span className="similarity-list__score">
                            {similar.score}% match
                          </span>
                        </div>
                        {similar.ageProfile?.tagline ? (
                          <p className="similarity-list__note">
                            {similar.ageProfile.tagline}
                          </p>
                        ) : null}
                        <div className="similarity-list__bar" aria-hidden="true">
                          <span
                            className="similarity-list__bar-fill"
                            style={{ width: `${similar.score}%` }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>

        <section className="app__content">
          {!selectedPlayer ? (
            <div className="empty-state empty-state--centered">
              Select a player to load their profile and stat breakdowns.
            </div>
          ) : (
            <article className="player-profile">
              <div className="player-profile__summary">
                <img
                  src={selectedPlayer.imageUrl}
                  alt={`${selectedPlayer.name} headshot`}
                  className="player-profile__photo"
                />
                <div className="player-profile__details">
                  <div className="player-profile__meta">
                    <span className="player-profile__number">#{selectedPlayer.number}</span>
                    <span className="player-profile__position">
                      {selectedPlayer.position}
                    </span>
                    {selectedAgeProfile ? (
                      <span className="player-profile__age">
                        Age {selectedAgeProfile.age}
                      </span>
                    ) : null}
                  </div>
                  <h2>{selectedPlayer.name}</h2>
                  <p className="player-profile__team">
                    {selectedPlayer.team}
                    {selectedAgeProfile?.season ? (
                      <span className="player-profile__season">
                        {selectedAgeProfile.season} Season
                      </span>
                    ) : null}
                  </p>
                  <ul className="player-profile__badges">
                    <li>{selectedPlayer.height}</li>
                    <li>{selectedPlayer.weight}</li>
                    <li>{selectedPlayer.college}</li>
                  </ul>
                  <p className="player-profile__bio">{selectedPlayer.bio}</p>
                </div>
              </div>

              {selectedAgeProfile ? (
                <div className="player-profile__controls">
                  <div className="age-selector">
                    <label htmlFor={`age-select-${selectedPlayer.id}`}>Age focus</label>
                    <div className="age-selector__input">
                      <select
                        id={`age-select-${selectedPlayer.id}`}
                        value={selectedAgeProfile.age}
                        onChange={(event) => {
                          const nextAge = Number(event.target.value);

                          if (Number.isNaN(nextAge)) {
                            return;
                          }

                          setSelectedAges((prev) => ({
                            ...prev,
                            [selectedPlayer.id]: nextAge,
                          }));
                        }}
                      >
                        {selectedPlayer.ageProfiles?.map((profile) => (
                          <option key={profile.age} value={profile.age}>
                            Age {profile.age}
                            {profile.season ? ` • ${profile.season}` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedAgeProfile.season ? (
                        <span className="age-selector__season">
                          {selectedAgeProfile.season} Season
                        </span>
                      ) : null}
                    </div>
                    {selectedAgeProfile.tagline ? (
                      <p className="age-selector__note">{selectedAgeProfile.tagline}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {ageTimeline.length > 1 ? (
                <section className="age-timeline" aria-label="Age comparison timeline">
                  <header className="age-timeline__header">
                    <h3>Age Comparison Timeline</h3>
                    <p>
                      Jump between seasons to track how {selectedPlayer.name}&apos;s comps evolve.
                    </p>
                  </header>
                  <div className="age-timeline__grid">
                    {ageTimeline.map(({ profile, expandedSimilar }) => {
                      const isActiveAge = profile.age === selectedAgeProfile?.age;

                      return (
                        <article
                          key={profile.age}
                          className={`age-card${isActiveAge ? ' is-active' : ''}`}
                        >
                          <button
                            type="button"
                            className="age-card__switch"
                            onClick={() =>
                              setSelectedAges((prev) => ({
                                ...prev,
                                [selectedPlayer.id]: profile.age,
                              }))
                            }
                            aria-pressed={isActiveAge}
                          >
                            <span className="age-card__age">Age {profile.age}</span>
                            {profile.season ? (
                              <span className="age-card__season">{profile.season}</span>
                            ) : null}
                          </button>
                          {profile.tagline ? (
                            <p className="age-card__tagline">{profile.tagline}</p>
                          ) : null}
                          {expandedSimilar.length > 0 ? (
                            <ul className="age-card__similar" role="list">
                              {expandedSimilar.slice(0, 2).map((entry) => {
                                const fallbackAge =
                                  entry.age ??
                                  entry.player.ageProfiles?.[0]?.age ??
                                  null;
                                return (
                                  <li
                                    key={`${profile.age}-${entry.player.id}-${fallbackAge ?? 'na'}`}
                                  >
                                    <button
                                      type="button"
                                      className="age-card__similar-link"
                                      onClick={() => {
                                        if (fallbackAge !== null) {
                                          setSelectedAges((prev) => ({
                                            ...prev,
                                            [entry.player.id]: fallbackAge,
                                          }));
                                        }
                                        setSelectedPlayerId(entry.player.id);
                                      }}
                                    >
                                      <span className="age-card__similar-name">
                                        {entry.player.name}
                                      </span>
                                      <span className="age-card__similar-meta">
                                        {fallbackAge ? `Age ${fallbackAge}` : ''}
                                        {entry.season ? ` • ${entry.season}` : ''}
                                      </span>
                                      <span className="age-card__similar-score">
                                        {entry.score}% match
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="age-card__empty">Similarity matches coming soon.</p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <div className="stat-sections">
                {SECTION_ORDER.map((sectionKey) => {
                  const sectionStats = selectedAgeProfile?.stats?.[sectionKey] ?? [];
                  const metadata = SECTION_METADATA[sectionKey];

                  if (!metadata) {
                    return null;
                  }

                  return (
                    <StatCard
                      key={sectionKey}
                      title={metadata.title}
                      description={metadata.description}
                      rows={sectionStats}
                    />
                  );
                })}
              </div>
            </article>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
