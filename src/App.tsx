import React, { useState, useEffect } from 'react';
import './styles.css';

const teamAbbreviations = {
  'Arizona Diamondbacks': 'ARI',
  'Atlanta Braves': 'ATL',
  'Baltimore Orioles': 'BAL',
  'Boston Red Sox': 'BOS',
  'Chicago White Sox': 'CHW',
  'Chicago Cubs': 'CHC',
  'Cincinnati Reds': 'CIN',
  'Cleveland Guardians': 'CLE',
  'Colorado Rockies': 'COL',
  'Detroit Tigers': 'DET',
  'Houston Astros': 'HOU',
  'Kansas City Royals': 'KAN',
  'Los Angeles Angels': 'LAA',
  'Los Angeles Dodgers': 'LAD',
  'Miami Marlins': 'MIA',
  'Milwaukee Brewers': 'MIL',
  'Minnesota Twins': 'MIN',
  'New York Yankees': 'NYY',
  'New York Mets': 'NYM',
  Athletics: 'OAK',
  'Philadelphia Phillies': 'PHI',
  'Pittsburgh Pirates': 'PIT',
  'San Diego Padres': 'SD',
  'San Francisco Giants': 'SF',
  'Seattle Mariners': 'SEA',
  'St. Louis Cardinals': 'STL',
  'Tampa Bay Rays': 'TB',
  'Texas Rangers': 'TEX',
  'Toronto Blue Jays': 'TOR',
  'Washington Nationals': 'WAS',
};

// New HomerEntry component for HR entries in supplemental stats
function HomerEntry({ player, getLastName, onAdd, alreadyLogged }) {
  const [fading, setFading] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    onAdd(player);
    setFading(true);
  };

  return (
    <span className="homer-entry">
      {getLastName(player.person)} ({player.stats.batting.homeRuns} Season,{' '}
      {player.stats.career?.homeRuns || 'N/A'} Career)
      {alreadyLogged ? (
        <span className="added-indicator"> Added! </span>
      ) : (
        <button
          className={`mentaculous-button ${fading ? 'fade-out' : ''}`}
          onClick={handleClick}
        >
          Add
        </button>
      )}
    </span>
  );
}


