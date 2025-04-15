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
const teamAbbreviationMap = Object.entries(teamAbbreviations).reduce(
  (map, [name, abbr]) => {
    map[name.toLowerCase()] = abbr;
    return map;
  },
  {} as Record<string, string>
);

function getTeamAbbreviation(name: string = ''): string {
  return teamAbbreviationMap[name.trim().toLowerCase()] || 'UNK';
}

// New HomerEntry component for HR entries in supplemental stats
interface HomerEntryProps {
  player: any; // Replace `any` with a more specific type if possible
  getLastName: (person: any) => string;
  onAdd: (player: any, hr: any, teamName: any) => void;
  onRemove: (playerId: number, homeRun: number) => void; // Add the correct type for `onRemove`
  mentaculous: any;
}
function HomerEntry({
  player,
  getLastName,
  onAdd,
  onRemove,
  mentaculous,
}: HomerEntryProps) {
  const [fadingIndex, setFadingIndex] = useState<number | null>(null);

  if (!player.homeRunProgress || player.homeRunProgress.length === 0) {
    return (
      <span className="homer-entry">
        <strong>{getLastName(player.person)}</strong>{' '}
        {`${player.stats.seasonTotalHR ?? '??'} Season, ${player.stats.career?.homeRuns || 'N/A'} Career`}
      </span>
    );
  }
  

  return (
    <>
      {player.homeRunProgress.map((hr, index) => {
        const alreadyLoggedForThis = mentaculous[player.person.id]?.homeRuns?.includes(hr.hrId);

        return (
          <span key={index} className="homer-entry">
            <strong>{getLastName(player.person)}</strong>{' '}
            {`${hr.seasonHRNumber} Season, ${hr.careerHRNumber} Career`}

            {alreadyLoggedForThis ? (
              <>
                <span className="added-indicator"> Added! </span>
                <button
                  className="remove-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(player.person.id, hr.seasonHRNumber);
                  }}
                >
                  Remove HR
                </button>
              </>
            ) : (
              <button
                className={`mentaculous-button ${fadingIndex === index ? 'fade-out' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(player, hr, player.team?.name ?? 'Unknown');
                  setFadingIndex(index);
                }}
              >
                Add
              </button>
            )}
          </span>
        );
      })}
    </>
  );
}

export {HomerEntry};

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
const handleRemoveHomeRun = (playerId, hrId) => {
  setMentaculous((prev) => {
    const player = prev[playerId];
    if (!player) return prev;

    const updatedHomeRuns = player.homeRuns.filter((hr) => hr !== hrId);
    if (updatedHomeRuns.length === 0) {
      const { [playerId]: _, ...remainingPlayers } = prev;
      return remainingPlayers;
    }

    return {
      ...prev,
      [playerId]: {
        ...player,
        homeRuns: updatedHomeRuns,
      },
    };
  });
};

  
  // Function to add a player to mentaculous state
  const handleAddToMentaculous = (player, hr, teamName) => {
    const playerId = Number(player.person.id);
    if (!hr?.hrId) return;
  
    setMentaculous((prev) => {
      const existing = prev[playerId] || {
        playerName: player.person.fullName,
        teamName: teamName || 'Unknown',
        homeRuns: [],
        addedAt: Date.now(),
      };
  
      if (existing.homeRuns.includes(hr.hrId)) return prev;
  
      return {
        ...prev,
        [playerId]: {
          ...existing,
          homeRuns: [...existing.homeRuns, hr.hrId],
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
      const res = await fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`);
      const boxScore = await res.json();
  
      const awayPlayers = boxScore?.teams?.away?.players ?? {};
      const homePlayers = boxScore?.teams?.home?.players ?? {};
      const allPlayers = [...Object.values(awayPlayers), ...Object.values(homePlayers)];
  
      const today = new Date().toISOString().split('T')[0];
  
      // Step 1: Filter players who hit a home run (season total increased)
      const playersWithHRs = allPlayers.filter((p) => {
        return p.seasonStats?.batting?.homeRuns > 0;
      });
  
      // Step 2: Fetch career HRs for just those players
      const careerHRs = {};
      await Promise.all(
        playersWithHRs.map(async (p) => {
          const playerId = p.person.id;
          try {
            const res = await fetch(
              `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=career&group=hitting`
            );
            const data = await res.json();
            const hr = data?.stats?.[0]?.splits?.[0]?.stat?.homeRuns ?? 0;
            careerHRs[playerId] = hr;
          } catch (err) {
            console.warn(`Career HR fetch failed for player ${playerId}`, err);
          }
        })
      );
  
      // Step 3: Enrich players with HR progress
      const updatedPlayers = allPlayers.map((player) => {
        if (!player.stats) return player;
  
        if (player.seasonStats?.batting?.homeRuns != null) {
          player.stats.seasonTotalHR = player.seasonStats.batting.homeRuns;
        }
  
        const seasonHR = player.stats.seasonTotalHR;
        const careerHR = careerHRs[player.person.id];
  
        if (
          typeof player.stats?.batting?.homeRuns === 'number' &&
          typeof player.seasonStats?.batting?.homeRuns === 'number' &&
          typeof careerHR === 'number'
        ) {
          const hrToday = player.stats.batting.homeRuns;
          const seasonHRTotal = player.seasonStats.batting.homeRuns;
        
          // Build one HR entry per HR hit today
          const homeRunProgress = [];
          for (let i = 0; i < hrToday; i++) {
            const seasonHRNumber = seasonHRTotal - i;
            const careerHRNumber = careerHR - i;
        
            homeRunProgress.unshift({
              seasonHRNumber,
              careerHRNumber,
              hrId: `${player.person.id}_${today}_${seasonHRNumber}`,
            });
          }
        
          player.homeRunProgress = homeRunProgress;
        }
        
  
        return player;
      });
  
      // Step 4: Rebuild player map and merge back
      const playerMap = updatedPlayers.reduce((map, p) => {
        map[String(p.person.id)] = p;
        return map;
      }, {});
  
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
      console.error('Error loading box score:', error);
    }
  };
  
  
  const changeDate = (days) => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + days);
    setDate(currentDate.toISOString().split('T')[0]);
  };

  function trackHomeRunProgression(playByPlay, careerTotalsMap = {}) {
    const seasonTracker = {};
    const careerTracker = {};
    const results = [];
  
    for (const play of playByPlay.allPlays || []) {
      const { batter, result, about } = play;
      if (!batter || result.eventType !== 'home_run') continue;
  
      const playerId = String(batter.id);
      const date = about?.startTime?.split('T')[0];
      const seasonHR = (seasonTracker[playerId] = (seasonTracker[playerId] || 0) + 1);
      const careerHR = (careerTracker[playerId] = (careerTracker[playerId] || (careerTotalsMap[playerId] || 0)) + 1);
  
      results.push({
        playerId,
        playerName: batter.fullName,
        seasonHRNumber: seasonHR,
        careerHRNumber: careerHR,
        date,
        inning: about?.inning,
        hrId: `${playerId}_${date}_${seasonHR}`,
      });
    }
  
    return results;
  }
  
  
  const getLastName = (person) => {
    // Prefer explicit lastName if available
    if (person.lastName) return person.lastName;
    // Otherwise, if a boxscoreName is provided, use it
    if (person.boxscoreName) return person.boxscoreName;
    // Otherwise, split the fullName and use the last portion
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
  .map(([key, p]) => (
    <HomerEntry
      key={key}
      player={p}
      getLastName={getLastName}
      onAdd={(player, hr) => handleAddToMentaculous(player, hr, team.team?.name)}
      onRemove={handleRemoveHomeRun}
      mentaculous={mentaculous} // ✅ required for per-HR tracking
    />
  ));


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
    const entries = Object.entries(mentaculous).sort((a, b) => (a[1].addedAt ?? 0) - (b[1].addedAt ?? 0)
    );
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
                const teamAbbr = getTeamAbbreviation(teamName);

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
<div className="player-info">
  <div className="player-name">
    {playerName} –{' '}
    <span
      className={
        updatedPlayerId === parseInt(playerId) ? 'update-animate' : ''
      }
    >
      {homeRuns.length}
    </span>
  </div>
  <div className="player-buttons">
    <button
      className="view-button"
      onClick={() => setSelectedPlayerId(parseInt(playerId))}
    >
      View
    </button>
    <button
      className="remove-button"
      onClick={() => {
        const homeRunToRemove = homeRuns[homeRuns.length - 1];
        handleRemoveHomeRun(playerId, homeRunToRemove);
      }}
    >
      Remove
    </button>
  </div>
</div>

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