function PlayerProfile({ playerId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [careerStats, setCareerStats] = useState(null);
  const [seasonStats, setSeasonStats] = useState([]);

  useEffect(() => {
    // Fetch player bio info
    fetch(`https://statsapi.mlb.com/api/v1/people/${playerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.people && data.people.length > 0) {
          setProfile(data.people[0]);
        }
      })
      .catch((err) =>
        console.error('Error fetching player bio for', playerId, err)
      );

    // Fetch career hitting stats
    fetch(
      `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=career&group=hitting`
    )
      .then((res) => res.json())
      .then((data) => {
        if (
          data.stats &&
          data.stats[0] &&
          data.stats[0].splits &&
          data.stats[0].splits.length > 0
        ) {
          setCareerStats(data.stats[0].splits[0].stat);
        }
      })
      .catch((err) =>
        console.error('Error fetching career stats for', playerId, err)
      );
    // Fetch year-by-year hitting stats
    fetch(
      `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=yearByYear&group=hitting`
    )
      .then((res) => res.json())
      .then((data) => {
        if (
          data.stats &&
          data.stats[0] &&
          data.stats[0].splits &&
          data.stats[0].splits.length > 0
        ) {
          setSeasonStats(data.stats[0].splits);
        }
      })
      .catch((err) =>
        console.error('Error fetching year-by-year stats for', playerId, err)
      );
  }, [playerId]);

  const getLastName = (person) => {
    if (person.lastName) return person.lastName;
    if (person.fullName) {
      const parts = person.fullName.split(' ');
      return parts[parts.length - 1];
    }
    return '';
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          × Close
        </button>
        {profile ? (
          <div className="player-profile">
            <h2>{profile.fullName}</h2>
            <p>
              <strong>Position:</strong> {profile.primaryPosition.name}
            </p>
            <p>
              <strong>Birth:</strong> {profile.birthDate} in {profile.birthCity}
              , {profile.birthCountry}
            </p>
            <p>
              <strong>Debut:</strong> {profile.mlbDebutDate}
            </p>
            <p>
              <strong>Height/Weight:</strong> {profile.height} /{' '}
              {profile.weight}
            </p>
            {careerStats ? (
              <div className="career-stats">
                <h3>Career Hitting Stats</h3>
                <p>
                  <strong>Games Played:</strong> {careerStats.gamesPlayed}
                </p>
                <p>
                  <strong>At Bats:</strong> {careerStats.atBats}
                </p>
                <p>
                  <strong>Hits:</strong> {careerStats.hits}
                </p>
                <p>
                  <strong>Home Runs:</strong> {careerStats.homeRuns}
                </p>
                <p>
                  <strong>Average:</strong> {careerStats.avg}
                </p>
                <p>
                  <strong>OPS:</strong> {careerStats.ops}
                </p>
              </div>
            ) : (
              <p>Loading career stats...</p>
            )}
            {Array.isArray(seasonStats) && seasonStats.length > 0 && (
              <div className="season-stats">
                <h3>Season-by-Season Hitting</h3>
                <table className="profile-stats-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Team</th>
                      <th>G</th>
                      <th>AB</th>
                      <th>H</th>
                      <th>HR</th>
                      <th>RBI</th>
                      <th>AVG</th>
                      <th>OPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonStats
                      .filter((s) => s?.season && s?.stat?.gamesPlayed > 0)
                      .map((s, index) => (
                        <tr key={index}>
                          <td>{s.season}</td>
                          <td>{s.team?.name || '—'}</td>
                          <td>{s.stat?.gamesPlayed ?? '-'}</td>
                          <td>{s.stat?.atBats ?? '-'}</td>
                          <td>{s.stat?.hits ?? '-'}</td>
                          <td>{s.stat?.homeRuns ?? '-'} </td>
                          <td>{s.stat?.rbi ?? '-'}</td>
                          <td>{s.stat?.avg ?? '-'}</td>
                          <td>{s.stat?.ops ?? '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <p>Loading profile...</p>
        )}
      </div>
    </div>
  );
}

function App() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [boxScore, setBoxScore] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('away');
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [activeTab, setActiveTab] = useState('games');
  const [mentaculous, setMentaculous] = useState({});
  const [mentaculousPage, setMentaculousPage] = useState(0)
  const [updatedPlayerId, setUpdatedPlayerId] = useState(null);
;

  // Function to add a player to mentaculous state
  const handleAddToMentaculous = (player, teamName) => {
    const playerId = Number(player.person.id);
    const currentHr = player.stats?.batting?.homeRuns;
  
    if (!currentHr) return;
  
    setMentaculous((prev) => {
      const existing = prev[playerId] || {
        playerName: player.person.fullName,
        teamName: teamName || 'Unknown',
        homeRuns: [],
      };
  
      if (existing.homeRuns.includes(currentHr)) return prev;
  
      return {
        ...prev,
        [playerId]: {
          ...existing,
          homeRuns: [...existing.homeRuns, currentHr],
        },
      };
    });
  
    setActiveTab('mentaculous');
    setUpdatedPlayerId(playerId);
    setTimeout(() => setUpdatedPlayerId(null), 1000);
  };
  
  useEffect(() => {
    const stored = localStorage.getItem('mentaculous');
    if (stored) {
      setMentaculous(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('mentaculous', JSON.stringify(mentaculous));
  }, [mentaculous]);

  useEffect(() => {
    fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`)
      .then((res) => res.json())
      .then((data) => setGames(data.dates[0]?.games || []))
      .catch((error) => console.error('Error fetching schedule:', error));
  }, [date]);

  const loadBoxScore = async (gamePk) => {
    try {
      // Fetch both boxscore and playByPlay concurrently
      const [boxScoreRes, playRes] = await Promise.all([
        fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`),
        fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/playByPlay`),
      ]);
      // Convert responses to JSON
      const boxScore = await boxScoreRes.json();
      const playByPlay = await playRes.json();

      // Build the pitching order map using a composite metric
      const pitchingOrderMap = {};
      if (playByPlay.allPlays) {
        playByPlay.allPlays.forEach((play, index) => {
          const pitcher = play.pitcher;
          if (pitcher) {
            const pid = String(pitcher.id);
            if (!(pid in pitchingOrderMap)) {
              pitchingOrderMap[pid] = index;
            }
          }
        });
      }

      // Get all players from the boxScore:
      const allPlayers = [
        ...Object.values(boxScore.teams.away.players),
        ...Object.values(boxScore.teams.home.players),
      ];

      // Fetch career stats for all players in parallel:
      const updatedPlayers = await Promise.all(
        allPlayers.map(async (player) => {
          try {
            const res = await fetch(
              `https://statsapi.mlb.com/api/v1/people/${player.person.id}/stats?stats=career&group=hitting`
            );
            const json = await res.json();
            const stat = json?.stats?.[0]?.splits?.[0]?.stat;
            if (stat) {
              player.stats.career = stat;
            }
          } catch (err) {
            console.error(
              `Error fetching career stats for ${player.person.fullName}`,
              err
            );
          }
          return player;
        })
      );

      // Build a player map (using string IDs for consistency)
      const playerMap = {};
      updatedPlayers.forEach((p) => {
        playerMap[String(p.person.id)] = p;
      });
      // Attach appearanceIndex to each updated player using the pitching order map:
      updatedPlayers.forEach((p) => {
        p.appearanceIndex = pitchingOrderMap[String(p.person.id)] ?? Infinity;
      });

      // Update both home and away team players in the boxScore:
      ['home', 'away'].forEach((teamKey) => {
        const team = boxScore.teams[teamKey];
        const updated = {};
        for (let key in team.players) {
          const id = String(team.players[key].person.id);
          updated[key] = playerMap[id] || team.players[key];
        }
        boxScore.teams[teamKey].players = updated;
      });

      setBoxScore(boxScore);
    } catch (error) {
      console.error('Error fetching box score:', error);
    }
  };

  const changeDate = (days) => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + days);
    setDate(currentDate.toISOString().split('T')[0]);
  };

  const getLastName = (person) => {
    if (person.lastName) return person.lastName;
    if (person.fullName) {
      const parts = person.fullName.split(' ');
      return parts[parts.length - 1];
    }
    return '';
  };

  const formatSupplementalStats = (team) => {
    const allPlayers = team.players || {};
    const stats = team.teamStats?.batting || {};

    // Use HomerEntry for players with home runs
    const homers = Object.entries(allPlayers)
    .filter(([_, p]) => p.stats?.batting?.homeRuns > 0)
    .map(([key, p]) => {
      const playerId = Number(p.person.id);
      const currentHr = p.stats?.batting?.homeRuns;
      const alreadyLogged = mentaculous[playerId]?.homeRuns?.includes(currentHr);
  
      return (
        <HomerEntry
          key={key}
          player={p}
          getLastName={getLastName}
          onAdd={(player) => handleAddToMentaculous(player, team.team.name)}
          alreadyLogged={alreadyLogged}
        />
      );
    });

    // Format doubles
    const doubles = Object.entries(allPlayers)
      .filter(([_, p]) => p.stats?.batting?.doubles > 0)
      .map(([_, p]) => {
        const pitchers = p.gameEvents?.doubles
          ?.map((d) => d.pitcher)
          .join(', ');
        return ` ${getLastName(p.person)} ${p.stats.batting.doubles}${
          pitchers ? `, ${pitchers}` : ''
        }`;
      });

    // Format total bases
    const totalBases = Object.entries(allPlayers)
      .filter(([_, p]) => p.stats?.batting?.totalBases > 0)
      .map(
        ([_, p]) => ` ${getLastName(p.person)} ${p.stats.batting.totalBases}`
      );

    // Format RBIs
    const rbis = Object.entries(allPlayers)
      .filter(([_, p]) => p.stats?.batting?.rbi > 0)
      .map(([_, p]) => {
        const breakdown = p.gameEvents?.rbiBreakdown;
        return ` ${getLastName(p.person)} ${p.stats.batting.rbi}${
          breakdown ? `, ${breakdown}` : ''
        }`;
      });

    // Format 2-out RBIs
    const twoOutRbis = Object.entries(allPlayers)
      .filter(([_, p]) => p.stats?.batting?.rbiWithTwoOuts > 0)
      .map(([_, p]) => getLastName(p.person));

    // Format RISP LOB
    const rispLob = Object.entries(allPlayers)
      .filter(([_, p]) => p.stats?.batting?.leftOnBaseInScoringPosition > 0)
      .map(([_, p]) => getLastName(p.person));

    return (
      <div className="supplemental-stats">
        <div className="stat-section">
          {homers.length > 0 && (
            <div className="stat-line">
              <strong>HR—</strong> {homers}
            </div>
          )}
          {doubles.length > 0 && (
            <div className="stat-line">2B—{doubles.join('; ')}.</div>
          )}
          {totalBases.length > 0 && (
            <div className="stat-line">TB—{totalBases.join('; ')}.</div>
          )}
          {rbis.length > 0 && (
            <div className="stat-line">RBI—{rbis.join('; ')}.</div>
          )}
          {twoOutRbis.length > 0 && (
            <div className="stat-line">2-out RBI—{twoOutRbis.join('; ')}.</div>
          )}
          {rispLob.length > 0 && (
            <div className="stat-line">
              Runners left in scoring position, 2 out—{rispLob.join('; ')}.
            </div>
          )}
          <div className="stat-line">
            Team RISP—{stats.runnersScoringPosition || '0-0'}.
          </div>
          <div className="stat-line">Team LOB—{stats.leftOnBase || 0}.</div>
        </div>

        {team.baserunning && (
          <div className="stat-section">
            <div className="stat-line">
              BASERUNNING
              {Object.entries(team.baserunning).map(([type, events]) => (
                <div key={type}>
                  {type.toUpperCase()}—
                  {events
                    .map(
                      (e) =>
                        `${e.player} (${e.number}, ${e.base} base off ${e.pitcher}/${e.catcher})`
                    )
                    .join('; ')}
                  .
                </div>
              ))}
            </div>
          </div>
        )}

        {team.fielding && (
          <div className="stat-section">
            <div className="stat-line">
              FIELDING
              {Object.entries(team.fielding).map(([type, events]) => (
                <div key={type}>
                  {type.toUpperCase()}—
                  {events
                    .map((e) => `${e.player} (${e.number}, ${e.description})`)
                    .join('; ')}
                  .
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getPitchingOrder = (player) => {
    const events = player.gameEvents?.pitching;
    if (!events || events.length === 0) return Infinity;
    const first = events[0];
    return first.inning + (first.atBatIndex || 0) * 0.01;
  };

  const renderPitchingStats = (team) => {
    const pitchers = Object.entries(team.players || {})
      .filter(([_, p]) => p.stats?.pitching?.inningsPitched)
      .map(([key, p]) => ({ key, ...p }))
      .sort(
        (a, b) =>
          (a.appearanceIndex ?? Infinity) - (b.appearanceIndex ?? Infinity)
      );

    const teamPitchingStats = team.teamStats?.pitching || {};

    return (
      <div className="team-stats">
        <h4>{team.team.name} — Pitching</h4>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Pitcher</th>
              <th>IP</th>
              <th>H</th>
              <th>R</th>
              <th>ER</th>
              <th>BB</th>
              <th>K</th>
              <th>HR</th>
              <th>P-S</th>
              <th>ERA</th>
            </tr>
          </thead>
          <tbody>
            {pitchers.map((player) => {
              const stats = player?.stats?.pitching;
              return (
                <tr key={player.person.id}>
                  <td>{player.person.fullName}</td>
                  <td>{stats.inningsPitched}</td>
                  <td>{stats.hits}</td>
                  <td>{stats.runs}</td>
                  <td>{stats.earnedRuns}</td>
                  <td>{stats.baseOnBalls}</td>
                  <td>{stats.strikeOuts}</td>
                  <td>{stats.homeRuns}</td>
                  <td>{`${stats.pitchesThrown}-${stats.strikes}`}</td>
                  <td>{stats.era}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="supplemental-stats">
          <div className="stat-line">
            WP—{teamPitchingStats.wildPitches || 0}.
          </div>
          <div className="stat-line">BK—{teamPitchingStats.balks || 0}.</div>
          <div className="stat-line">
            HBP—{teamPitchingStats.hitBatsmen || 0}.
          </div>
          <div className="stat-line">
            Pitches-Strikes—{teamPitchingStats.pitchesThrown || 0}-
            {teamPitchingStats.strikes || 0}.
          </div>
        </div>
      </div>
    );
  };

  const formatBattingLine = (player) => {
    if (!player.gameEvents?.atBats) return '';
    return player.gameEvents.atBats
      .sort((a, b) => a.inning - b.inning)
      .map((ab) => {
        switch (ab.event) {
          case 'Single':
            return '1B';
          case 'Double':
            return '2B';
          case 'Triple':
            return '3B';
          case 'Home Run':
            return 'HR';
          case 'Walk':
            return 'BB';
          case 'Strikeout':
            return 'K';
          case 'Ground Out':
            return 'GO';
          case 'Fly Out':
            return 'FO';
          case 'Line Out':
            return 'LO';
          case 'Pop Out':
            return 'PO';
          case 'Field Error':
            return 'E';
          case 'Fielders Choice':
            return 'FC';
          case 'Hit By Pitch':
            return 'HBP';
          case 'Sacrifice Fly':
            return 'SF';
          case 'Sacrifice Bunt':
            return 'SAC';
          default:
            return ab.event;
        }
      })
      .join(', ');
  };

  const renderBattingStats = (team) => {
    const players = Object.entries(team.players || {})
      .filter(([_, p]) => p.stats?.batting?.plateAppearances > 0)
      .map(([key, p]) => ({ key, ...p }));

    return (
      <div className="team-stats">
        <h4>{team.team.name} — Batting</h4>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>AB</th>
              <th>R</th>
              <th>H</th>
              <th>RBI</th>
              <th>BB</th>
              <th>SO</th>
              <th>LOB</th>
              <th>AVG</th>
              <th>OPS</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const stats = player?.stats?.batting;
              const battingLine = formatBattingLine(player);
              return (
                <React.Fragment key={player.person.id}>
                  <tr>
                    <td>
                      <span
                        className="clickable-name"
                        onClick={() =>
                          setSelectedPlayerId(Number(player.person.id))
                        }
                      >
                        {player.person.fullName}
                      </span>
                      {player.position.abbreviation !== 'P' && (
                        <span className="position">
                          {' '}
                          {player.position.abbreviation}
                        </span>
                      )}
                    </td>
                    <td>{stats.atBats}</td>
                    <td>{stats.runs}</td>
                    <td>{stats.hits}</td>
                    <td>{stats.rbi}</td>
                    <td>{stats.baseOnBalls}</td>
                    <td>{stats.strikeOuts}</td>
                    <td>{stats.leftOnBase}</td>
                    <td>{stats.avg}</td>
                    <td>{stats.ops}</td>
                  </tr>
                  {battingLine && (
                    <tr className="batting-line">
                      <td colSpan="10">{battingLine}</td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {formatSupplementalStats(team)}
      </div>
    );
  };

  const renderMentaculous = () => {
    const entries = Object.entries(mentaculous);
    const totalPages = Math.ceil(entries.length / 32) || 1;

    const start = mentaculousPage * 32;
    const currentEntries = entries.slice(start, start + 32);

    return (
      <div className="mentaculous-container">
        <div className="mentaculous-page notebook">
          <div className="notebook-title-line">
            <h2>Mentaculous</h2>
          </div>
          <div className="notebook-lines">
            {Array.from({ length: 33 }).map((_, i) => {
              if (i === 0)
                return <div key="spacer" className="notebook-line empty" />;
              const entry = currentEntries[i - 1];
              if (entry) {
                const [playerId, { playerName, homeRuns, teamName }] = entry;
                const normalizeName = (name: string) =>
                  Object.keys(teamAbbreviations).find(
                    (key) => key.toLowerCase() === name.toLowerCase()
                  );

                const matchedKey = normalizeName(teamName);
                const teamAbbr = matchedKey
                  ? teamAbbreviations[matchedKey]
                  : 'UNK';

                return (
                  <div
                    className={`notebook-line filled ${
                      updatedPlayerId === parseInt(playerId)
                        ? 'update-animate'
                        : ''
                    }`}
                    key={playerId}
                  >
                    <div className="notebook-left">
                      <span className="notebook-abbr">{teamAbbr}</span>
                    </div>
                    <div className="player-name">
                      {playerName} –{' '}
                      <span
                        className={
                          updatedPlayerId === parseInt(playerId)
                            ? 'update-animate'
                            : ''
                        }
                      >
                        {homeRuns[homeRuns.length - 1]},
                      </span>
                    </div>

                    <button
                      className="view-button"
                      onClick={() => setSelectedPlayerId(parseInt(playerId))}
                    >
                      View
                    </button>
                  </div>
                );
              } else {
                return <div key={i} className="notebook-line empty" />;
              }
            })}
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="pagination-controls">
          <button
            onClick={() => setMentaculousPage((prev) => Math.max(0, prev - 1))}
            disabled={mentaculousPage === 0}
          >
            ← Prev
          </button>
          <span className="page-info">
            Page {mentaculousPage + 1} of {totalPages}
          </span>
          <button
            onClick={() =>
              setMentaculousPage((prev) => Math.min(totalPages - 1, prev + 1))
            }
            disabled={mentaculousPage === totalPages - 1}
          >
            Next →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <div className="tab-header">
        <button
          className={activeTab === 'games' ? 'active' : ''}
          onClick={() => setActiveTab('games')}
        >
          Games
        </button>
        <button
          className={activeTab === 'mentaculous' ? 'active' : ''}
          onClick={() => setActiveTab('mentaculous')}
        >
          Mentaculous
        </button>
      </div>

      {activeTab === 'games' && (
        <>
          <div className="date-selector">
            <button onClick={() => changeDate(-1)}>←</button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button onClick={() => changeDate(1)}>→</button>
          </div>

          {!selectedGame && (
            <div className="games-list">
              {games.map((game) => {
                const awayName = game.teams.away.team.name;
                const homeName = game.teams.home.team.name;

                return (
                  <div
                    key={game.gamePk}
                    className="game-item"
                    onClick={() => {
                      setSelectedGame(game);
                      loadBoxScore(game.gamePk);
                    }}
                  >
                    <div className="game-matchup">
                      <div className="team-block">
                        <div className="team-name">{awayName}</div>
                      </div>
                      <div className="vs-text">vs</div>
                      <div className="team-block">
                        <div className="team-name">{homeName}</div>
                      </div>
                    </div>
                    <div className="game-status">
                      {game.status.detailedState}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedGame && !boxScore && (
            <div className="loading">Loading box score...</div>
          )}

          {selectedGame && boxScore && (
            <div className="box-score">
              <button
                onClick={() => {
                  setSelectedGame(null);
                  setBoxScore(null);
                }}
              >
                ← Back to Games
              </button>

              <div className="view-toggle">
                <button
                  className={selectedTeam === 'away' ? 'active' : ''}
                  onClick={() => setSelectedTeam('away')}
                >
                  {(() => {
                    const teamName = boxScore.teams?.away?.team?.name;
                    return (
                      <>
                        {teamName}
                      </>
                    );
                  })()}
                </button>
                <button
                  className={selectedTeam === 'home' ? 'active' : ''}
                  onClick={() => setSelectedTeam('home')}
                >
                  {(() => {
                    const teamName = boxScore.teams?.home?.team?.name;
                    return (
                      <>
                        {teamName}
                      </>
                    );
                  })()}
                </button>
              </div>

              <div className="team-section">
                {selectedTeam === 'away' && (
                  <>
                    {renderBattingStats(boxScore.teams?.away)}
                    {renderPitchingStats(boxScore.teams?.away)}
                  </>
                )}
                {selectedTeam === 'home' && (
                  <>
                    {renderBattingStats(boxScore.teams?.home)}
                    {renderPitchingStats(boxScore.teams?.home)}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'mentaculous' && renderMentaculous()}

      {selectedPlayerId && (
        <PlayerProfile
          playerId={selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </div>
  );
}

export default App;
