import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import { fetchFromFirebase, saveToFirebase, fetchStealaculousFromFirebase, saveStealaculousToFirebase } from './firebase';
import { historical2025 } from './historical2025';

// Function to remove accents from text for custom font compatibility
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

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

function getTeamLogoUrl(teamId: number) {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

const MLB_TEAM_COLORS: Record<number, { primary: string; text: string }> = {
  108: { primary: '#BA0021', text: '#fff' }, // Angels
  109: { primary: '#A71930', text: '#fff' }, // Diamondbacks
  110: { primary: '#DF4601', text: '#fff' }, // Orioles
  111: { primary: '#BD3039', text: '#fff' }, // Red Sox
  112: { primary: '#0E3386', text: '#fff' }, // Cubs
  113: { primary: '#C6011F', text: '#fff' }, // Reds
  114: { primary: '#00385D', text: '#fff' }, // Guardians
  115: { primary: '#33006F', text: '#fff' }, // Rockies
  116: { primary: '#0C2340', text: '#FA4616' }, // Tigers
  117: { primary: '#002D62', text: '#EB6E1F' }, // Astros
  118: { primary: '#004687', text: '#C09A5B' }, // Royals
  119: { primary: '#005A9C', text: '#fff' }, // Dodgers
  120: { primary: '#AB0003', text: '#fff' }, // Nationals
  121: { primary: '#002D72', text: '#FF5910' }, // Mets
  133: { primary: '#003831', text: '#EFB21E' }, // Athletics
  134: { primary: '#27251F', text: '#FDB827' }, // Pirates
  135: { primary: '#2F241D', text: '#FFC425' }, // Padres
  136: { primary: '#0C2C56', text: '#005C5C' }, // Mariners
  137: { primary: '#27251F', text: '#FD5A1E' }, // Giants
  138: { primary: '#C41E3A', text: '#fff' }, // Cardinals
  139: { primary: '#092C5C', text: '#8FBCE6' }, // Rays
  140: { primary: '#003278', text: '#fff' }, // Rangers
  141: { primary: '#134A8E', text: '#fff' }, // Blue Jays
  142: { primary: '#002B5C', text: '#D31145' }, // Twins
  143: { primary: '#E81828', text: '#fff' }, // Phillies
  144: { primary: '#CE1141', text: '#fff' }, // Braves
  145: { primary: '#27251F', text: '#fff' }, // White Sox
  146: { primary: '#00A3E0', text: '#fff' }, // Marlins
  147: { primary: '#003087', text: '#fff' }, // Yankees
  158: { primary: '#12284B', text: '#FFC52F' }, // Brewers
};

function getTeamAbbreviation(name: string = ''): string {
  return teamAbbreviationMap[name.trim().toLowerCase()] || 'UNK';
}

function parseHrId(hrId: string) {
  const [, dateStr, hrNum] = hrId.split('_');
  return {
    date: dateStr, // '2024-04-15'
    seasonHRNumber: Number(hrNum),
  };
}

// New HomerEntry component for HR entries in supplemental stats
interface HomerEntryProps {
  player: any; // Replace `any` with a more specific type if possible
  getLastName: (person: any) => string;
  onAdd: (player: any, hr: any, teamName: any) => void;
  onRemove: (playerId: string, hrId: string) => void; // Add the correct type for `onRemove`
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

  // Get mentaculous HR count for this player
  const mentaculousHRCount = mentaculous[player.person.id]?.homeRuns?.length || 0;
  const seasonTotalHR = player.stats.seasonTotalHR ?? 0;

  return (
    <>
      {player.homeRunProgress.map((hr: any, index: number) => {
        const alreadyLoggedForThis = mentaculous[player.person.id]?.homeRuns?.some((h: any) => h.hrId === hr.hrId);
        // Only allow add if mentaculous HR count < season total
        const canAdd = !alreadyLoggedForThis && mentaculousHRCount < seasonTotalHR;
        return (
          <span key={index} className="homer-entry">
            <strong>{getLastName(player.person)}</strong>{' '}
            {`${hr.seasonHRNumber} Season, ${hr.careerHRNumber} Career`}

            {alreadyLoggedForThis ? (
              <>
                <span className="added-indicator"> Added! </span>
                <button
                  className="remove-button"
                  onClick={e => {
                    e.stopPropagation();
                    onRemove(String(player.person.id), hr.hrId);
                  }}
                >
                  Remove HR
                </button>
              </>
            ) : (
              canAdd && (
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
              )
            )}
          </span>
        );
      })}
    </>
  );
}

export { HomerEntry };

function PlayerProfile({ playerId, onClose }: { playerId: number; onClose: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [careerStats, setCareerStats] = useState<any>(null);
  const [seasonStats, setSeasonStats] = useState<{ hitting?: any[], pitching?: any[] }>({});
  const [isPitcher, setIsPitcher] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(false);
  const [rankings, setRankings] = useState<Record<string, { rank: number; value: string }>>({});

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // Fetch player bio info
    fetch(`https://statsapi.mlb.com/api/v1/people/${playerId}`, { signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.people && data.people.length > 0) {
          const player = data.people[0];
          setProfile(player);
          const position = player.primaryPosition?.name || '';
          const pitcherCheck = position.toLowerCase().includes('pitcher') ||
            position.toLowerCase() === 'p';
          setIsPitcher(pitcherCheck);
        }
      })
      .catch((err) => { if (err.name !== 'AbortError') console.error('Error fetching player bio for', playerId, err); });

    fetch(`https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=career&group=hitting`, { signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.stats?.[0]?.splits?.length > 0) {
          setCareerStats((prev: any) => ({ ...prev, hitting: data.stats[0].splits[0].stat }));
        }
      })
      .catch((err) => { if (err.name !== 'AbortError') console.error('Error fetching career hitting stats for', playerId, err); });

    fetch(`https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=career&group=pitching`, { signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.stats?.[0]?.splits?.length > 0) {
          setCareerStats((prev: any) => ({ ...prev, pitching: data.stats[0].splits[0].stat }));
        }
      })
      .catch((err) => { if (err.name !== 'AbortError') console.error('Error fetching career pitching stats for', playerId, err); });

    fetch(`https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=yearByYear&group=hitting`, { signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.stats?.[0]?.splits?.length > 0) {
          setSeasonStats(prev => ({ ...prev, hitting: data.stats[0].splits }));
        }
      })
      .catch((err) => { if (err.name !== 'AbortError') console.error('Error fetching year-by-year hitting stats for', playerId, err); });

    fetch(`https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=yearByYear&group=pitching`, { signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.stats?.[0]?.splits?.length > 0) {
          setSeasonStats(prev => ({ ...prev, pitching: data.stats[0].splits }));
        }
      })
      .catch((err) => { if (err.name !== 'AbortError') console.error('Error fetching year-by-year pitching stats for', playerId, err); });

    const fetchTransactions = async () => {
      setLoadingTransactions(true);
      try {
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/transactions?playerId=${playerId}&limit=100&order=desc`,
          { signal }
        );
        const data = await response.json();
        if (data.transactions) {
          const mlbTransactions = data.transactions.filter((transaction: any) => {
            if (transaction.typeCode === 'NC' ||
                transaction.description?.toLowerCase().includes('number') ||
                transaction.description?.toLowerCase().includes('#')) {
              return false;
            }
            const majorTransactionTypes = ['SGN', 'TRD', 'REL', 'SE', 'DFA', 'CL', 'EXT', 'PUR', 'FA'];
            const fromTeamIsMLB = transaction.fromTeam &&
              (transaction.fromTeam.id >= 108 && transaction.fromTeam.id <= 158);
            const toTeamIsMLB = transaction.toTeam &&
              (transaction.toTeam.id >= 108 && transaction.toTeam.id <= 158);
            return majorTransactionTypes.includes(transaction.typeCode) || fromTeamIsMLB || toTeamIsMLB;
          });
          setTransactions(mlbTransactions);
        } else {
          setTransactions([]);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching player transactions:', err);
          setTransactions([]);
        }
      } finally {
        if (!signal.aborted) setLoadingTransactions(false);
      }
    };

    fetchTransactions();
    return () => controller.abort();
  }, [playerId]);

  // Look up this player in top-500 records; fetch missing categories on demand
  useEffect(() => {
    const categories = [
      { key: 'homeRuns',     label: 'HR',  group: 'hitting' },
      { key: 'runsBattedIn', label: 'RBI', group: 'hitting' },
      { key: 'runs',         label: 'R',   group: 'hitting' },
      { key: 'hits',         label: 'H',   group: 'hitting' },
      { key: 'stolenBases',  label: 'SB',  group: 'hitting' },
      { key: 'doubles',      label: '2B',  group: 'hitting' },
      { key: 'triples',      label: '3B',  group: 'hitting' },
      { key: 'baseOnBalls',  label: 'BB',  group: 'hitting' },
      { key: 'strikeOuts',   label: 'SO',  group: 'pitching' },
      { key: 'wins',         label: 'W',   group: 'pitching' },
      { key: 'saves',        label: 'SV',  group: 'pitching' },
    ];

    const TTL_HOURS = 24;
    const TTL_MS = TTL_HOURS * 60 * 60 * 1000;

    const readCache = (cacheKey: string): any[] | null => {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed?.ts && Date.now() - parsed.ts > TTL_MS) return null;
        const list = parsed?.data ?? parsed;
        return Array.isArray(list) ? list : null;
      } catch { return null; }
    };

    const fetchCategory = async (cat: { key: string; label: string; group: string }): Promise<any[]> => {
      const cacheKey = `records_v2_500_${cat.group}_${cat.key}`;
      const existing = readCache(cacheKey);
      if (existing) return existing;

      const pages = 5;
      const limit = 100;
      const allEntries: any[] = [];
      for (let page = 0; page < pages; page++) {
        try {
          const url = `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=${cat.key}&statType=career&limit=${limit}&offset=${page * limit}&statGroup=${cat.group}`;
          const res = await fetch(url);
          if (!res.ok) break;
          const json = await res.json();
          const leaders = json?.leagueLeaders?.[0]?.leaders ?? [];
          allEntries.push(...leaders);
          if (leaders.length < limit) break;
        } catch { break; }
      }
      if (allEntries.length > 0) {
        try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: allEntries })); } catch { /* quota */ }
      }
      return allEntries;
    };

    let cancelled = false;

    // Seed with any already-cached data immediately
    const found: Record<string, { rank: number; value: string }> = {};
    for (const cat of categories) {
      const list = readCache(`records_v2_500_${cat.group}_${cat.key}`);
      if (!list) continue;
      const entry = list.find((e: any) => e.person?.id === playerId);
      if (entry) found[cat.label] = { rank: Number(entry.rank), value: String(entry.value) };
    }
    setRankings({ ...found });

    // Fetch any missing categories in background
    (async () => {
      for (const cat of categories) {
        if (cancelled) return;
        const cacheKey = `records_v2_500_${cat.group}_${cat.key}`;
        if (readCache(cacheKey)) continue; // already seeded above
        const list = await fetchCategory(cat);
        if (cancelled) return;
        const entry = list.find((e: any) => e.person?.id === playerId);
        if (entry) {
          setRankings(prev => ({ ...prev, [cat.label]: { rank: Number(entry.rank), value: String(entry.value) } }));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [playerId]);

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <div className="modal-body">
        {profile ? (
          <div className="player-profile">
            <img
              src={`https://img.mlbstatic.com/mlb-photos/image/upload/v1/people/${profile.id}/headshot/67/current.png`}
              alt={`${profile.fullName} headshot`}
              className="player-headshot"
            />
            <h2>{profile.fullName}</h2>
            <p>
              <strong>Position:</strong> {profile.primaryPosition.name}
            </p>
            <p>
              <strong>Birth:</strong> {profile.birthDate} in {profile.birthCity}
              , {profile.birthStateProvince ?? ''} {profile.birthCountry}
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
                {isPitcher && careerStats.pitching ? (
                  <>
                    <h3>Career Pitching Stats</h3>
                    <p><strong>Wins:</strong> {careerStats.pitching.wins}{rankings['W'] && <span className="modal-rank">#{rankings['W'].rank} all-time</span>}</p>
                    <p><strong>Losses:</strong> {careerStats.pitching.losses}</p>
                    <p><strong>ERA:</strong> {careerStats.pitching.era}</p>
                    <p><strong>Quality Starts:</strong> {careerStats.pitching.qualityStarts || 0}</p>
                    <p><strong>Innings Pitched:</strong> {careerStats.pitching.inningsPitched}</p>
                    <p><strong>Strikeouts:</strong> {careerStats.pitching.strikeOuts}{rankings['SO'] && <span className="modal-rank">#{rankings['SO'].rank} all-time</span>}</p>
                    <p><strong>Saves:</strong> {careerStats.pitching.saves}{rankings['SV'] && <span className="modal-rank">#{rankings['SV'].rank} all-time</span>}</p>
                    <p><strong>WHIP:</strong> {careerStats.pitching.whip}</p>
                  </>
                ) : careerStats.hitting ? (
                  <>
                    <h3>Career Hitting Stats</h3>
                    <p><strong>Games Played:</strong> {careerStats.hitting.gamesPlayed}</p>
                    <p><strong>At Bats:</strong> {careerStats.hitting.atBats}</p>
                    <p><strong>Hits:</strong> {careerStats.hitting.hits}{rankings['H'] && <span className="modal-rank">#{rankings['H'].rank} all-time</span>}</p>
                    <p><strong>Runs:</strong> {careerStats.hitting.runs}{rankings['R'] && <span className="modal-rank">#{rankings['R'].rank} all-time</span>}</p>
                    <p><strong>RBI:</strong> {careerStats.hitting.rbi}{rankings['RBI'] && <span className="modal-rank">#{rankings['RBI'].rank} all-time</span>}</p>
                    <p><strong>Home Runs:</strong> {careerStats.hitting.homeRuns}{rankings['HR'] && <span className="modal-rank">#{rankings['HR'].rank} all-time</span>}</p>
                    <p><strong>Stolen Bases:</strong> {careerStats.hitting.stolenBases}{rankings['SB'] && <span className="modal-rank">#{rankings['SB'].rank} all-time</span>}</p>
                    <p><strong>Doubles:</strong> {careerStats.hitting.doubles}{rankings['2B'] && <span className="modal-rank">#{rankings['2B'].rank} all-time</span>}</p>
                    <p><strong>Triples:</strong> {careerStats.hitting.triples}{rankings['3B'] && <span className="modal-rank">#{rankings['3B'].rank} all-time</span>}</p>
                    <p><strong>Walks:</strong> {careerStats.hitting.baseOnBalls}{rankings['BB'] && <span className="modal-rank">#{rankings['BB'].rank} all-time</span>}</p>
                    <p><strong>Average:</strong> {careerStats.hitting.avg}</p>
                    <p><strong>OPS:</strong> {careerStats.hitting.ops}</p>
                  </>
                ) : null}
              </div>
            ) : (
              <p>Loading career stats...</p>
            )}
            {seasonStats && (
              <div className="season-stats">
                {isPitcher && seasonStats.pitching && Array.isArray(seasonStats.pitching) && seasonStats.pitching.length > 0 ? (
                  <>
                    <h3>Season-by-Season Pitching</h3>
                    <div className="table-scroll-wrapper">
                    <table className="profile-stats-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Team</th>
                          <th>W</th>
                          <th>L</th>
                          <th>ERA</th>
                          <th>IP</th>
                          <th>SO</th>
                          <th>QS</th>
                          <th>SV</th>
                          <th>HLD</th>
                          <th>WHIP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seasonStats.pitching
                          .filter((s: any) => s?.season && (s?.stat?.gamesPlayed > 0 || s?.stat?.games > 0))
                          .sort((a: any, b: any) => parseInt(a.season) - parseInt(b.season))
                          .map((s: any, index: number) => (
                            <tr key={index}>
                              <td>{s.season}</td>
                              <td>{s.team?.name || '—'}</td>
                              <td>{s.stat?.wins ?? '-'}</td>
                              <td>{s.stat?.losses ?? '-'}</td>
                              <td>{s.stat?.era ?? '-'}</td>
                              <td>{s.stat?.inningsPitched ?? '-'}</td>
                              <td>{s.stat?.strikeOuts ?? '-'}</td>
                              <td>{s.stat?.qualityStarts ?? '-'}</td>
                              <td>{s.stat?.saves ?? '-'}</td>
                              <td>{s.stat?.holds ?? '-'}</td>
                              <td>{s.stat?.whip ?? '-'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    </div>
                  </>
                ) : seasonStats.hitting && Array.isArray(seasonStats.hitting) && seasonStats.hitting.length > 0 ? (
                  <>
                    <h3>Season-by-Season Hitting</h3>
                    <div className="table-scroll-wrapper">
                    <table className="profile-stats-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Team</th>
                          <th>G</th>
                          <th>AB</th>
                          <th>H</th>
                          <th>R</th>
                          <th>BB</th>
                          <th>HR</th>
                          <th>RBI</th>
                          <th>SB</th>
                          <th>AVG</th>
                          <th>OBP</th>
                          <th>OPS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seasonStats.hitting
                          .filter((s: any) => s?.season && (s?.stat?.gamesPlayed > 0 || s?.stat?.games > 0))
                          .sort((a: any, b: any) => parseInt(a.season) - parseInt(b.season))
                          .map((s: any, index: number) => (
                            <tr key={index}>
                              <td>{s.season}</td>
                              <td>{s.team?.name || '—'}</td>
                              <td>{s.stat?.gamesPlayed ?? s.stat?.games ?? '-'}</td>
                              <td>{s.stat?.atBats ?? '-'}</td>
                              <td>{s.stat?.hits ?? '-'}</td>
                              <td>{s.stat?.runs ?? '-'}</td>
                              <td>{s.stat?.baseOnBalls ?? '-'}</td>
                              <td>{s.stat?.homeRuns ?? '-'}</td>
                              <td>{s.stat?.rbi ?? '-'}</td>
                              <td>{s.stat?.stolenBases ?? '-'}</td>
                              <td>{s.stat?.avg ?? '-'}</td>
                              <td>{s.stat?.obp ?? '-'}</td>
                              <td>{s.stat?.ops ?? '-'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* Transaction History Section */}
            <div className="transaction-history">
              <h3>Transaction History</h3>
              {loadingTransactions ? (
                <p>Loading transaction history...</p>
              ) : transactions.length > 0 ? (
                <div className="transactions-list">
                  {transactions.map((transaction: any, index: number) => (
                    <div key={transaction.id || index} className="transaction-item">
                      <div className="transaction-date">
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-description">{transaction.description}</div>
                        {transaction.fromTeam && transaction.toTeam && (
                          <div className="transaction-teams">
                            {transaction.fromTeam.name} → {transaction.toTeam.name}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No transaction history available for this player.</p>
              )}
            </div>
          </div>
        ) : (
          <p>Loading profile...</p>
        )}
        </div>
      </div>
    </div>
  );
}

type HomeRun = {
  hrId: string;
  opponent?: string;
  seasonTotalHR?: number;
  careerHRNumber?: number;
};

type MentaculousPlayer = {
  playerName: string;
  teamName: string;
  teamId: string;
  homeRuns: HomeRun[];
  addedAt?: number;
};

type StolenBaseEntry = {
  sbId: string;        // `${playerId}_${date}`
  gameSBs: number;
  seasonTotalSB: number;
  opponent?: string;
};

type StealaculousPlayer = {
  playerName: string;
  teamName: string;
  teamId: string;
  stolenBases: StolenBaseEntry[];
  addedAt?: number;
};

// User Selection Component
function UserSelection({ onUserSelect }: { onUserSelect: (userId: string) => void }) {
  return (
    <div className="user-selection-overlay">
      <div className="user-selection-modal">
        <h2>Select User</h2>
        <div className="user-buttons">
          <button
            className="user-button sam"
            onClick={() => onUserSelect('Sam beson')}
          >
            Sam
          </button>
          <button
            className="user-button jalk"
            onClick={() => onUserSelect('Jalk McUser')}
          >
            Jalk
          </button>
          <button
            className="user-button mike"
            onClick={() => onUserSelect('Mike')}
          >
            Mike
          </button>
        </div>
      </div>
    </div>
  );
}

type MilestoneEvent = {
  playerId: string;
  playerName: string;
  statKey: string;
  statLabel: string;
  crossingValue: number;     // career total at the crossing game
  crossingRank: number;      // all-time rank at the moment of the crossing
  tiedPersonIds: number[];   // MLB person IDs tied with the player at the crossing rank
  tiedNames: string[];       // names tied with the player at the crossing rank
  seasonValue: number;       // season total at the crossing game
  passedPersonId: number;    // MLB person ID of the all-time leader they passed
  passedName: string;        // name of the all-time leader they passed
  passedValue: number;       // that person's career total
  passedRank: number;        // their rank in the top 500
  date: string | null;       // YYYY-MM-DD when the crossing happened
};

type DisplacedEntry = {
  personId: number;
  fullName: string;
  pre2026Rank: number;    // rank at start of 2026 season
  currentRank: number;    // rank now (from career top 600 list)
  pre2026Value: number;   // career total at start of 2026
  currentValue: number;   // career total now
  displacedBy: Array<{ personId: number; fullName: string; gained: number; currentRank: number }>;
};

type DisplacedResult = {
  statKey: string;
  statLabel: string;
  displaced: DisplacedEntry[];
  newcomers: Array<{ personId: number; fullName: string; gained: number; currentRank: number; currentValue: number }>;
};


const MILESTONE_STATS: { key: string; label: string; group: 'hitting' | 'pitching'; leaderKey?: string }[] = [
  { key: 'homeRuns',     label: 'HR',  group: 'hitting' },
  { key: 'rbi',         label: 'RBI', group: 'hitting' },
  { key: 'runs',        label: 'R',   group: 'hitting' },
  { key: 'stolenBases', label: 'SB',  group: 'hitting' },
  { key: 'triples',     label: '3B',  group: 'hitting' },
  { key: 'doubles',     label: '2B',  group: 'hitting' },
  { key: 'hits',        label: 'H',   group: 'hitting' },
  { key: 'baseOnBalls', label: 'BB',  group: 'hitting' },
  // game-log stat key is 'strikeOuts' (camelCase); leaders API uses 'strikeouts'
  { key: 'strikeOuts',  label: 'SO',  group: 'pitching', leaderKey: 'strikeouts' },
  { key: 'saves',       label: 'SV',  group: 'pitching' },
];

function getCached<T>(key: string, ttlHours: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > ttlHours * 3600 * 1000) return null;
    return data as T;
  } catch {
    return null;
  }
}

function setCached<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* storage full — skip cache */ }
}


function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === '1');
  const [mentSearch, setMentSearch] = useState('');
  const [stealSearch, setStealSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveLastUpdated, setLiveLastUpdated] = useState<number | null>(null);
  const [liveSecondsAgo, setLiveSecondsAgo] = useState(0);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [games, setGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [boxScore, setBoxScore] = useState<any>(null);
  const [gameHRTotals, setGameHRTotals] = useState<Record<number, number>>({});
  const [gameHRIds, setGameHRIds] = useState<Record<number, string[]>>({});
  const [leadersTab, setLeadersTab] = useState<'batting' | 'pitching'>('batting');
  const [leadersCategory, setLeadersCategory] = useState('homeRuns');
  const [leadersData, setLeadersData] = useState<any[]>([]);
  const [leadersShowAll, setLeadersShowAll] = useState(false);
  const [leadersAllData, setLeadersAllData] = useState<any[]>([]);
  const [leadersLoading, setLeadersLoading] = useState(false);
  const [leadersError, setLeadersError] = useState(false);
  const [leadersYear, setLeadersYear] = useState<number | null>(null);
  const [recordsGroup, setRecordsGroup] = useState<'batting' | 'pitching'>('batting');
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);
  const [recordsPullDistance, setRecordsPullDistance] = useState(0);
  const recordsPullStartYRef = useRef<number | null>(null);
  const [recordsCategory, setRecordsCategory] = useState('homeRuns');
  const [recordsData, setRecordsData] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState(false);
  const [recordsSubTab, setRecordsSubTab] = useState<'all-time' | 'active'>('all-time');
  const [activeRecordsGroup, setActiveRecordsGroup] = useState<'batting' | 'pitching'>('batting');
  const [activeRecordsCategory, setActiveRecordsCategory] = useState('homeRuns');
  const [activeRecordsData, setActiveRecordsData] = useState<any[]>([]);
  const [activeRecordsLoading, setActiveRecordsLoading] = useState(false);
  const [activeRecordsError, setActiveRecordsError] = useState(false);
  const [activeRosterIds, setActiveRosterIds] = useState<Set<number> | null>(null);
  const [milestoneEvents, setMilestoneEvents] = useState<MilestoneEvent[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [milestonesError, setMilestonesError] = useState(false);
  const [openMilestoneDays, setOpenMilestoneDays] = useState<string[]>([]);
  const [milestoneSearch, setMilestoneSearch] = useState('');
  const [milestoneStatFilter, setMilestoneStatFilter] = useState<string | null>(null);
  const [milestoneSubTab, setMilestoneSubTab] = useState<'tracker' | 'displaced'>('tracker');
  const [displacedData, setDisplacedData] = useState<DisplacedResult[]>([]);
  const [displacedLoading, setDisplacedLoading] = useState(false);
  const [displacedError, setDisplacedError] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('away');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('games');
  const [mentaculous, setMentaculous] = React.useState<Record<string, MentaculousPlayer>>({});
  const lastViewedGamePkRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const pullStartYRef = useRef<number | null>(null);
  const mentaculousRef = useRef<Record<string, MentaculousPlayer>>({});
  const orderRef = useRef<string[]>([]);
  const dataLoadedRef = useRef(false);
  const currentUserRef = useRef<string | null>(null);
  const loadedDataHadEntriesRef = useRef(false);
  const loadedForUserRef = useRef<string | null>(null);
  const stealLoadedHadEntriesRef = useRef(false);
  const stealLoadedForUserRef = useRef<string | null>(null);
  const [mentaculousPage, setMentaculousPage] = useState(0)
  const [updatedPlayerId, setUpdatedPlayerId] = useState<number | null>(null);
  // Stealaculous (stolen-base tracker)
  const [stealaculous, setStealaculous] = useState<Record<string, StealaculousPlayer>>({});
  const stealaculousRef = useRef<Record<string, StealaculousPlayer>>({});
  const [stealOrder, setStealOrder] = useState<string[]>([]);
  const stealOrderRef = useRef<string[]>([]);
  const [stealaculousPage, setStealaculousPage] = useState(0);
  const [newPlayerId, setNewPlayerId] = useState<number | null>(null);
  const prevCountRef = useRef<Record<string, number>>({});
  const fetchedHRTotalsRef = useRef<Set<number>>(new Set());
  const [tooltipOpenId, setTooltipOpenId] = useState<number | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const lineRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const linesContainerRef = useRef<HTMLDivElement>(null);
  const stealLineRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [manualOverride, setManualOverride] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); // New state to track data loading
  const [stealDataLoaded, setStealDataLoaded] = useState(false);
  const [liveInfo, setLiveInfo] = useState<Record<string, any>>({}); // Add this state
  const [pitcherInfo, setPitcherInfo] = useState<Record<string, any>>({}); // Store pitcher information for games
  const [standings, setStandings] = useState<any[]>([]);
  const [wildCardStandings, setWildCardStandings] = useState<any[]>([]);
  const [standingsTab, setStandingsTab] = useState<'divisions' | 'wildcard'>('divisions');
  const [selectedTeamRoster, setSelectedTeamRoster] = useState<any>(null);
  const [teamRoster, setTeamRoster] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Keep refs in sync for beforeunload handler (closures can't capture latest state)
  useEffect(() => { mentaculousRef.current = mentaculous; }, [mentaculous]);
  useEffect(() => { orderRef.current = order; }, [order]);
  useEffect(() => { stealaculousRef.current = stealaculous; }, [stealaculous]);
  useEffect(() => { stealOrderRef.current = stealOrder; }, [stealOrder]);
  useEffect(() => { dataLoadedRef.current = dataLoaded; }, [dataLoaded]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  useEffect(() => {
    if (activeTab !== 'leaders') return;
    const group = leadersTab === 'batting' ? 'hitting' : 'pitching';
    fetchLeaders(leadersCategory, group);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, leadersCategory, leadersTab]);

  useEffect(() => {
    if (activeTab !== 'records') return;
    if (recordsSubTab !== 'all-time') return;
    fetchRecords(recordsCategory, recordsGroup === 'batting' ? 'hitting' : 'pitching', recordsRefreshKey > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, recordsSubTab, recordsCategory, recordsGroup, recordsRefreshKey]);

  useEffect(() => {
    if (activeTab !== 'records') return;
    if (recordsSubTab !== 'active') return;
    fetchActiveRecords(
      activeRecordsCategory,
      activeRecordsGroup === 'batting' ? 'hitting' : 'pitching',
      recordsRefreshKey > 0
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, recordsSubTab, activeRecordsCategory, activeRecordsGroup, recordsRefreshKey]);

  useEffect(() => {
    if (activeTab !== 'milestones') return;
    if (Object.keys(mentaculous).length === 0) return;
    fetchMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, mentaculous]);

  useEffect(() => {
    if (activeTab !== 'milestones' || milestoneSubTab !== 'displaced') return;
    if (displacedData.length > 0) return;
    fetchDisplaced();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, milestoneSubTab]);

  // beforeunload: flush latest state to localStorage immediately on force close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const user = currentUserRef.current;
      if (!user || !dataLoadedRef.current) return;
      if (loadedForUserRef.current !== user) return;
      if (Object.keys(mentaculousRef.current).length === 0 && loadedDataHadEntriesRef.current) return;
      const now = new Date().toISOString();
      localStorage.setItem(`mentaculous_${user}`, JSON.stringify(mentaculousRef.current));
      localStorage.setItem(`mentaculousOrder_${user}`, JSON.stringify(orderRef.current));
      localStorage.setItem(`mentaculousUpdatedAt_${user}`, now);
      if (
        stealLoadedForUserRef.current === user &&
        !(Object.keys(stealaculousRef.current).length === 0 && stealLoadedHadEntriesRef.current)
      ) {
        localStorage.setItem(`stealaculous_${user}`, JSON.stringify(stealaculousRef.current));
        localStorage.setItem(`stealaculousOrder_${user}`, JSON.stringify(stealOrderRef.current));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Persist dark mode
  useEffect(() => { localStorage.setItem('darkMode', darkMode ? '1' : '0'); }, [darkMode]);

  // Tick live-refresh indicator every second
  useEffect(() => {
    if (liveLastUpdated === null) return;
    setLiveSecondsAgo(0);
    const id = setInterval(() => setLiveSecondsAgo(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [liveLastUpdated]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (menuOpen && !target.closest('.menu-container')) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  // Manual HR add state for backend tab, keyed by playerId
  const [manualHRAdd, setManualHRAdd] = useState<Record<string, { num: string; date: string }>>({});

  useEffect(() => {
    if (!currentUser) return; // Don't load data until user is selected

    let cancelled = false;
    loadedDataHadEntriesRef.current = false;
    loadedForUserRef.current = null;
    setDataLoaded(false);
    // Filter out HRs from previous seasons so stale data doesn't pollute a new season.
    // hrId format: `${playerId}_${date}_${seasonHR}` — date is YYYY-MM-DD, year at index [0..3].
    function filterToCurrentSeason(data: Record<string, any>): Record<string, any> {
      const currentYear = String(new Date().getFullYear());
      const result: Record<string, any> = {};
      for (const [id, player] of Object.entries(data)) {
        const hrs = (player as any).homeRuns ?? [];
        const currentHRs = hrs.filter((hr: any) => {
          const hrId: string = typeof hr === 'string' ? hr : (hr.hrId ?? '');
          const datePart = hrId.split('_')[1] ?? '';
          return datePart.startsWith(currentYear);
        });
        if (currentHRs.length > 0) {
          result[id] = { ...(player as any), homeRuns: currentHRs };
        }
      }
      return result;
    }

    async function loadInitialData() {
      let parsed: Record<string, any> = {};
      let orderArr: string[] = [];
      try {
        const { mentaculous: fbMentaculous, mentorder: fbOrder, updatedAt: fbUpdatedAt } = await fetchFromFirebase(currentUser!);

        // Firebase is always authoritative when reachable. localStorage is only
        // used as a fallback when the Firebase request fails (see catch block).
        // Trusting localStorage timestamps caused cross-user contamination when
        // a previous user's autosave wrote stale data to another user's LS key.
        if (fbMentaculous && Object.keys(fbMentaculous).length) {
          parsed = filterToCurrentSeason(fbMentaculous);
          localStorage.setItem(`mentaculous_${currentUser}`, JSON.stringify(parsed));
          if (fbUpdatedAt) localStorage.setItem(`mentaculousUpdatedAt_${currentUser}`, fbUpdatedAt);
        } else {
          // Firebase returned empty or null (new/cleared user) — wipe any stale localStorage
          parsed = {};
          localStorage.removeItem(`mentaculous_${currentUser}`);
          localStorage.removeItem(`mentaculousOrder_${currentUser}`);
          localStorage.removeItem(`mentaculousUpdatedAt_${currentUser}`);
        }

        if (fbOrder && fbOrder.length) {
          orderArr = fbOrder;
        }

        if (!orderArr.length) {
          orderArr = Object.entries(parsed)
            .sort(([, a], [, b]) => ((a as any).addedAt ?? 0) - ((b as any).addedAt ?? 0))
            .map(([id]) => id);
        }
      } catch (e) {
        console.warn('Firebase load failed, falling back to localStorage:', e);
        const mentaculousRaw = localStorage.getItem(`mentaculous_${currentUser}`);
        if (mentaculousRaw) {
          try { parsed = filterToCurrentSeason(JSON.parse(mentaculousRaw)); } catch { parsed = {}; }
        }
        const storedOrder = localStorage.getItem(`mentaculousOrder_${currentUser}`);
        if (storedOrder) {
          try { orderArr = JSON.parse(storedOrder); } catch { orderArr = []; }
        }
        if (!orderArr.length) {
          orderArr = Object.entries(parsed)
            .sort(([, a], [, b]) => ((a as any).addedAt ?? 0) - ((b as any).addedAt ?? 0))
            .map(([id]) => id);
        }
      }

      // Reconcile order against parsed: remove stale IDs, append any new ones by addedAt.
      // This fixes arbitrary ordering when the saved order has stale entries from a
      // prior season, or when addedAt is missing (V8 sorts numeric keys arbitrarily).
      const parsedKeySet = new Set(Object.keys(parsed));
      const cleanOrder = orderArr.filter((id: string) => parsedKeySet.has(id));
      const orderedSet = new Set(cleanOrder);
      const missingIds = Object.entries(parsed)
        .filter(([id]) => !orderedSet.has(id))
        .sort(([, a], [, b]) => ((a as any).addedAt ?? 0) - ((b as any).addedAt ?? 0))
        .map(([id]) => id);
      orderArr = [...cleanOrder, ...missingIds];
      localStorage.setItem(`mentaculousOrder_${currentUser}`, JSON.stringify(orderArr));

      if (cancelled) return;
      loadedDataHadEntriesRef.current = Object.keys(parsed).length > 0;
      loadedForUserRef.current = currentUser;
      setMentaculous(parsed);
      setOrder(orderArr);
      setDataLoaded(true);
    }

    loadInitialData();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Load stealaculous from Firebase (authoritative) with localStorage fallback
  useEffect(() => {
    if (!currentUser) {
      setStealaculous({});
      setStealOrder([]);
      setStealDataLoaded(false);
      return;
    }
    let cancelled = false;
    stealLoadedHadEntriesRef.current = false;
    stealLoadedForUserRef.current = null;
    setStealDataLoaded(false);
    const currentYear = String(new Date().getFullYear());

    function filterToCurrentYear(data: Record<string, StealaculousPlayer>): Record<string, StealaculousPlayer> {
      const result: Record<string, StealaculousPlayer> = {};
      for (const [id, player] of Object.entries(data)) {
        const sbs = player.stolenBases.filter(sb => {
          const datePart = (sb.sbId ?? '').split('_')[1] ?? '';
          return datePart.startsWith(currentYear);
        });
        if (sbs.length > 0) result[id] = { ...player, stolenBases: sbs };
      }
      return result;
    }

    async function loadStealaculous() {
      let parsed: Record<string, StealaculousPlayer> = {};
      let orderArr: string[] = [];
      try {
        const { stealaculous: fbData, stealorder: fbOrder } = await fetchStealaculousFromFirebase(currentUser!);
        if (fbData && Object.keys(fbData).length) {
          // Firebase has data — authoritative
          parsed = filterToCurrentYear(fbData as Record<string, StealaculousPlayer>);
          localStorage.setItem(`stealaculous_${currentUser}`, JSON.stringify(parsed));
          if (fbOrder && fbOrder.length) orderArr = fbOrder;
        } else {
          // Firebase has no stealaculous field yet (new user, or PATCH didn't finish before last close)
          // Fall back to localStorage rather than clearing it
          const raw = localStorage.getItem(`stealaculous_${currentUser}`);
          if (raw) { try { parsed = filterToCurrentYear(JSON.parse(raw)); } catch { parsed = {}; } }
          const rawOrder = localStorage.getItem(`stealaculousOrder_${currentUser}`);
          if (rawOrder) { try { orderArr = JSON.parse(rawOrder); } catch { orderArr = []; } }
        }
      } catch (e) {
        console.warn('Stealaculous Firebase load failed, falling back to localStorage:', e);
        const raw = localStorage.getItem(`stealaculous_${currentUser}`);
        if (raw) { try { parsed = filterToCurrentYear(JSON.parse(raw)); } catch { parsed = {}; } }
        const rawOrder = localStorage.getItem(`stealaculousOrder_${currentUser}`);
        if (rawOrder) { try { orderArr = JSON.parse(rawOrder); } catch { orderArr = []; } }
      }
      const parsedKeys = new Set(Object.keys(parsed));
      const cleanOrder = orderArr.filter(id => parsedKeys.has(id));
      const inOrder = new Set(cleanOrder);
      const extra = Object.keys(parsed).filter(id => !inOrder.has(id));
      orderArr = [...cleanOrder, ...extra];
      localStorage.setItem(`stealaculousOrder_${currentUser}`, JSON.stringify(orderArr));
      if (cancelled) return;
      stealLoadedHadEntriesRef.current = Object.keys(parsed).length > 0;
      stealLoadedForUserRef.current = currentUser;
      setStealaculous(parsed);
      setStealOrder(orderArr);
      setStealDataLoaded(true);
    }

    loadStealaculous();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Move function for manual override (must be defined before autosave effect)
  function move(playerId: string, delta: number) {
    setOrder((prevOrder) => {
      const idx = prevOrder.indexOf(playerId);
      if (idx === -1) return prevOrder;
      let newIdx = idx + delta;
      if (newIdx < 0) newIdx = 0;
      if (newIdx >= prevOrder.length) newIdx = prevOrder.length - 1;
      if (newIdx === idx) return prevOrder;
      const newOrder = [...prevOrder];
      newOrder.splice(idx, 1);
      newOrder.splice(newIdx, 0, playerId);
      return newOrder;
    });
  }

  // Autosave to Firebase and localStorage on every change — no debounce to prevent data loss on force-close
  // NOTE: intentionally omits currentUser from deps and reads it via ref to prevent firing during user switch
  useEffect(() => {
    const user = currentUserRef.current;
    if (!dataLoaded || !user) return;
    // Safety guard: don't save if data hasn't been loaded for this user yet
    if (loadedForUserRef.current !== user) return;
    // Safety guard: never overwrite non-empty data with empty {} (protects against race conditions)
    if (Object.keys(mentaculous).length === 0 && loadedDataHadEntriesRef.current) {
      console.warn('[Autosave] Refusing to save empty mentaculous when loaded data was non-empty');
      return;
    }
    const now = new Date().toISOString();
    localStorage.setItem(`mentaculous_${user}`, JSON.stringify(mentaculous));
    localStorage.setItem(`mentaculousOrder_${user}`, JSON.stringify(order));
    localStorage.setItem(`mentaculousUpdatedAt_${user}`, now);
    saveToFirebase(user, mentaculous, order).catch(e => console.error('[Autosave] Firebase save failed:', e));
  }, [mentaculous, order, dataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stealaculous autosave — mirrors mentaculous guards to prevent wiping Firebase on load
  useEffect(() => {
    const user = currentUserRef.current;
    if (!stealDataLoaded || !user) return;
    if (stealLoadedForUserRef.current !== user) return;
    if (Object.keys(stealaculous).length === 0 && stealLoadedHadEntriesRef.current) {
      console.warn('[Autosave] Refusing to save empty stealaculous when loaded data was non-empty');
      return;
    }
    localStorage.setItem(`stealaculous_${user}`, JSON.stringify(stealaculous));
    localStorage.setItem(`stealaculousOrder_${user}`, JSON.stringify(stealOrder));
    saveStealaculousToFirebase(user, stealaculous, stealOrder).catch(e => console.error('[Autosave] Stealaculous Firebase save failed:', e));
  }, [stealaculous, stealOrder, stealDataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Backfill careerHRNumber for HRs added before this field existed.
  // Runs once after data is loaded. Fetches career + season stats per player,
  // computes careerHRNumber for each stored HR, and patches mentaculous state.
  useEffect(() => {
    if (!dataLoaded) return;
    const currentYear = new Date().getFullYear();
    const playersToBackfill = Object.entries(mentaculous).filter(([, player]) =>
      player.homeRuns.some(hr => hr.careerHRNumber == null)
    );
    if (playersToBackfill.length === 0) return;

    (async () => {
      const updates: Record<string, MentaculousPlayer> = {};
      await Promise.all(playersToBackfill.map(async ([playerId, player]) => {
        try {
          const res = await fetch(
            `https://statsapi.mlb.com/api/v1/people/${playerId}?hydrate=stats(type=[career,season],group=hitting)&season=${currentYear}`
          );
          const data = await res.json();
          const statsArr: any[] = data.people?.[0]?.stats ?? [];
          const careerStat = statsArr.find((s: any) => s.type?.displayName === 'career');
          const seasonStat = statsArr.find((s: any) => s.type?.displayName === 'season');
          const careerTotal: number = careerStat?.splits?.[0]?.stat?.homeRuns ?? 0;
          const seasonTotal: number = seasonStat?.splits?.[0]?.stat?.homeRuns ?? 0;
          if (!careerTotal) return;

          const patchedHRs = player.homeRuns.map(hr => {
            if (hr.careerHRNumber != null) return hr;
            const seasonHRNum = Number(hr.hrId.split('_')[2] ?? 0);
            const computed = careerTotal - (seasonTotal - seasonHRNum);
            return { ...hr, careerHRNumber: computed > 0 ? computed : undefined };
          });
          updates[playerId] = { ...player, homeRuns: patchedHRs };
        } catch { /* skip this player silently */ }
      }));

      if (Object.keys(updates).length > 0) {
        setMentaculous(prev => ({ ...prev, ...updates }));
      }
    })();
  }, [dataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIsRefreshing(true);
    fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`)
      .then((res) => res.json())
      .then((data) => setGames(data.dates[0]?.games || []))
      .catch((error) => console.error('Error fetching schedule:', error))
      .finally(() => setIsRefreshing(false));
  }, [date, refreshKey]);

  // Auto-refresh games every 60s when on the games tab with no game selected
  useEffect(() => {
    if (activeTab !== 'games' || selectedGame) return;
    const id = setInterval(() => setRefreshKey(k => k + 1), 60_000);
    return () => clearInterval(id);
  }, [activeTab, selectedGame]);

  // Pre-fetch HR totals for Final/In-Progress games so the ticker shows without clicking
  useEffect(() => {
    const completedGames = games.filter(g =>
      g.status.detailedState === 'Final' || g.status.detailedState === 'In Progress'
    );
    completedGames.forEach(async (game) => {
      const isLive = game.status.detailedState === 'In Progress';
      // Don't cache live games so they re-fetch on each poll as new HRs happen
      if (!isLive && fetchedHRTotalsRef.current.has(game.gamePk)) return;
      if (!isLive) fetchedHRTotalsRef.current.add(game.gamePk);
      try {
        const res = await fetch(`https://statsapi.mlb.com/api/v1/game/${game.gamePk}/boxscore`);
        const data = await res.json();
        const allPlayers = [
          ...Object.values(data?.teams?.away?.players ?? {}),
          ...Object.values(data?.teams?.home?.players ?? {}),
        ] as any[];
        const total = allPlayers.reduce((sum: number, p: any) => sum + (p.stats?.batting?.homeRuns ?? 0), 0);
        setGameHRTotals(prev => ({ ...prev, [game.gamePk]: total }));

        // Compute hrIds using seasonStats from the box score (season total as of that game),
        // NOT a separate current-season fetch which would be stale for past games.
        const playersWithHRs = allPlayers.filter((p: any) => (p.stats?.batting?.homeRuns ?? 0) > 0);
        const gameDate = game.gameDate.slice(0, 10);
        const hrIds: string[] = [];
        for (const p of playersWithHRs) {
          const seasonTotal: number = (p as any).seasonStats?.batting?.homeRuns ?? 0;
          const todayHRs: number = (p as any).stats.batting.homeRuns;
          for (let i = 0; i < todayHRs; i++) {
            hrIds.push(`${(p as any).person.id}_${gameDate}_${seasonTotal - i}`);
          }
        }
        if (hrIds.length > 0) {
          setGameHRIds(prev => ({ ...prev, [game.gamePk]: hrIds }));
        }
      } catch {
        if (!isLive) fetchedHRTotalsRef.current.delete(game.gamePk); // allow retry
      }
    });
  }, [games]);

  // Fetch starting pitcher information for future games
  useEffect(() => {
    const futureGames = games.filter(g => 
      g.status.detailedState === 'Scheduled' || 
      g.status.detailedState === 'Pre-Game'
    );
    
    futureGames.forEach(async (game) => {
      try {
        // Fetch game data with probable pitchers
        const res = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&gamePk=${game.gamePk}&hydrate=probablePitcher(note)`);
        const gameData = await res.json();
        
        if (gameData.dates?.[0]?.games?.[0]) {
          const gameInfo = gameData.dates[0].games[0];
          const awayPitcher = gameInfo.teams?.away?.probablePitcher;
          const homePitcher = gameInfo.teams?.home?.probablePitcher;
          
          let pitcherData: any = {};
          
          // Fetch detailed stats for each pitcher
          if (awayPitcher?.id) {
            const awayStats = await fetchPitcherStats(awayPitcher.id);
            pitcherData.away = { ...awayPitcher, stats: awayStats };
          }
          
          if (homePitcher?.id) {
            const homeStats = await fetchPitcherStats(homePitcher.id);
            pitcherData.home = { ...homePitcher, stats: homeStats };
          }
          
          setPitcherInfo(prev => ({
            ...prev,
            [game.gamePk]: pitcherData
          }));
        }
      } catch (error) {
        console.warn(`Failed to fetch pitcher info for game ${game.gamePk}:`, error);
      }
    });
  }, [games]);

  // Fetch MLB standings
  useEffect(() => {
    const fetchStandings = async () => {
      try {
        // Division ID to name mapping
        const divisionNames: { [key: number]: string } = {
          200: 'American League West',
          201: 'American League East', 
          202: 'American League Central',
          203: 'National League West',
          204: 'National League East',
          205: 'National League Central'
        };

        // Fetch both AL and NL standings separately (regular season and wild card)
        const [alResponse, nlResponse, alWildCardResponse, nlWildCardResponse] = await Promise.all([
          fetch('https://statsapi.mlb.com/api/v1/standings?leagueId=103&season=2026&standingsTypes=regularSeason'),
          fetch('https://statsapi.mlb.com/api/v1/standings?leagueId=104&season=2026&standingsTypes=regularSeason'),
          fetch('https://statsapi.mlb.com/api/v1/standings?leagueId=103&season=2026&standingsTypes=wildCard'),
          fetch('https://statsapi.mlb.com/api/v1/standings?leagueId=104&season=2026&standingsTypes=wildCard')
        ]);
        
        const [alData, nlData, alWildCardData, nlWildCardData] = await Promise.all([
          alResponse.json(),
          nlResponse.json(),
          alWildCardResponse.json(),
          nlWildCardResponse.json()
        ]);
        
        const allTeams: any[] = [];
        
        // Process AL data
        if (alData.records) {
          alData.records.forEach((division: any) => {
            division.teamRecords.forEach((team: any) => {
              allTeams.push({
                ...team,
                divisionName: divisionNames[division.division.id] || 'Unknown Division',
                leagueName: 'American League'
              });
            });
          });
        }
        
        // Process NL data
        if (nlData.records) {
          nlData.records.forEach((division: any) => {
            division.teamRecords.forEach((team: any) => {
              allTeams.push({
                ...team,
                divisionName: divisionNames[division.division.id] || 'Unknown Division',
                leagueName: 'National League'
              });
            });
          });
        }
        
        // Process wild card standings
        const allWildCardTeams: any[] = [];
        
        // Process AL wild card data
        if (alWildCardData.records && alWildCardData.records.length > 0) {
          alWildCardData.records[0].teamRecords.forEach((team: any) => {
            allWildCardTeams.push({
              ...team,
              leagueName: 'American League'
            });
          });
        }
        
        // Process NL wild card data
        if (nlWildCardData.records && nlWildCardData.records.length > 0) {
          nlWildCardData.records[0].teamRecords.forEach((team: any) => {
            allWildCardTeams.push({
              ...team,
              leagueName: 'National League'
            });
          });
        }
        
        setStandings(allTeams);
        setWildCardStandings(allWildCardTeams);
      } catch (error) {
        console.error('Error fetching standings:', error);
      }
    };

    fetchStandings();
  }, []);

  // Function to fetch team roster
  const fetchTeamRoster = async (teamId: number) => {
    try {
      const res = await fetch(`https://statsapi.mlb.com/api/v1/teams/${teamId}/roster`);
      const data = await res.json();
      
      if (data.roster) {
        // Sort roster by position groups: Pitchers, Catchers, Infielders, Outfielders, DH
        const sortedRoster = data.roster.sort((a: any, b: any) => {
          const aPos = a.position.abbreviation;
          const bPos = b.position.abbreviation;
          
          // Define position groups
          const getPositionGroup = (pos: string) => {
            if (pos === 'P') return 1; // Pitchers first
            if (pos === 'C') return 2; // Catchers second
            if (['1B', '2B', '3B', 'SS', 'IF'].includes(pos)) return 3; // Infielders third
            if (['LF', 'CF', 'RF', 'OF'].includes(pos)) return 4; // Outfielders fourth
            if (pos === 'DH') return 5; // DH last
            return 6; // Any other positions
          };
          
          const aGroup = getPositionGroup(aPos);
          const bGroup = getPositionGroup(bPos);
          
          if (aGroup !== bGroup) {
            return aGroup - bGroup;
          }
          
          // Within same group, sort by specific position order
          const inGroupOrder: Record<string, number> = {
            // Pitchers (already grouped)
            'P': 1,
            // Catchers (already grouped)
            'C': 1,
            // Infielders
            '1B': 1, '2B': 2, '3B': 3, 'SS': 4, 'IF': 5,
            // Outfielders
            'LF': 1, 'CF': 2, 'RF': 3, 'OF': 4,
            // DH (already grouped)
            'DH': 1
          };
          
          const aPosOrder = inGroupOrder[aPos] || 999;
          const bPosOrder = inGroupOrder[bPos] || 999;
          
          if (aPosOrder !== bPosOrder) {
            return aPosOrder - bPosOrder;
          }
          
          // If same position, sort by jersey number
          return (a.jerseyNumber || 999) - (b.jerseyNumber || 999);
        });
        
        setTeamRoster(sortedRoster);
        
        // Find team info from standings or use API data
        const teamInfo = standings.find(team => team.team.id === teamId);
        setSelectedTeamRoster(teamInfo?.team || { 
          id: teamId, 
          name: data.roster[0]?.person?.currentTeam?.name || 'Team' 
        });
        setActiveTab('roster');
      }
    } catch (error) {
      console.error('Error fetching team roster:', error);
    }
  };

  // Helper function to fetch pitcher statistics
  const fetchPitcherStats = async (pitcherId: number) => {
    try {
      const res = await fetch(`https://statsapi.mlb.com/api/v1/people/${pitcherId}/stats?stats=season&group=pitching`);
      const data = await res.json();
      
      if (data.stats?.[0]?.splits?.[0]?.stat) {
        return data.stats[0].splits[0].stat;
      }
      return null;
    } catch (error) {
      console.warn(`Failed to fetch stats for pitcher ${pitcherId}:`, error);
      return null;
    }
  };


  const loadBoxScore = async (gamePk: number, gameDate?: string) => {
    try {
      const res = await fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`);
      const boxScore = await res.json();

      const awayPlayers = boxScore?.teams?.away?.players ?? {};
      const homePlayers = boxScore?.teams?.home?.players ?? {};
      const allPlayers = [...Object.values(awayPlayers), ...Object.values(homePlayers)];

      const today = gameDate ? gameDate.slice(0, 10) : new Date().toISOString().split('T')[0];

      // Step 1: Filter players who hit a home run (season total increased)
      const playersWithHRs = allPlayers.filter((p: any) => {
        return p.seasonStats?.batting?.homeRuns > 0;
      });

      // Step 2: Fetch career HRs for just those players
      const careerHRs: Record<string, number> = {};
      await Promise.all(
        playersWithHRs.map(async (p: any) => {
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
      const updatedPlayers = allPlayers.map((player: any) => {
        if (!player.stats) return player;

        if (player.seasonStats?.batting?.homeRuns != null) {
          player.stats.seasonTotalHR = player.seasonStats.batting.homeRuns;
        }

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
      const playerMap: Record<string, any> = updatedPlayers.reduce((map: Record<string, any>, p: any) => {
        map[String(p.person.id)] = p;
        return map;
      }, {});

      ['home', 'away'].forEach((teamKey) => {
        const team = boxScore.teams[teamKey];
        const updated: Record<string, any> = {};
        for (let key in team.players) {
          const id = String(team.players[key].person.id);
          updated[key] = playerMap[id] || team.players[key];
        }
        boxScore.teams[teamKey].players = updated;
      });

      const currentYear = new Date().getFullYear().toString();

      await Promise.all(
        updatedPlayers.map(async (player: any) => {
          const id = player.person.id;
          try {
            const res = await fetch(
              `https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=yearByYear&group=hitting`
            );
            const data = await res.json();
            const split = data.stats[0].splits.find(
              (s: any) => s.season === currentYear
            );
            if (split && split.stat) {
              // stash into your player object
              player.stats.batting.seasonAvg = split.stat.avg;
              player.stats.batting.seasonOps = split.stat.ops;
            } else {
              player.stats.batting.seasonAvg = '-';
              player.stats.batting.seasonOps = '-';
            }
          } catch (err) {
            console.warn(`Failed season stats for ${id}`, err);
            player.stats.batting.seasonAvg = '-';
            player.stats.batting.seasonOps = '-';
          }
        })
      );
      await Promise.all(
        updatedPlayers
          .filter((p: any) => p.stats?.pitching)   // only for pitchers
          .map(async (player: any) => {
            try {
              // Use season stats instead of yearByYear to get combined totals for traded players
              const res = await fetch(
                `https://statsapi.mlb.com/api/v1/people/${player.person.id}/stats?stats=season&group=pitching`
              );
              const data = await res.json();
              const seasonStat = data.stats[0]?.splits[0]?.stat;
              if (seasonStat) {
                player.stats.pitching.seasonEra = seasonStat.era ?? '-';
                // Store the complete season pitching stats for save info
                player.seasonStats = player.seasonStats || {};
                player.seasonStats.pitching = seasonStat;
              } else {
                player.stats.pitching.seasonEra = '-';
              }
            } catch (error) {
              console.warn(`Failed to fetch season pitching stats for ${player.person.fullName}:`, error);
              player.stats.pitching.seasonEra = '-';
            }
          })
      );

      // Try to get pitching order from play-by-play data
      try {
        const playByPlayRes = await fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/playByPlay`);
        const playByPlayData = await playByPlayRes.json();

        // Track when each pitcher first appeared
        const pitcherFirstAppearance = new Map();
        let playIndex = 0;

        for (const inning of playByPlayData.allPlays || []) {
          const pitcher = inning.matchup?.pitcher;
          if (pitcher && !pitcherFirstAppearance.has(pitcher.id)) {
            pitcherFirstAppearance.set(pitcher.id, playIndex);
          }
          playIndex++;
        }

        // Apply pitching order to players
        ['home', 'away'].forEach((teamKey) => {
          const team = boxScore.teams[teamKey];
          for (let key in team.players) {
            const player = team.players[key];
            if (player.stats?.pitching && pitcherFirstAppearance.has(player.person.id)) {
              player.pitchingOrder = pitcherFirstAppearance.get(player.person.id);
            }
          }
        });
      } catch (error) {
        console.warn('❌ Could not fetch play-by-play data for pitching order:', error);
      }
      // Count total HRs in this game from box score batting stats
      const allPlayers2 = [
        ...Object.values(boxScore?.teams?.away?.players ?? {}),
        ...Object.values(boxScore?.teams?.home?.players ?? {}),
      ] as any[];
      const totalGameHRs = allPlayers2.reduce((sum: number, p: any) => sum + (p.stats?.batting?.homeRuns ?? 0), 0);
      setGameHRTotals(prev => ({ ...prev, [gamePk]: totalGameHRs }));

      // Store exact hrIds for this game for ticker matching
      const hrIdsForGame: string[] = updatedPlayers.flatMap((p: any) =>
        (p.homeRunProgress ?? []).map((hr: any) => hr.hrId)
      );
      if (hrIdsForGame.length > 0) {
        setGameHRIds(prev => ({ ...prev, [gamePk]: hrIdsForGame }));
      }

      setBoxScore(boxScore);
    } catch (error) {
      console.error('Error loading box score:', error);
    }
  };


  const changeDate = (days: number) => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + days);
    setDate(currentDate.toISOString().split('T')[0]);
  };

  const fetchLeaders = async (category: string, group: 'hitting' | 'pitching', showAll = false) => {
    if (showAll && leadersAllData.length > 0) {
      setLeadersShowAll(true);
      return;
    }
    const limit = showAll ? 999 : 25;
    if (!showAll) {
      const year = new Date().getFullYear();
      // Try current year cache first
      for (const yr of [year, year - 1]) {
        const cacheKey = `leaders_${category}_${yr}`;
        const cached = getCached<{ year: number; leaders: any[] }>(cacheKey, 24);
        if (cached && cached.leaders.length > 0) {
          setLeadersData(cached.leaders);
          setLeadersYear(cached.year);
          setLeadersShowAll(false);
          setLeadersAllData([]);
          return;
        }
      }
    }

    setLeadersLoading(true);
    setLeadersError(false);
    const year = new Date().getFullYear();

    try {
      let data: any = null;
      let actualYear = year;
      for (const yr of [year, year - 1]) {
        const res = await fetch(
          `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=${category}&season=${yr}&limit=${limit}&statGroup=${group}`
        );
        const json = await res.json();
        const leaders = json?.leagueLeaders?.[0]?.leaders ?? [];
        if (leaders.length > 0) {
          data = leaders;
          actualYear = yr;
          break;
        }
      }

      if (!data || data.length === 0) {
        setLeadersError(true);
        setLeadersLoading(false);
        return;
      }

      if (showAll) {
        setLeadersAllData(data);
        setLeadersShowAll(true);
      } else {
        setCached(`leaders_${category}_${actualYear}`, { year: actualYear, leaders: data });
        setLeadersData(data);
        setLeadersYear(actualYear);
        setLeadersShowAll(false);
        setLeadersAllData([]);
      }
    } catch {
      setLeadersError(true);
    } finally {
      setLeadersLoading(false);
    }
  };

  const fetchRecords = async (category: string, group: 'hitting' | 'pitching', bust = false) => {
    const cacheKey = `records_v2_500_${group}_${category}`;
    const ttlHours = 24;

    const cached = bust ? null : getCached<any[]>(cacheKey, ttlHours);
    if (cached && cached.length > 0) {
      setRecordsData(cached);
      return;
    }

    setRecordsLoading(true);
    setRecordsError(false);

    try {
      // Paginate to fetch up to 500 records (5 pages × 100)
      const allLeaders: any[] = [];
      for (let offset = 0; offset < 500; offset += 100) {
        const res = await fetch(
          `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=${category}&statType=career&limit=100&offset=${offset}&statGroup=${group}`
        );
        const json = await res.json();
        const page = json?.leagueLeaders?.[0]?.leaders ?? [];
        allLeaders.push(...page);
        if (page.length < 100) break;
      }

      const dedupedLeaders = Array.from(
        new Map(allLeaders.map(entry => [`${entry.person?.id ?? 'unknown'}_${entry.rank ?? entry.value}`, entry])).values()
      ).sort((a, b) => Number(a.rank ?? 9999) - Number(b.rank ?? 9999));

      if (dedupedLeaders.length === 0) {
        setRecordsError(true);
        return;
      }

      localStorage.removeItem(`records_500_${category}`);
      setCached(cacheKey, dedupedLeaders);
      setRecordsData(dedupedLeaders);
    } catch {
      setRecordsError(true);
    } finally {
      setRecordsLoading(false);
    }
  };

  const fetchActiveRosterIds = async (): Promise<Set<number>> => {
    const cacheKey = 'active_roster_ids';
    const cached = getCached<number[]>(cacheKey, 24);
    if (cached) return new Set(cached);

    // Fetch all MLB teams
    const teamsRes = await fetch('https://statsapi.mlb.com/api/v1/teams?sportId=1&season=2026');
    const teamsJson = await teamsRes.json();
    const teamIds: number[] = (teamsJson?.teams ?? []).map((t: any) => t.id);

    // Fetch 40-man rosters for all teams in parallel
    const rosterResults = await Promise.all(
      teamIds.map(id =>
        fetch(`https://statsapi.mlb.com/api/v1/teams/${id}/roster?rosterType=40Man`)
          .then(r => r.json())
          .catch(() => ({ roster: [] }))
      )
    );

    const ids: number[] = [];
    for (const result of rosterResults) {
      for (const player of result?.roster ?? []) {
        if (player?.person?.id) ids.push(player.person.id);
      }
    }

    setCached(cacheKey, ids);
    return new Set(ids);
  };

  const fetchActiveRecords = async (category: string, group: 'hitting' | 'pitching', _bust = false) => {
    setActiveRecordsLoading(true);
    setActiveRecordsError(false);
    try {
      let rosterIds = activeRosterIds;
      if (!rosterIds) {
        rosterIds = await fetchActiveRosterIds();
        setActiveRosterIds(rosterIds);
      }

      // Paginate career leaders up to 500
      const allLeaders: any[] = [];
      for (let offset = 0; offset < 500; offset += 100) {
        const res = await fetch(
          `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=${category}&statType=career&limit=100&offset=${offset}&statGroup=${group}`
        );
        const json = await res.json();
        const page = json?.leagueLeaders?.[0]?.leaders ?? [];
        allLeaders.push(...page);
        if (page.length < 100) break;
      }

      // Filter to only 40-man roster players
      const active = allLeaders.filter(e => rosterIds!.has(Number(e.person?.id)));
      setActiveRecordsData(active.slice(0, 100));
    } catch {
      setActiveRecordsError(true);
    } finally {
      setActiveRecordsLoading(false);
    }
  };

  const fetchMilestones = async (bustTopListCache = false) => {
    if (bustTopListCache) {
      MILESTONE_STATS.forEach(stat => {
        const apiKey = stat.leaderKey ?? stat.key;
        localStorage.removeItem(`milestone_top500_${apiKey}`);
        localStorage.removeItem(`milestone_season100_${apiKey}_${new Date().getFullYear()}`);
      });
      // Also clear game log caches so crossing dates are always re-computed from fresh data
      Object.keys(localStorage)
        .filter(k => k.startsWith('milestone_gamelog_'))
        .forEach(k => localStorage.removeItem(k));
    }
    setMilestonesLoading(true);
    setMilestonesError(false);
    try {
      const currentSeason = new Date().getFullYear();
      type LeaderEntry = { rank: number; personId: number; fullName: string; value: number };

      // Step 1: fetch career top-500 AND current season top-100 for every stat in parallel.
      // Career list  → gives us career totals and who's in the top 500.
      // Season list  → tells us who has been active this season and what their season total is.
      // No per-player stat fetches needed — career = career_list value, season = season_list value.
      const top500: Record<string, LeaderEntry[]> = {};
      const seasonLeaders: Record<string, LeaderEntry[]> = {};

      await Promise.all(MILESTONE_STATS.map(async (stat) => {
        const apiKey = stat.leaderKey ?? stat.key;

        // Career top-500 (paginated, cached 24h)
        const careerCacheKey = `milestone_top500_${apiKey}`;
        const cachedCareer = getCached<LeaderEntry[]>(careerCacheKey, 24);
        if (cachedCareer) {
          top500[stat.key] = cachedCareer;
        } else {
          try {
            const allLeaders: LeaderEntry[] = [];
            const pageSize = 100;
            for (let offset = 0; offset < 500; offset += pageSize) {
              const res = await fetch(
                `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=${apiKey}&statType=career&limit=${pageSize}&offset=${offset}&statGroup=${stat.group}`
              );
              const data = await res.json();
              const page: LeaderEntry[] = (data.leagueLeaders?.[0]?.leaders ?? []).map((l: any) => ({
                rank: l.rank, personId: l.person?.id, fullName: l.person?.fullName, value: Number(l.value),
              }));
              allLeaders.push(...page);
              if (page.length < pageSize) break;
            }
            // Deduplicate by personId — page boundaries on tied ranks can cause
            // the same player to appear on two consecutive pages, inflating counts.
            const seen = new Set<number>();
            const dedupedLeaders = allLeaders.filter(e => {
              if (seen.has(e.personId)) return false;
              seen.add(e.personId);
              return true;
            });
            top500[stat.key] = dedupedLeaders;
            setCached(careerCacheKey, dedupedLeaders);
          } catch { top500[stat.key] = []; }
        }

        // Season top-100 (cached 1h)
        const seasonCacheKey = `milestone_season100_${apiKey}_${currentSeason}`;
        const cachedSeason = getCached<LeaderEntry[]>(seasonCacheKey, 1);
        if (cachedSeason) {
          seasonLeaders[stat.key] = cachedSeason;
        } else {
          try {
            // Paginate until empty to catch everyone with even 1 of this stat (1 AB / 1 BF equivalent)
            const allSeason: LeaderEntry[] = [];
            const pageSize = 100;
            for (let offset = 0; offset < 5000; offset += pageSize) {
              const res = await fetch(
                `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=${apiKey}&statType=season&season=${currentSeason}&limit=${pageSize}&offset=${offset}&statGroup=${stat.group}`
              );
              const data = await res.json();
              const page: LeaderEntry[] = (data.leagueLeaders?.[0]?.leaders ?? []).map((l: any) => ({
                rank: l.rank, personId: l.person?.id, fullName: l.person?.fullName, value: Number(l.value),
              }));
              allSeason.push(...page);
              if (page.length < pageSize) break;
            }
            seasonLeaders[stat.key] = allSeason;
            setCached(seasonCacheKey, allSeason);
          } catch { seasonLeaders[stat.key] = []; }
        }
      }));

      // Step 2: find every player who crossed someone this season.
      // For each stat: cross-reference career list with season list.
      // A player can only cross someone if they appear in the season leaders (they've been active).
      // preSeasonCareer = careerTotal - seasonTotal → find entries in career list between those two values.
      const events: MilestoneEvent[] = [];

      // Game log helper — fetches cumulative per-game running totals (cached 1h)
      const fetchGameLog = async (personId: number, group: 'hitting' | 'pitching') => {
        const today = new Date().toISOString().slice(0, 10);
        const cacheKey = `milestone_gamelog_${personId}_${group}_${currentSeason}_${today}`;
        const cached = getCached<{ date: string; cumulative: Record<string, number> }[]>(cacheKey, 25);
        if (cached) return cached;
        try {
          const res = await fetch(
            `https://statsapi.mlb.com/api/v1/people/${personId}/stats?stats=gameLog&group=${group}&season=${currentSeason}`
          );
          const data = await res.json();
          const splits: any[] = data.stats?.[0]?.splits ?? [];
          const running: Record<string, number> = {};
          const result = splits.map((s: any) => {
            for (const [k, v] of Object.entries(s.stat ?? {})) {
              running[k] = (running[k] ?? 0) + Number(v);
            }
            return { date: s.date as string, cumulative: { ...running } };
          });
          setCached(cacheKey, result);
          return result;
        } catch { return []; }
      };

      // Collect all (personId, group) pairs that need game logs.
      // We fetch logs for ALL active top-500 players — not just crossers — so that
      // when computing point-in-time rank we can check whether a bystander active
      // player had already surpassed the crossingValue before the crossing date.
      type NeedLog = { personId: number; group: 'hitting' | 'pitching'; fullName: string };
      const needLogs: NeedLog[] = [];

      for (const stat of MILESTONE_STATS) {
        const careerList = top500[stat.key] ?? [];
        const seasonMap = new Map<number, number>();
        for (const s of seasonLeaders[stat.key] ?? []) seasonMap.set(s.personId, s.value);

        for (const player of careerList) {
          const season = seasonMap.get(player.personId) ?? 0;
          if (!season) continue; // not active this season — retired players never need a log

          if (!needLogs.find(n => n.personId === player.personId && n.group === stat.group)) {
            needLogs.push({ personId: player.personId, group: stat.group, fullName: player.fullName });
          }
        }
      }

      // Fetch all needed game logs in parallel
      const gameLogCache = new Map<string, { date: string; cumulative: Record<string, number> }[]>();
      await Promise.all(needLogs.map(async ({ personId, group }) => {
        const log = await fetchGameLog(personId, group);
        gameLogCache.set(`${personId}_${group}`, log);
      }));

      // Step 3: compute crossing events
      for (const stat of MILESTONE_STATS) {
        const careerList = top500[stat.key] ?? [];
        const seasonMap = new Map<number, number>();
        for (const s of seasonLeaders[stat.key] ?? []) seasonMap.set(s.personId, s.value);

        for (const player of careerList) {
          const season = seasonMap.get(player.personId) ?? 0;
          if (!season) continue;

          const preSeasonCareer = player.value - season;
          const passed = careerList.filter(
            e => e.personId !== player.personId && e.value >= preSeasonCareer && e.value < player.value
          );
          if (passed.length === 0) continue;

          const gameLog = gameLogCache.get(`${player.personId}_${stat.group}`) ?? [];

          for (const p of passed) {
            const needed = p.value - preSeasonCareer;
            let crossDate: string | null = null;
            let crossingValue = p.value + 1;
            let seasonValue = needed + 1;
            for (const entry of gameLog) {
              const cumSeason = entry.cumulative[stat.key] ?? 0;
              if (cumSeason > needed) {
                crossDate = entry.date;
                crossingValue = preSeasonCareer + cumSeason;
                seasonValue = cumSeason;
                break;
              }
            }

            // Rank at the moment of crossing (point-in-time):
            // For each other player in the career list, determine whether they were
            // strictly above crossingValue on crossDate.
            //   - Retired / inactive (season = 0): career total never changes → compare directly.
            //   - Active, pre-season career already > crossingValue: definitely ahead.
            //   - Active, pre-season career ≤ crossingValue: look up their game log to see
            //     how many they had accumulated by crossDate. If preSeasonCareer + cumByDate >
            //     crossingValue they were already ahead; otherwise they weren't yet.
            const crossingRank = careerList.filter(e => {
              if (e.personId === player.personId) return false;
              if (e.value <= crossingValue) return false; // currently at or below — never ahead
              const eSeasonTotal = seasonMap.get(e.personId) ?? 0;
              const ePreSeason = e.value - eSeasonTotal;
              if (ePreSeason > crossingValue) return true; // was ahead before season even started
              if (!eSeasonTotal) return false; // retired and current ≤ crossingValue (caught above)
              // Active player who started the season at or below crossingValue.
              // We don't know their exact crossing date unless we check their log.
              if (!crossDate) return false; // unknown crossing date — conservatively exclude
              const eLog = gameLogCache.get(`${e.personId}_${stat.group}`) ?? [];
              // Find their cumulative at the last game on or before crossDate
              let eCumAtCross = 0;
              for (const entry of eLog) {
                if (entry.date <= crossDate) eCumAtCross = entry.cumulative[stat.key] ?? 0;
                else break;
              }
              return ePreSeason + eCumAtCross > crossingValue;
            }).length + 1;
            const tiedWith = careerList
              .filter(e => e.personId !== player.personId && e.value === crossingValue)
              .sort((a, b) => a.fullName.localeCompare(b.fullName));

            events.push({
              playerId: String(player.personId),
              playerName: player.fullName,
              statKey: stat.key,
              statLabel: stat.label,
              crossingValue,
              crossingRank,
              tiedPersonIds: tiedWith.map(e => e.personId),
              tiedNames: tiedWith.map(e => e.fullName),
              seasonValue,
              passedPersonId: p.personId,
              passedName: p.fullName,
              passedValue: p.value,
              passedRank: p.rank,
              date: crossDate,
            });
          }
        }
      }

      // Sort most recent first, then by player name, then by stat
      events.sort((a, b) => {
        const dateCompare = (b.date ?? '').localeCompare(a.date ?? '');
        if (dateCompare !== 0) return dateCompare;
        return a.playerName.localeCompare(b.playerName) || a.statLabel.localeCompare(b.statLabel);
      });

      setMilestoneEvents(events);
      setOpenMilestoneDays(prev => {
        if (prev.length > 0) return prev;
        const firstDay = events[0]?.date ?? 'unknown';
        return firstDay ? [firstDay] : [];
      });
    } catch {
      setMilestonesError(true);
    } finally {
      setMilestonesLoading(false);
    }
  };

  const fetchDisplaced = async (bust = false) => {
    const CACHE_KEY = 'displaced_2026_results';
    const TTL_HOURS = 4;
    if (!bust) {
      const cached = getCached<DisplacedResult[]>(CACHE_KEY, TTL_HOURS);
      if (cached) { setDisplacedData(cached); return; }
    } else {
      localStorage.removeItem(CACHE_KEY);
      MILESTONE_STATS.forEach(stat => {
        const apiKey = stat.leaderKey ?? stat.key;
        localStorage.removeItem(`displaced_career600_${stat.group}_${apiKey}`);
        localStorage.removeItem(`milestone_season100_${apiKey}_${new Date().getFullYear()}`);
      });
    }

    setDisplacedLoading(true);
    setDisplacedError(false);
    const currentSeason = new Date().getFullYear();

    try {
      type LeaderEntry = { rank: number; personId: number; fullName: string; value: number };
      const results: DisplacedResult[] = [];

      await Promise.all(MILESTONE_STATS.map(async (stat) => {
        const apiKey = stat.leaderKey ?? stat.key;

        // Career top 600 — 6 pages of 100, dedicated cache
        const careerCacheKey = `displaced_career600_${stat.group}_${apiKey}`;
        let careerList = getCached<LeaderEntry[]>(careerCacheKey, 24);
        if (!careerList) {
          const all: LeaderEntry[] = [];
          for (let offset = 0; offset < 600; offset += 100) {
            try {
              const res = await fetch(
                `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=${apiKey}&statType=career&limit=100&offset=${offset}&statGroup=${stat.group}`
              );
              const data = await res.json();
              const page: LeaderEntry[] = (data.leagueLeaders?.[0]?.leaders ?? []).map((l: any) => ({
                rank: l.rank, personId: l.person?.id, fullName: l.person?.fullName, value: Number(l.value),
              }));
              all.push(...page);
              if (page.length < 100) break;
            } catch { break; }
          }
          const seen = new Set<number>();
          careerList = all.filter(e => { if (seen.has(e.personId)) return false; seen.add(e.personId); return true; });
          setCached(careerCacheKey, careerList);
        }

        // 2026 season leaders — reuse milestone cache if available
        const seasonCacheKey = `milestone_season100_${apiKey}_${currentSeason}`;
        let seasonList = getCached<LeaderEntry[]>(seasonCacheKey, 1);
        if (!seasonList) {
          const all: LeaderEntry[] = [];
          for (let offset = 0; offset < 5000; offset += 100) {
            try {
              const res = await fetch(
                `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=${apiKey}&statType=season&season=${currentSeason}&limit=100&offset=${offset}&statGroup=${stat.group}`
              );
              const data = await res.json();
              const page: LeaderEntry[] = (data.leagueLeaders?.[0]?.leaders ?? []).map((l: any) => ({
                rank: l.rank, personId: l.person?.id, fullName: l.person?.fullName, value: Number(l.value),
              }));
              all.push(...page);
              if (page.length < 100) break;
            } catch { break; }
          }
          seasonList = all;
          setCached(seasonCacheKey, seasonList);
        }

        const seasonMap = new Map<number, number>(seasonList.map(e => [e.personId, e.value]));

        // Enrich with pre-2026 values
        const enriched = careerList.map(e => ({
          ...e,
          pre2026Value: e.value - (seasonMap.get(e.personId) ?? 0),
          gained2026: seasonMap.get(e.personId) ?? 0,
        }));

        // Assign pre-2026 ranks using standard competition ranking (ties get lowest rank)
        const sortedPre = [...enriched].sort((a, b) => b.pre2026Value - a.pre2026Value);
        // Map personId → pre2026Rank
        const pre2026RankMap = new Map<number, number>();
        for (let i = 0; i < sortedPre.length; i++) {
          const val = sortedPre[i].pre2026Value;
          // Rank = position of first occurrence of this value + 1
          if (!pre2026RankMap.has(sortedPre[i].personId)) {
            const firstIdx = sortedPre.findIndex(x => x.pre2026Value === val);
            pre2026RankMap.set(sortedPre[i].personId, firstIdx + 1);
          }
        }

        // Current top 500: career rank ≤ 500 per the API (ties at boundary are all included)
        const currentTop500Set = new Set(enriched.filter(e => e.rank <= 500).map(e => e.personId));

        // Pre-2026 top 500: pre2026Rank ≤ 500
        const inPre500 = enriched.filter(e => (pre2026RankMap.get(e.personId) ?? 9999) <= 500);
        if (inPre500.length === 0) return;

        // Displaced: were in pre-2026 top 500, are NOT in current top 500
        const displaced = enriched
          .filter(e => (pre2026RankMap.get(e.personId) ?? 9999) <= 500 && !currentTop500Set.has(e.personId))
          .map(e => e.personId);

        if (displaced.length === 0) return;

        // Newcomers: are in current top 500, were NOT in pre-2026 top 500
        const newcomers = enriched.filter(e =>
          currentTop500Set.has(e.personId) &&
          (pre2026RankMap.get(e.personId) ?? 9999) > 500 &&
          e.gained2026 > 0
        );

        const displacedEntries: DisplacedEntry[] = displaced.map(pid => {
          const e = enriched.find(x => x.personId === pid)!;
          // Which newcomers specifically passed this player's pre-2026 value this year?
          const by = newcomers
            .filter(n => n.pre2026Value <= e.pre2026Value && n.value >= e.pre2026Value)
            .map(n => ({ personId: n.personId, fullName: n.fullName, gained: n.gained2026, currentRank: n.rank }));
          return {
            personId: e.personId,
            fullName: e.fullName,
            pre2026Rank: pre2026RankMap.get(e.personId)!,
            currentRank: e.rank,
            pre2026Value: e.pre2026Value,
            currentValue: e.value,
            displacedBy: by,
          };
        }).sort((a, b) => a.pre2026Rank - b.pre2026Rank);

        results.push({
          statKey: stat.key,
          statLabel: stat.label,
          displaced: displacedEntries,
          newcomers: newcomers
            .map(n => ({ personId: n.personId, fullName: n.fullName, gained: n.gained2026, currentRank: n.rank, currentValue: n.value }))
            .sort((a, b) => a.currentRank - b.currentRank),
        });
      }));

      // Sort stats by number of displaced players desc
      results.sort((a, b) => b.displaced.length - a.displaced.length);
      setDisplacedData(results);
      setCached(CACHE_KEY, results);
    } catch {
      setDisplacedError(true);
    } finally {
      setDisplacedLoading(false);
    }
  };

  // Helper function to format game time
  const formatGameTime = (gameDate: string) => {
    try {
      const gameTime = new Date(gameDate);
      return gameTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return '';
    }
  };

  const getLastName = (person: any) => {
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

  const renderPagination = () => {
    const totalPages = Math.ceil(Object.keys(mentaculous).length / 32) || 1;
    return (
      <div className="pagination-controls">
        <button
          onClick={() => setMentaculousPage(p => Math.max(0, p - 1))}
          disabled={mentaculousPage === 0}
        >
          ← Prev
        </button>
        <span className="page-info">
          Page {mentaculousPage + 1} of {totalPages}
        </span>
        <button
          onClick={() => setMentaculousPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={mentaculousPage === totalPages - 1}
        >
          Next →
        </button>
      </div>
    );
  };

  const formatSupplementalStats = (team: any) => {
    const allPlayers = team.players || {};

    // Use HomerEntry for players with home runs
    const homers = Object.entries(allPlayers)
      .filter(([_, p]: [string, any]) => p.stats?.batting?.homeRuns > 0)
      .map(([key, p]: [string, any]) => (
        <HomerEntry
          key={key}
          player={p}
          getLastName={getLastName}
          onAdd={async (player, hr) => await handleAddToMentaculous(player, hr, team.team?.name, team.team?.id)}
          onRemove={handleRemoveHomeRun}
          mentaculous={mentaculous} // ✅ required for per-HR tracking
        />
      ));


    // Format doubles
    const doubles = Object.entries(allPlayers)
      .filter(([_, p]: [string, any]) => p.stats?.batting?.doubles > 0)
      .map(([_, p]: [string, any]) => {
        const pitchers = p.gameEvents?.doubles
          ?.map((d: any) => d.pitcher)
          .join(', ');
        return ` ${getLastName(p.person)} ${p.stats.batting.doubles}${pitchers ? `, ${pitchers}` : ''
          }`;
      });

    // Format total bases
    const totalBases = Object.entries(allPlayers)
      .filter(([_, p]: [string, any]) => p.stats?.batting?.totalBases > 0)
      .map(
        ([_, p]: [string, any]) => ` ${getLastName(p.person)} ${p.stats.batting.totalBases}`
      );

    // Format RBIs
    const rbis = Object.entries(allPlayers)
      .filter(([_, p]: [string, any]) => p.stats?.batting?.rbi > 0)
      .map(([_, p]: [string, any]) => {
        const seasonRBI = p.seasonStats?.batting?.rbi ?? 'N/A';
        return ` ${getLastName(p.person)} ${p.stats.batting.rbi} (${seasonRBI})
        `;
      });

    const steals = Object.entries(allPlayers)
      .filter(([_, p]: [string, any]) => p.stats?.batting?.stolenBases > 0)
      .map(([key, p]: [string, any]) => {
        const playerId = String(p.person.id);
        const name = getLastName(p.person);
        const gameSB = p.stats.batting.stolenBases;
        const seasonSB = p.seasonStats?.batting?.stolenBases ?? 'N/A';
        const sbId = `${playerId}_${date}`;
        const alreadyAdded = stealaculous[playerId]?.stolenBases.some(sb => sb.sbId === sbId);
        return (
          <span key={key} className="steal-entry">
            {name} {gameSB} ({seasonSB})
            {alreadyAdded ? (
              <>
                <span className="added-indicator"> Added! </span>
                <button className="remove-button" onClick={e => { e.stopPropagation(); handleRemoveStealEntry(playerId, sbId); }}>Remove SB</button>
              </>
            ) : (
              <button className="mentaculous-button" onClick={e => { e.stopPropagation(); handleAddToStealaculous(p, team.team?.name ?? 'Unknown', team.team?.id); }}>Add</button>
            )}
          </span>
        );
      });

    return (
      <div className="supplemental-stats">
        <div className="stat-section">
          {homers.length > 0 && (
            <div className="stat-line">
              <strong>HR—</strong> {homers}
            </div>
          )}
          {doubles.length > 0 && (
            <div className="stat-line">2B—{doubles.join('; ')}</div>
          )}
          {totalBases.length > 0 && (
            <div className="stat-line">TB—{totalBases.join('; ')}</div>
          )}
          {rbis.length > 0 && (
            <div className="stat-line">RBI—{rbis.join('; ')}</div>
          )}
          {steals.length > 0 && (
            <div className="stat-line">
              <strong>SB—</strong> {steals}
            </div>
          )}
        </div>

        {team.baserunning && (
          <div className="stat-section">
            <div className="stat-line">
              BASERUNNING
              {Object.entries(team.baserunning).map(([type, events]: [string, any]) => (
                <div key={type}>
                  {type.toUpperCase()}—
                  {events
                    .map(
                      (e: any) =>
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
              {Object.entries(team.fielding).map(([type, events]: [string, any]) => (
                <div key={type}>
                  {type.toUpperCase()}—
                  {events
                    .map((e: any) => `${e.player} (${e.number}, ${e.description})`)
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

  const renderPitchingStats = (team: any) => {
    const pitchers = Object.entries(team.players || {})
      .filter(([_, p]: [string, any]) => p.stats?.pitching?.inningsPitched)
      .map(([key, p]: [string, any]) => ({ key, ...p }))
      .sort((a: any, b: any) => {
        // Only use explicit pitchingOrder if both players have it from play-by-play API
        if (a.pitchingOrder !== undefined && b.pitchingOrder !== undefined) {
          return a.pitchingOrder - b.pitchingOrder;
        }
        return 0;
      });

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
              <th>P</th>
              <th>ERA</th>
            </tr>
          </thead>
          <tbody>
            {pitchers.map((player: any) => {
              const stats = player?.stats?.pitching;
              const gameSave = stats?.saves > 0;
              const seasonSaves = player?.seasonStats?.pitching?.saves ?? 0;

              return (
                <tr key={player.person.id}>
                  <td>
                    <span
                      className="clickable-name"
                      onClick={() =>
                        setSelectedPlayerId(Number(player.person.id))
                      }
                    >
                      {player.person.fullName}
                    </span>
                    {gameSave && (
                      <span className="save-indicator"> (SV, {seasonSaves})</span>
                    )}
                  </td>
                  <td>{stats.inningsPitched}</td>
                  <td>{stats.hits}</td>
                  <td>{stats.runs}</td>
                  <td>{stats.earnedRuns}</td>
                  <td>{stats.baseOnBalls}</td>
                  <td>{stats.strikeOuts}</td>
                  <td>{stats.homeRuns}</td>
                  <td>{`${stats.pitchesThrown}`}</td>
                  <td>{stats.seasonEra}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const formatBattingLine = (player: any) => {
    if (!player.gameEvents?.atBats) return '';
    return player.gameEvents.atBats
      .sort((a: any, b: any) => a.inning - b.inning)
      .map((ab: any) => {
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

  const BATTING_LEADER_CATEGORIES: { key: string; label: string }[] = [
    { key: 'homeRuns', label: 'HR' },
    { key: 'battingAverage', label: 'AVG' },
    { key: 'runsBattedIn', label: 'RBI' },
    { key: 'runs', label: 'R' },
    { key: 'hits', label: 'H' },
    { key: 'stolenBases', label: 'SB' },
    { key: 'onBasePercentage', label: 'OBP' },
    { key: 'sluggingPercentage', label: 'SLG' },
    { key: 'onBasePlusSlugging', label: 'OPS' },
    { key: 'baseOnBalls', label: 'BB' },
    { key: 'strikeOuts', label: 'SO' },
    { key: 'doubles', label: '2B' },
    { key: 'triples', label: '3B' },
  ];

  const PITCHING_LEADER_CATEGORIES: { key: string; label: string }[] = [
    { key: 'earnedRunAverage', label: 'ERA' },
    { key: 'wins', label: 'W' },
    { key: 'strikeOuts', label: 'SO' },
    { key: 'saves', label: 'SV' },
    { key: 'walksAndHitsPerInningPitched', label: 'WHIP' },
    { key: 'inningsPitched', label: 'IP' },
    { key: 'holds', label: 'HLD' },
    { key: 'completeGames', label: 'CG' },
    { key: 'shutouts', label: 'SHO' },
    { key: 'baseOnBalls', label: 'BB' },
    { key: 'hitsPerNine', label: 'H9' },
    { key: 'homeRunsPer9', label: 'HR9' },
    { key: 'strikeoutsPer9Inn', label: 'K9' },
    { key: 'strikeoutWalkRatio', label: 'K/BB' },
  ];

  const BATTING_RECORD_CATEGORIES: { key: string; label: string }[] = [
    { key: 'homeRuns', label: 'HR' },
    { key: 'battingAverage', label: 'AVG' },
    { key: 'runsBattedIn', label: 'RBI' },
    { key: 'runs', label: 'R' },
    { key: 'hits', label: 'H' },
    { key: 'stolenBases', label: 'SB' },
    { key: 'onBasePercentage', label: 'OBP' },
    { key: 'sluggingPercentage', label: 'SLG' },
    { key: 'onBasePlusSlugging', label: 'OPS' },
    { key: 'baseOnBalls', label: 'BB' },
    { key: 'doubles', label: '2B' },
    { key: 'triples', label: '3B' },
  ];

  const PITCHING_RECORD_CATEGORIES: { key: string; label: string }[] = [
    { key: 'strikeOuts', label: 'SO' },
    { key: 'wins', label: 'W' },
    { key: 'earnedRunAverage', label: 'ERA' },
    { key: 'saves', label: 'SV' },
    { key: 'walksAndHitsPerInningPitched', label: 'WHIP' },
    { key: 'inningsPitched', label: 'IP' },
    { key: 'strikeoutsPer9Inn', label: 'K9' },
    { key: 'shutouts', label: 'SHO' },
  ];

  const renderBattingStats = (team: any) => {
    const players = Object.entries(team.players || {})
      .filter(([_, p]: [string, any]) => p.stats?.batting?.plateAppearances > 0)
      .map(([key, p]: [string, any]) => ({ key, ...p }));

    return (
      <div className="team-stats">
        <h4>{team.team.name} — Batting</h4>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>AB</th>
              <th>R</th>
              <th>RBI</th>
              <th>BB</th>
              <th>SO</th>
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
                    <td>{stats.hits}/{stats.atBats}</td>
                    <td>{stats.runs}</td>
                    <td>{stats.rbi}</td>
                    <td>{stats.baseOnBalls}</td>
                    <td>{stats.strikeOuts}</td>
                    <td>{stats.seasonAvg}</td>
                    <td>{stats.seasonOps}</td>
                  </tr>
                  {battingLine && (
                    <tr className="batting-line">
                      <td colSpan={8}>{battingLine}</td>
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

  const renderStandings = () => {
    if (!standings || standings.length === 0) {
      return (
        <div className="standings-container">
          <p>Loading standings data...</p>
        </div>
      );
    }
    
    // Group teams by league and division
    const americanLeague = {
      'American League East': standings.filter(team => team.leagueName === 'American League' && team.divisionName === 'American League East'),
      'American League Central': standings.filter(team => team.leagueName === 'American League' && team.divisionName === 'American League Central'),
      'American League West': standings.filter(team => team.leagueName === 'American League' && team.divisionName === 'American League West')
    };
    
    const nationalLeague = {
      'National League East': standings.filter(team => team.leagueName === 'National League' && team.divisionName === 'National League East'),
      'National League Central': standings.filter(team => team.leagueName === 'National League' && team.divisionName === 'National League Central'),
      'National League West': standings.filter(team => team.leagueName === 'National League' && team.divisionName === 'National League West')
    };
    
    const renderDivisionTable = (divisionName: string, teams: any[]) => {
      const sortedTeams = teams.sort((a, b) => a.divisionRank - b.divisionRank);
      
      return (
        <div key={divisionName} className="division-standings">
          <h3>{divisionName}</h3>
          <table className="standings-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>W</th>
                <th>L</th>
                <th>PCT</th>
                <th>GB</th>
                <th>WCGB</th>
                <th>L10</th>
                <th>STRK</th>
                <th>RS</th>
                <th>RA</th>
                <th>DIFF</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team: any) => (
                <tr key={team.team.id} className={team.divisionLeader ? 'division-leader' : ''}>
                  <td>
                    <div className="team-cell">
                      <img 
                        src={getTeamLogoUrl(team.team.id)} 
                        alt={team.team.name}
                        className="standings-team-logo"
                      />
                      <span 
                        className="clickable-team-name"
                        onClick={() => fetchTeamRoster(team.team.id)}
                      >
                        {team.team.name}
                      </span>
                    </div>
                  </td>
                  <td>{team.wins}</td>
                  <td>{team.losses}</td>
                  <td>{team.winningPercentage}</td>
                  <td>{team.gamesBack === '-' ? '-' : team.gamesBack}</td>
                  <td>{team.wildCardGamesBack || '-'}</td>
                  <td>
                    {team.records?.splitRecords?.find((r: any) => r.type === 'lastTen')?.wins || 0}-{team.records?.splitRecords?.find((r: any) => r.type === 'lastTen')?.losses || 0}
                  </td>
                  <td>{team.streak?.streakCode || '-'}</td>
                  <td>{team.runsScored || '-'}</td>
                  <td>{team.runsAllowed || '-'}</td>
                  <td className={team.runDifferential >= 0 ? 'positive-diff' : 'negative-diff'}>
                    {team.runDifferential >= 0 ? '+' : ''}{team.runDifferential || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    const renderWildCardStandings = () => {
      const americanLeague = wildCardStandings.filter(team => team.leagueName === 'American League');
      const nationalLeague = wildCardStandings.filter(team => team.leagueName === 'National League');

      const renderWildCardTable = (leagueName: string, teams: any[]) => (
        <div key={leagueName} className="wildcard-standings">
          <h3>{leagueName} Wild Card</h3>
          <table className="standings-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>W</th>
                <th>L</th>
                <th>PCT</th>
                <th>WCGB</th>
                <th>L10</th>
                <th>STRK</th>
                <th>RS</th>
                <th>RA</th>
                <th>DIFF</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team: any, index: number) => (
                <tr key={team.team.id} className={index < 3 ? 'wildcard-spot' : ''}>
                  <td>
                    <div className="team-cell">
                      <img 
                        src={getTeamLogoUrl(team.team.id)} 
                        alt={team.team.name}
                        className="standings-team-logo"
                      />
                      <span 
                        className="clickable-team-name"
                        onClick={() => fetchTeamRoster(team.team.id)}
                      >
                        {team.team.name}
                      </span>
                    </div>
                  </td>
                  <td>{team.wins}</td>
                  <td>{team.losses}</td>
                  <td>{team.winningPercentage}</td>
                  <td>{team.wildCardGamesBack === '-' ? '-' : team.wildCardGamesBack}</td>
                  <td>{team.lastTenGamesRecord}</td>
                  <td>{team.streakCode}</td>
                  <td>{team.runsScored}</td>
                  <td>{team.runsAllowed}</td>
                  <td>{team.runDifferential}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

      return (
        <div className="wildcard-container">
          <div className="leagues-container">
            <div className="league-standings">
              {renderWildCardTable('American League', americanLeague)}
            </div>
            
            <div className="league-standings">
              {renderWildCardTable('National League', nationalLeague)}
            </div>
          </div>
        </div>
      );
    };
    
    return (
      <div className="standings-container">
        <h2>MLB Standings</h2>
        
        <div className="standings-tabs">
          <button 
            className={`standings-tab-button ${standingsTab === 'divisions' ? 'active' : ''}`}
            onClick={() => setStandingsTab('divisions')}
          >
            Divisions
          </button>
          <button 
            className={`standings-tab-button ${standingsTab === 'wildcard' ? 'active' : ''}`}
            onClick={() => setStandingsTab('wildcard')}
          >
            Wild Card
          </button>
        </div>

        {standingsTab === 'divisions' ? (
          <div className="leagues-container">
            <div className="league-standings">
              <h2>American League</h2>
              {Object.entries(americanLeague).map(([divisionName, teams]) => 
                renderDivisionTable(divisionName, teams)
              )}
            </div>
            
            <div className="league-standings">
              <h2>National League</h2>
              {Object.entries(nationalLeague).map(([divisionName, teams]) => 
                renderDivisionTable(divisionName, teams)
              )}
            </div>
          </div>
        ) : (
          renderWildCardStandings()
        )}
      </div>
    );
  };

  const renderRoster = () => {
    if (!selectedTeamRoster || !teamRoster.length) {
      return <div className="roster-container">No roster data available</div>;
    }

    // Group players by position groups
    const positionGroups = {
      'Pitchers': teamRoster.filter(p => p.position.abbreviation === 'P'),
      'Catchers': teamRoster.filter(p => p.position.abbreviation === 'C'),
      'Infielders': teamRoster.filter(p => ['1B', '2B', '3B', 'SS', 'IF'].includes(p.position.abbreviation)),
      'Outfielders': teamRoster.filter(p => ['LF', 'CF', 'RF', 'OF'].includes(p.position.abbreviation)),
      'Designated Hitters': teamRoster.filter(p => p.position.abbreviation === 'DH'),
      'Other': teamRoster.filter(p => !['P', 'C', '1B', '2B', '3B', 'SS', 'IF', 'LF', 'CF', 'RF', 'OF', 'DH'].includes(p.position.abbreviation))
    };

    const groupOrder = ['Pitchers', 'Catchers', 'Infielders', 'Outfielders', 'Designated Hitters', 'Other'];
    
    return (
      <div className="roster-container">
        <div className="roster-header">
          <div className="team-header">
            <img 
              src={getTeamLogoUrl(selectedTeamRoster.id)} 
              alt={selectedTeamRoster.name}
              className="roster-team-logo"
            />
            <h2>{selectedTeamRoster.name} Roster</h2>
          </div>
          <button 
            className="back-button"
            onClick={() => {
              setActiveTab('standings');
              setSelectedTeamRoster(null);
              setTeamRoster([]);
            }}
          >
            ← Back to Standings
          </button>
        </div>
        
        <div className="roster-positions">
          {groupOrder.map(groupName => {
            const players = positionGroups[groupName as keyof typeof positionGroups];
            if (!players || players.length === 0) return null;
            
            return (
              <div key={groupName} className="position-group">
                <h3 className="position-title">{groupName}</h3>
                <div className="players-grid">
                  {players.map((player: any) => (
                    <div 
                      key={player.person.id} 
                      className="roster-player-card"
                      onClick={() => setSelectedPlayerId(player.person.id)}
                    >
                      <img
                        src={`https://img.mlbstatic.com/mlb-photos/image/upload/v1/people/${player.person.id}/headshot/67/current.png`}
                        alt={player.person.fullName}
                        className="roster-player-photo"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="roster-player-info">
                        <div className="roster-player-name">{player.person.fullName}</div>
                        <div className="roster-player-details">
                          #{player.jerseyNumber} • {player.position.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Returns asterisk string for a player's HR milestone hit this season.
  // e.g. 100th career HR → "*", 200th → "**", 300th → "***"
  const getMilestoneAsterisks = (homeRuns: HomeRun[]): string => {
    for (const hr of homeRuns) {
      if (hr.careerHRNumber && hr.careerHRNumber % 100 === 0) {
        return '*'.repeat(hr.careerHRNumber / 100);
      }
    }
    return '';
  };

  const renderMentaculous = () => {
    const q = mentSearch.trim().toLowerCase();
    const entries = order
      .map(id => [id, mentaculous[id]] as [string, MentaculousPlayer])
      .filter(([, entry]) => entry)
      .filter(([, p]) => !q || p.playerName.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q));

    // Jump to the page containing the first match when searching
    const totalPages = Math.ceil(entries.length / 32) || 1;
    const safeMentPage = Math.min(mentaculousPage, totalPages - 1);

    const start = safeMentPage * 32;
    const currentEntries = entries.slice(start, start + 32);
    const maxHRs = Math.max(0, ...currentEntries.map(([, p]) => p.homeRuns.length));

    // Team HR leaders: max HRs per team across all entries (not just current page)
    const teamMaxHRs: Record<string, number> = {};
    for (const [, p] of entries) {
      const t = p.teamName;
      if (!teamMaxHRs[t] || p.homeRuns.length > teamMaxHRs[t]) {
        teamMaxHRs[t] = p.homeRuns.length;
      }
    }

    return (
      <div className="mentaculous-container">
        <div className="tracker-search-bar">
          <input
            className="tracker-search"
            type="text"
            placeholder="Search players or teams…"
            value={mentSearch}
            onChange={e => { setMentSearch(e.target.value); setMentaculousPage(0); }}
          />
          {mentSearch && <button className="tracker-search-clear" onClick={() => setMentSearch('')}>✕</button>}
        </div>

        {totalPages > 1 && (
          <div className="pagination-controls">
            <button onClick={() => setMentaculousPage(p => Math.max(0, p - 1))} disabled={safeMentPage === 0}>← Prev</button>
            <span className="page-info">Page {safeMentPage + 1} of {totalPages}</span>
            <button onClick={() => setMentaculousPage(p => Math.min(totalPages - 1, p + 1))} disabled={safeMentPage >= totalPages - 1}>Next →</button>
          </div>
        )}

        <div className="mentaculous-page notebook">
          <div className="notebook-title-line">
            <h2>Mentaculous</h2>
          </div>
          <div className="notebook-lines" ref={linesContainerRef}>
            {Array.from({ length: 33 }).map((_, i) => {
              if (i === 0) {
                return (
                  <div key="spacer" className="notebook-line empty" />
                );
              }

              const entry = currentEntries[i - 1];
              if (!entry) {
                return (
                  <div key={i} className="notebook-line empty" />
                );
              }

              const [playerId, { playerName, homeRuns, teamName, teamId }] = entry;
              const teamAbbr = getTeamAbbreviation(teamName);
              const isLeader = homeRuns.length > 0 && homeRuns.length === maxHRs;
              const isTeamLeader = homeRuns.length > 0 && homeRuns.length === teamMaxHRs[teamName];

              return (
                <div key={playerId} className="notebook-line.filled">
                  {manualOverride && (
                    <>
                      {/* ↑↓ arrows */}
                      <button className="arrow-btn" onClick={() => move(playerId, -10)} title="Move up 10">«</button>
                      <button className="arrow-btn" onClick={() => move(playerId, -1)} title="Move up 1">↑</button>
                      <button className="arrow-btn" onClick={() => move(playerId, +1)} title="Move down 1">↓</button>
                      <button className="arrow-btn" onClick={() => move(playerId, +10)} title="Move down 10">»</button>
                    </>
                  )}
                  <div
                    key={playerId}
                    ref={(r) => { lineRefs.current[playerId] = r; }}
                    className={`notebook-line filled ${updatedPlayerId === parseInt(playerId) ? 'update-animate' : ''} ${newPlayerId === parseInt(playerId) ? 'new-player-animate' : ''}`}
                  >
                    <div className="notebook-left">
                      {teamId && (
                        <img
                          className="team-logo"
                          src={getTeamLogoUrl(Number(teamId))}
                          alt={teamAbbr}
                          width={24}
                          height={24}
                        />
                      )}
                      <span className="notebook-abbr" style={{ fontStyle: isTeamLeader ? 'italic' : undefined }}>{teamAbbr}</span>
                    </div>

                    <div className="player-info">
                      <div className="player-name">
                        <span className={`mentaculous-font${isLeader ? ' mentaculous-leader' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setSelectedPlayerId(parseInt(playerId))}>{removeAccents(playerName)}</span> –{' '}
                        <span
                          className={`hr-count-wrapper${isLeader ? ' mentaculous-leader' : ''}`}
                          onClick={() =>
                            setTooltipOpenId((prev) =>
                              prev === parseInt(playerId) ? null : parseInt(playerId)
                            )
                          }
                        >
                          {updatedPlayerId === parseInt(playerId) ? (
                            <>
                              <span className="count-old">{prevCountRef.current[playerId]}</span>
                              <span className="count-new">{homeRuns.length}{getMilestoneAsterisks(homeRuns)}</span>
                            </>
                          ) : <>{homeRuns.length}{getMilestoneAsterisks(homeRuns)}</>}
                          {tooltipOpenId === parseInt(playerId) && (
                            <div className="tooltip-box">
                              {homeRuns.map((hr: any, idx: number) => {
                                const { date } = parseHrId(hr.hrId ?? hr);
                                const formatted = new Date(date).toLocaleDateString(
                                  undefined,
                                  { month: 'short', day: 'numeric' }
                                );
                                const opponent = hr.opponent || 'Unknown';
                                return (
                                  <div key={idx} className="tooltip-line">
                                    {formatted} {opponent}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </span>
                      </div>

                      <div className="player-buttons">
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {renderPagination()}
        <div className="manual-override-toggle">
          <button onClick={() => setManualOverride(o => !o)}>
            {manualOverride ? 'Disable Manual Override' : 'Enable Manual Override'}
          </button>
        </div>
      </div>
    );
  };

  const renderStealaculous = () => {
    const sq = stealSearch.trim().toLowerCase();
    const entries = stealOrder
      .map(id => [id, stealaculous[id]] as [string, StealaculousPlayer])
      .filter(([, entry]) => entry)
      .filter(([, p]) => !sq || p.playerName.toLowerCase().includes(sq) || p.teamName.toLowerCase().includes(sq));

    const totalPages = Math.ceil(entries.length / 32) || 1;
    const safePage = Math.min(stealaculousPage, totalPages - 1);
    if (safePage !== stealaculousPage) setStealaculousPage(safePage);
    const start = safePage * 32;
    const currentEntries = entries.slice(start, start + 32);

    return (
      <div className="mentaculous-container">
        <div className="tracker-search-bar">
          <input
            className="tracker-search"
            type="text"
            placeholder="Search players or teams…"
            value={stealSearch}
            onChange={e => { setStealSearch(e.target.value); setStealaculousPage(0); }}
          />
          {stealSearch && <button className="tracker-search-clear" onClick={() => setStealSearch('')}>✕</button>}
        </div>

        {totalPages > 1 && (
          <div className="pagination-controls">
            <button onClick={() => setStealaculousPage(p => Math.max(0, p - 1))} disabled={safePage === 0}>← Prev</button>
            <span className="page-info">Page {safePage + 1} of {totalPages}</span>
            <button onClick={() => setStealaculousPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}>Next →</button>
          </div>
        )}
        <div className="mentaculous-page notebook">
          <div className="notebook-title-line">
            <h2>Stealaculous</h2>
          </div>
          <div className="notebook-lines">
            {Array.from({ length: 33 }).map((_, i) => {
              if (i === 0) return <div key="spacer" className="notebook-line empty" />;
              const entry = currentEntries[i - 1];
              if (!entry) return <div key={i} className="notebook-line empty" />;
              const [playerId, { playerName, teamName, teamId, stolenBases }] = entry;
              const teamAbbr = getTeamAbbreviation(teamName);
              const totalSBs = stolenBases.reduce((sum, sb) => sum + sb.gameSBs, 0);
              return (
                <div
                  key={playerId}
                  ref={(r) => { stealLineRefs.current[playerId] = r; }}
                  className={`notebook-line filled ${updatedPlayerId === parseInt(playerId) ? 'update-animate' : ''} ${newPlayerId === parseInt(playerId) ? 'new-player-animate' : ''}`}
                >
                  <div className="notebook-left">
                    {teamId && (
                      <img className="team-logo" src={getTeamLogoUrl(Number(teamId))} alt={teamAbbr} width={24} height={24} />
                    )}
                    <span className="notebook-abbr">{teamAbbr}</span>
                  </div>
                  <div className="player-info">
                    <div className="player-name">
                      <span
                        className="mentaculous-font"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedPlayerId(parseInt(playerId))}
                      >
                        {removeAccents(playerName)}
                      </span> –{' '}
                      <span
                        className="hr-count-wrapper"
                        onClick={() => setTooltipOpenId(prev => prev === parseInt(playerId) ? null : parseInt(playerId))}
                      >
                        {updatedPlayerId === parseInt(playerId) ? (
                          <>
                            <span className="count-old">{totalSBs - (stolenBases[stolenBases.length - 1]?.gameSBs ?? 0)}</span>
                            <span className="count-new">{totalSBs}</span>
                          </>
                        ) : totalSBs}
                        {tooltipOpenId === parseInt(playerId) && (
                          <div className="tooltip-box">
                            {stolenBases.map((sb, idx) => {
                              const datePart = (sb.sbId ?? '').split('_')[1] ?? '';
                              const formatted = datePart
                                ? new Date(datePart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                : '?';
                              return (
                                <div key={idx} className="tooltip-line">
                                  {formatted} — {sb.gameSBs} SB (season: {sb.seasonTotalSB})
                                  <button
                                    className="remove-button"
                                    onClick={e => { e.stopPropagation(); handleRemoveStealEntry(playerId, sb.sbId); }}
                                  >x</button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </span>
                    </div>
                      <div className="player-buttons" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button onClick={() => setStealaculousPage(p => Math.max(0, p - 1))} disabled={safePage === 0}>← Prev</button>
            <span className="page-info">Page {safePage + 1} of {totalPages}</span>
            <button onClick={() => setStealaculousPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}>Next →</button>
          </div>
        )}
      </div>
    );
  };

  const renderLeaderTable = (data: any[], showAllBtn?: React.ReactNode) => (
    <>
      <table className="leaders-table">
        <tbody>
          {data.map((entry: any, i: number) => (
            <tr key={i}>
              <td className="leaders-rank">{entry.rank ?? i + 1}</td>
              <td className="leaders-name">
                {entry.person?.id ? (
                  <span
                    className="clickable-name"
                    onClick={() => setSelectedPlayerId(Number(entry.person.id))}
                  >
                    {entry.person.fullName}
                  </span>
                ) : (
                  <span>{entry.person?.fullName ?? entry.value ?? '—'}</span>
                )}
              </td>
              <td className="leaders-team">{entry.team?.abbreviation ?? '—'}</td>
              <td className="leaders-value">{entry.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {showAllBtn}
    </>
  );

  const renderRecords = () => {
    const allTimeCategories = recordsGroup === 'batting' ? BATTING_RECORD_CATEGORIES : PITCHING_RECORD_CATEGORIES;
    const activeCategories = activeRecordsGroup === 'batting' ? BATTING_RECORD_CATEGORIES : PITCHING_RECORD_CATEGORIES;

    const switchGroup = (g: 'batting' | 'pitching') => {
      setRecordsGroup(g);
      setRecordsCategory(g === 'batting' ? 'homeRuns' : 'strikeOuts');
      setRecordsData([]);
    };

    const switchActiveGroup = (g: 'batting' | 'pitching') => {
      setActiveRecordsGroup(g);
      setActiveRecordsCategory(g === 'batting' ? 'homeRuns' : 'strikeOuts');
      setActiveRecordsData([]);
    };

    return (
      <div
        className="leaders-container"
        onTouchStart={e => { if (window.scrollY === 0) recordsPullStartYRef.current = e.touches[0].clientY; }}
        onTouchMove={e => {
          if (recordsPullStartYRef.current === null) return;
          const dy = e.touches[0].clientY - recordsPullStartYRef.current;
          if (dy > 0) setRecordsPullDistance(Math.min(dy * 0.4, 72));
        }}
        onTouchEnd={() => {
          if (recordsPullDistance >= 60) setRecordsRefreshKey(k => k + 1);
          setRecordsPullDistance(0);
          recordsPullStartYRef.current = null;
        }}
      >
        {(recordsPullDistance > 0 || (recordsLoading && recordsRefreshKey > 0)) && (
          <div className="pull-indicator" style={{ height: (recordsLoading && recordsRefreshKey > 0) ? 44 : recordsPullDistance * 0.6 }}>
            <span className={`pull-spinner${(recordsLoading && recordsRefreshKey > 0) ? ' spinning' : ''}`}>↻</span>
            <span className="pull-label">
              {(recordsLoading && recordsRefreshKey > 0) ? 'Refreshing…' : recordsPullDistance >= 60 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        )}
        <div className="leaders-subtabs" style={{ marginBottom: '0.5rem' }}>
          <button className={recordsSubTab === 'all-time' ? 'active' : ''} onClick={() => setRecordsSubTab('all-time')}>
            All-Time Top 500
          </button>
          <button className={recordsSubTab === 'active' ? 'active' : ''} onClick={() => setRecordsSubTab('active')}>
            Active Roster
          </button>
        </div>

        {recordsSubTab === 'all-time' && (
          <>
            <div className="leaders-subtabs">
              <button className={recordsGroup === 'batting' ? 'active' : ''} onClick={() => switchGroup('batting')}>Batting</button>
              <button className={recordsGroup === 'pitching' ? 'active' : ''} onClick={() => switchGroup('pitching')}>Pitching</button>
            </div>
            <div className="pills-fade-container">
            <div className="leaders-pills">
              {allTimeCategories.map(cat => (
                <button
                  key={cat.key}
                  className={`leaders-pill${recordsCategory === cat.key ? ' active' : ''}`}
                  onClick={() => { if (cat.key !== recordsCategory) { setRecordsCategory(cat.key); setRecordsData([]); } }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            </div>
            {recordsLoading && <div className="leaders-status">Loading...</div>}
            {recordsError && <div className="leaders-status">Failed to load</div>}
            {!recordsLoading && !recordsError && recordsData.length > 0 && renderLeaderTable(recordsData)}
          </>
        )}

        {recordsSubTab === 'active' && (
          <>
            <div className="leaders-subtabs">
              <button className={activeRecordsGroup === 'batting' ? 'active' : ''} onClick={() => switchActiveGroup('batting')}>Batting</button>
              <button className={activeRecordsGroup === 'pitching' ? 'active' : ''} onClick={() => switchActiveGroup('pitching')}>Pitching</button>
            </div>
            <div className="pills-fade-container">
            <div className="leaders-pills">
              {activeCategories.map(cat => (
                <button
                  key={cat.key}
                  className={`leaders-pill${activeRecordsCategory === cat.key ? ' active' : ''}`}
                  onClick={() => { if (cat.key !== activeRecordsCategory) { setActiveRecordsCategory(cat.key); setActiveRecordsData([]); } }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            </div>
            {activeRecordsLoading && <div className="leaders-status">Loading...</div>}
            {activeRecordsError && <div className="leaders-status">Failed to load</div>}
            {!activeRecordsLoading && !activeRecordsError && activeRecordsData.length > 0 && renderLeaderTable(activeRecordsData)}
          </>
        )}
      </div>
    );
  };

  const renderDisplaced = () => {
    if (displacedLoading) return <div className="loading">Computing displaced players…</div>;
    if (displacedError) return <div className="loading">Failed to load displaced data.</div>;

    const year = new Date().getFullYear();

    return (
      <div className="leaders-container">
        <h2 style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Displaced from Top 500</h2>
        <p style={{ textAlign: 'center', fontSize: '0.85em', color: '#888', marginBottom: '1.25rem' }}>
          Players who started {year} in the all-time top 500 but have since been passed out of it
        </p>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <button className="leaders-show-all" onClick={() => fetchDisplaced(true)}>Refresh</button>
        </div>

        {displacedData.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
            {displacedLoading ? '' : 'No displacements detected yet — check back as the season progresses.'}
          </p>
        ) : displacedData.map(result => (
          <div key={result.statKey} className="displaced-stat-section">
            <div className="displaced-stat-header">
              <span className="milestone-stat-badge">{result.statLabel}</span>
              <span className="displaced-count">
                {result.displaced.length} {result.displaced.length === 1 ? 'player' : 'players'} displaced
              </span>
            </div>

            <div className="displaced-columns">
              <div className="displaced-col">
                <div className="displaced-col-label">Displaced out</div>
                {result.displaced.map(d => (
                  <div key={d.personId} className="displaced-player-row">
                    <span
                      className="displaced-player-name"
                      onClick={() => setSelectedPlayerId(d.personId)}
                    >
                      {d.fullName}
                    </span>
                    <span className="displaced-ranks">
                      <span className="displaced-was">was #{d.pre2026Rank}</span>
                      <span className="displaced-arrow">→</span>
                      <span className="displaced-now">now #{d.currentRank}</span>
                    </span>
                    <span className="displaced-value">{d.pre2026Value.toLocaleString()} → {d.currentValue.toLocaleString()}</span>
                    {d.displacedBy.length > 0 && (
                      <span className="displaced-by-line">
                        passed by{' '}
                        {d.displacedBy.map((b, i) => (
                          <span key={b.personId}>
                            <span
                              className="displaced-passer-name"
                              onClick={() => setSelectedPlayerId(b.personId)}
                            >{b.fullName}</span>
                            {i < d.displacedBy.length - 1 && ', '}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="displaced-col">
                <div className="displaced-col-label">Entered top 500</div>
                {result.newcomers.map(n => (
                  <div key={n.personId} className="displaced-player-row displaced-newcomer">
                    <span
                      className="displaced-player-name"
                      onClick={() => setSelectedPlayerId(n.personId)}
                    >
                      {n.fullName}
                    </span>
                    <span className="displaced-ranks">
                      <span className="displaced-now">#{n.currentRank} all-time</span>
                    </span>
                    <span className="displaced-value">+{n.gained.toLocaleString()} in {year} · {n.currentValue.toLocaleString()} career</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMilestones = () => {
    const subTabs = (
      <div className="leaders-subtabs" style={{ marginBottom: '1.25rem' }}>
        <button
          className={milestoneSubTab === 'tracker' ? 'active' : ''}
          onClick={() => setMilestoneSubTab('tracker')}
        >Milestone Tracker</button>
        <button
          className={milestoneSubTab === 'displaced' ? 'active' : ''}
          onClick={() => setMilestoneSubTab('displaced')}
        >Displaced from Top 500</button>
      </div>
    );

    if (milestoneSubTab === 'displaced') {
      return (
        <div className="leaders-container">
          {subTabs}
          {renderDisplaced()}
        </div>
      );
    }

    if (milestonesLoading) return <div className="leaders-container">{subTabs}<div className="loading">Loading milestones…</div></div>;
    if (milestonesError) return <div className="leaders-container">{subTabs}<div className="loading">Failed to load milestones.</div></div>;

    if (milestoneEvents.length === 0) {
      return (
        <div className="leaders-container">
          {subTabs}
          <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            No top-500 all-time passings found for your mentaculous players in {new Date().getFullYear()}.
          </p>
        </div>
      );
    }

    const formatDate = (d: string | null) => {
      if (!d) return null;
      const [y, m, day] = d.split('-');
      return new Date(Number(y), Number(m) - 1, Number(day))
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const toggleDay = (dayKey: string) => {
      setOpenMilestoneDays(prev => (
        prev.includes(dayKey) ? prev.filter(day => day !== dayKey) : [...prev, dayKey]
      ));
    };

    const mq = milestoneSearch.trim().toLowerCase();
    const uniqueStats = Array.from(new Map(milestoneEvents.map(ev => [ev.statKey, ev.statLabel])).entries());
    const filteredEvents = milestoneEvents
      .filter(ev => !mq || ev.playerName.toLowerCase().includes(mq))
      .filter(ev => !milestoneStatFilter || ev.statKey === milestoneStatFilter);

    return (
      <div className="leaders-container">
        {subTabs}
        <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>
          Milestone Tracker — {new Date().getFullYear()}
        </h2>

        <p style={{ textAlign: 'center', fontSize: '0.85em', color: '#666', marginBottom: '1rem' }}>
          Top-500 all-time passings · most recent first
        </p>

        <div className="tracker-search-bar" style={{ marginBottom: '10px' }}>
          <input
            className="tracker-search"
            type="text"
            placeholder="Search players…"
            value={milestoneSearch}
            onChange={e => setMilestoneSearch(e.target.value)}
          />
          {milestoneSearch && <button className="tracker-search-clear" onClick={() => setMilestoneSearch('')}>✕</button>}
        </div>

        <div className="pills-fade-container" style={{ marginBottom: '1.5rem' }}>
          <div className="leaders-pills">
            <button
              className={`leaders-pill${!milestoneStatFilter ? ' active' : ''}`}
              onClick={() => setMilestoneStatFilter(null)}
            >All</button>
            {uniqueStats.map(([key, label]) => (
              <button
                key={key}
                className={`leaders-pill${milestoneStatFilter === key ? ' active' : ''}`}
                onClick={() => setMilestoneStatFilter(milestoneStatFilter === key ? null : key)}
              >{label}</button>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <button className="leaders-show-all" onClick={() => fetchMilestones(true)}>Refresh</button>
        </div>
        {filteredEvents.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No milestones match your filters.</p>
        ) : (() => {
          const byDay = new Map<string, MilestoneEvent[]>();
          for (const ev of filteredEvents) {
            const dayKey = ev.date ?? 'unknown';
            if (!byDay.has(dayKey)) byDay.set(dayKey, []);
            byDay.get(dayKey)!.push(ev);
          }

          return Array.from(byDay.entries()).map(([dayKey, dayEvents]) => {
            const groups: { key: string; events: MilestoneEvent[] }[] = [];
            const seen = new Map<string, MilestoneEvent[]>();
            for (const ev of dayEvents) {
              const groupKey = `${ev.playerId}__${ev.statKey}__${ev.date ?? 'unknown'}`;
              if (!seen.has(groupKey)) {
                seen.set(groupKey, []);
                groups.push({ key: groupKey, events: seen.get(groupKey)! });
              }
              seen.get(groupKey)!.push(ev);
            }

            const isOpen = openMilestoneDays.includes(dayKey);
            return (
              <div key={dayKey} className="milestone-day-group">
                <button className="milestone-day-header" onClick={() => toggleDay(dayKey)}>
                  <span className="milestone-day-title">{formatDate(dayKey) ?? 'Unknown date'}</span>
                  <span className="milestone-day-count">{groups.length} {groups.length === 1 ? 'milestone' : 'milestones'}</span>
                  <span className={`milestone-day-chevron${isOpen ? ' open' : ''}`}>▾</span>
                </button>
                {isOpen && (
                  <div className="milestone-day-cards">
                    {groups.map(({ key, events: grp }) => {
                      const rep = grp[0];
                      const sorted = [...grp].sort((a, b) => a.passedRank - b.passedRank);
                      return (
                        <div key={key} className="milestone-card">
                          <div className="milestone-card-header">
                            <div className="milestone-card-left">
                              <span className="milestone-stat-badge">{rep.statLabel}</span>
                              <span className="milestone-player-name" onClick={() => setSelectedPlayerId(Number(rep.playerId))}>
                                {rep.playerName}
                              </span>
                            </div>
                            {rep.date && <span className="milestone-date">{formatDate(rep.date)}</span>}
                          </div>
                          <div className="milestone-card-passed">
                            passed{' '}
                            {sorted.map((ev, pi) => (
                              <span key={ev.passedPersonId}>
                                <strong
                                  className="milestone-passed-name"
                                  onClick={() => setSelectedPlayerId(ev.passedPersonId)}
                                >
                                  {ev.passedName}
                                </strong>
                                <span className="milestone-rank-chip">#{ev.passedRank}</span>
                                {pi < sorted.length - 1 && <span style={{ color: '#bbb' }}> · </span>}
                              </span>
                            ))}
                          </div>
                          <div className="milestone-card-stats">
                            <div className="milestone-stat-block">
                              <span className="milestone-stat-num">{rep.seasonValue.toLocaleString()}</span>
                              <span className="milestone-stat-sub">on the season</span>
                            </div>
                            <div className="milestone-stat-sep">·</div>
                            <div className="milestone-stat-block">
                              <span className="milestone-stat-num">{rep.crossingValue.toLocaleString()}</span>
                              <span className="milestone-stat-sub">career</span>
                            </div>
                            <div className="milestone-card-rank">
                              moved to #{rep.crossingRank} all-time
                              {rep.tiedPersonIds.length > 0 && (
                                <>
                                  {' '}
                                  tied with{' '}
                                  {rep.tiedPersonIds.map((personId, index) => (
                                    <span key={personId}>
                                      <strong
                                        className="milestone-passed-name"
                                        onClick={() => setSelectedPlayerId(personId)}
                                      >
                                        {rep.tiedNames[index]}
                                      </strong>
                                      {index < rep.tiedPersonIds.length - 1 && <span style={{ color: '#bbb' }}> · </span>}
                                    </span>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>
    );
  };

  const renderLeaders = () => {
    const categories = leadersTab === 'batting' ? BATTING_LEADER_CATEGORIES : PITCHING_LEADER_CATEGORIES;
    const displayData = leadersShowAll ? leadersAllData : leadersData;
    const currentYear = new Date().getFullYear();

    return (
      <div className="leaders-container">
        <div className="leaders-subtabs">
          <button
            className={leadersTab === 'batting' ? 'active' : ''}
            onClick={() => {
              setLeadersTab('batting');
              setLeadersCategory('homeRuns');
              setLeadersShowAll(false);
              setLeadersAllData([]);
              setLeadersData([]);
            }}
          >
            Batting
          </button>
          <button
            className={leadersTab === 'pitching' ? 'active' : ''}
            onClick={() => {
              setLeadersTab('pitching');
              setLeadersCategory('earnedRunAverage');
              setLeadersShowAll(false);
              setLeadersAllData([]);
              setLeadersData([]);
            }}
          >
            Pitching
          </button>
        </div>

        <div className="pills-fade-container">
        <div className="leaders-pills">
          {categories.map(cat => (
            <button
              key={cat.key}
              className={`leaders-pill${leadersCategory === cat.key ? ' active' : ''}`}
              onClick={() => {
                if (cat.key === leadersCategory) return;
                setLeadersCategory(cat.key);
                setLeadersShowAll(false);
                setLeadersAllData([]);
                setLeadersData([]);
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        </div>

        {leadersYear && leadersYear !== currentYear && (
          <div className="leaders-year-label">({leadersYear} season)</div>
        )}

        {leadersLoading && <div className="leaders-status">Loading...</div>}
        {leadersError && <div className="leaders-status">Failed to load</div>}

        {!leadersLoading && !leadersError && displayData.length > 0 && (
          <>
            <table className="leaders-table">
              <tbody>
                {displayData.map((entry: any, i: number) => (
                  <tr key={i}>
                    <td className="leaders-rank">{entry.rank ?? i + 1}</td>
                    <td className="leaders-name">
                      {entry.person?.id ? (
                        <span
                          className="clickable-name"
                          onClick={() => setSelectedPlayerId(Number(entry.person.id))}
                        >
                          {entry.person.fullName}
                        </span>
                      ) : (
                        <span>{entry.person?.fullName ?? '—'}</span>
                      )}
                    </td>
                    <td className="leaders-team">{entry.team?.abbreviation ?? '—'}</td>
                    <td className="leaders-value">{entry.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!leadersShowAll && leadersData.length > 25 && (
              <button
                className="leaders-show-all"
                onClick={() => fetchLeaders(leadersCategory, leadersTab === 'batting' ? 'hitting' : 'pitching', true)}
              >
                Show all
              </button>
            )}
            {leadersShowAll && (
              <button
                className="leaders-show-all"
                onClick={() => {
                  setLeadersShowAll(false);
                }}
              >
                Show top 25
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  const [historicalPage, setHistoricalPage] = useState(0);
  const [historicalTooltipId, setHistoricalTooltipId] = useState<string | null>(null);

  const renderHistorical = () => {
    const { mentaculous: hist, mentorder: histOrder } = historical2025;
    const entries = histOrder
      .map(id => [id, hist[id]] as [string, any])
      .filter(([, e]) => e);

    const pageSize = 32;
    const totalPages = Math.ceil(entries.length / pageSize);
    const start = historicalPage * pageSize;
    const currentEntries = entries.slice(start, start + pageSize);

    return (
      <div className="mentaculous-container">
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '8px 0' }}>
          <button onClick={() => setHistoricalPage(p => Math.max(0, p - 1))} disabled={historicalPage === 0}>◀</button>
          <span style={{ lineHeight: '32px' }}>Page {historicalPage + 1} / {totalPages}</span>
          <button onClick={() => setHistoricalPage(p => Math.min(totalPages - 1, p + 1))} disabled={historicalPage >= totalPages - 1}>▶</button>
        </div>

        <div className="mentaculous-page notebook">
          <div className="notebook-title-line">
            <h2>Historical Mentaculi — 2025</h2>
          </div>
          <div className="notebook-lines">
            {Array.from({ length: 33 }).map((_, i) => {
              if (i === 0) return <div key="spacer" className="notebook-line empty" />;
              const entry = currentEntries[i - 1];
              if (!entry) return <div key={i} className="notebook-line empty" />;

              const [playerId, { playerName, homeRuns, teamName, teamId }] = entry;
              const teamAbbr = getTeamAbbreviation(teamName);

              return (
                <div key={playerId} className="notebook-line filled">
                  <div className="notebook-left">
                    {teamId && (
                      <img
                        className="team-logo"
                        src={getTeamLogoUrl(Number(teamId))}
                        alt={teamAbbr}
                        width={24}
                        height={24}
                      />
                    )}
                    <span className="notebook-abbr">{teamAbbr}</span>
                  </div>
                  <div className="player-info">
                    <div className="player-name">
                      <span className="mentaculous-font">{removeAccents(playerName)}</span> –{' '}
                      <span
                        className="hr-count-wrapper"
                        onClick={() => setHistoricalTooltipId(prev => prev === playerId ? null : playerId)}
                      >
                        {homeRuns.length}
                        {historicalTooltipId === playerId && (
                          <div className="tooltip-box">
                            {homeRuns.map((hr: any, idx: number) => {
                              const { date } = parseHrId(hr.hrId ?? hr);
                              const formatted = new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                              return (
                                <div key={idx} className="tooltip-line">
                                  {formatted} {hr.opponent || 'Unknown'}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '8px 0' }}>
          <button onClick={() => setHistoricalPage(p => Math.max(0, p - 1))} disabled={historicalPage === 0}>◀</button>
          <span style={{ lineHeight: '32px' }}>Page {historicalPage + 1} / {totalPages}</span>
          <button onClick={() => setHistoricalPage(p => Math.min(totalPages - 1, p + 1))} disabled={historicalPage >= totalPages - 1}>▶</button>
        </div>
      </div>
    );
  };

  const handleRemoveHomeRun = (playerId: string, hrId: string) => {
    const prevPlayer = mentaculous[playerId];
    if (!prevPlayer) return;
    const newHomeRuns = prevPlayer.homeRuns.filter(hr => hr.hrId !== hrId);
    if (newHomeRuns.length === 0) {
      const newMentaculous = { ...mentaculous };
      delete newMentaculous[playerId];
      setMentaculous(newMentaculous);
      setOrder(order.filter(id => id !== playerId));
    } else {
      setMentaculous({
        ...mentaculous,
        [playerId]: { ...prevPlayer, homeRuns: newHomeRuns },
      });
    }
  };

  const handleAddToStealaculous = (player: any, teamName: string, teamId?: string) => {
    const playerId = String(player.person.id);
    const playerName: string = player.person.fullName;
    const gameSBs: number = player.stats?.batting?.stolenBases ?? 0;
    const seasonTotalSB: number = player.seasonStats?.batting?.stolenBases ?? 0;
    const sbId = `${playerId}_${date}`;
    setStealaculous(prev => {
      if (prev[playerId]?.stolenBases.some(sb => sb.sbId === sbId)) return prev;
      const prevPlayer = prev[playerId] ?? { stolenBases: [], playerName, teamName, teamId: teamId ?? '', addedAt: Date.now() };
      return {
        ...prev,
        [playerId]: {
          ...prevPlayer,
          stolenBases: [...prevPlayer.stolenBases, { sbId, gameSBs, seasonTotalSB }],
          playerName,
          teamName,
          teamId: teamId ?? '',
        },
      };
    });
    const isNewPlayer = !stealaculousRef.current[playerId];
    setStealOrder(o => o.includes(playerId) ? o : [...o, playerId]);
    setTimeout(() => {
      setActiveTab('stealaculous');
      if (isNewPlayer) {
        setNewPlayerId(Number(playerId));
        setTimeout(() => setNewPlayerId(null), 2100);
      } else {
        setUpdatedPlayerId(Number(playerId));
        setTimeout(() => setUpdatedPlayerId(null), 1600);
      }
      const currentOrder = stealOrderRef.current;
      const idx = Math.max(0, currentOrder.indexOf(playerId));
      const page = Math.floor(idx / 32);
      setStealaculousPage(page);
      setTimeout(() => {
        stealLineRefs.current[playerId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }, 0);
  };

  const handleRemoveStealEntry = (playerId: string, sbId: string) => {
    setStealaculous(prev => {
      const prevPlayer = prev[playerId];
      if (!prevPlayer) return prev;
      const newSBs = prevPlayer.stolenBases.filter(sb => sb.sbId !== sbId);
      if (newSBs.length === 0) {
        const next = { ...prev };
        delete next[playerId];
        setStealOrder(o => o.filter(id => id !== playerId));
        return next;
      }
      return { ...prev, [playerId]: { ...prevPlayer, stolenBases: newSBs } };
    });
  };

  // Add a home run to mentaculous for a player (restored async version with opponent lookup and navigation)
  const handleAddToMentaculous = async (player: any, hr: any, teamName: string, teamId?: string) => {
    const playerId = Number(player.person.id);
    if (!hr?.hrId) return;

    const hrDate = hr.hrId.split('_')[1];

    // Try to find in existing games first — match both date AND team
    let matchingGame = games.find((g) =>
      g.gameDate.startsWith(hrDate) &&
      (g.teams.away.team.name === teamName || g.teams.home.team.name === teamName)
    );

    if (!matchingGame) {
      try {
        const res = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${hrDate}`);
        const data = await res.json();

        // Try to match the player's team to find the correct game
        const gamesOnDate = data.dates?.[0]?.games ?? [];
        matchingGame = gamesOnDate.find(
          (g: any) =>
            g.teams.away.team.name === teamName ||
            g.teams.home.team.name === teamName
        ) || null;
      } catch (err) {
        console.error('Failed to fetch game for HR date', hrDate, err);
      }
    }

    let opponent = 'Unknown';
    if (matchingGame) {
      const isAway = matchingGame.teams.away.team.name === teamName;
      opponent = isAway
        ? `@ ${matchingGame.teams.home.team.name}`
        : `vs ${matchingGame.teams.away.team.name}`;
    }

    prevCountRef.current[String(playerId)] = mentaculous[String(playerId)]?.homeRuns?.length ?? 0;

    setMentaculous(prev => {
      // first grab whatever was there
      const existing = prev[playerId];

      // determine the base entry (either the old one, or a brand‐new one)
      const base = existing ?? {
        playerName: player.person.fullName,
        teamName: teamName || "Unknown",
        teamId,
        homeRuns: [],
        // only stamp here when there is no existing entry
        addedAt: Date.now(),
      };

      // prevent duplicates
      if (base.homeRuns.some((h: any) => h.hrId === hr.hrId)) {
        return prev;
      }

      // now return a new object, preserving base.addedAt
      return {
        ...prev,
        [playerId]: {
          ...base,
          teamId: base.teamId ?? teamId,
          homeRuns: [...base.homeRuns, { hrId: hr.hrId, opponent, careerHRNumber: hr.careerHRNumber }],
          addedAt: base.addedAt,        // <-- keep the original
        }
      };
    });

    setOrder(prev => {
      const strId = String(playerId);
      return prev.includes(strId)
        ? prev
        : [...prev, strId];
    });
    // Calculate the new page for the player
    const strId = String(playerId);
    const isNewPlayer = !order.includes(strId);
    setTimeout(() => {
      setActiveTab('mentaculous');

      if (isNewPlayer) {
        setNewPlayerId(playerId);
        setTimeout(() => setNewPlayerId(null), 2100);
      } else {
        setUpdatedPlayerId(playerId);
        setTimeout(() => setUpdatedPlayerId(null), 1600);
      }

      const idx = isNewPlayer ? order.length : order.indexOf(strId);
      const page = Math.floor(idx / 32);
      setMentaculousPage(page);

      // After page renders, scroll the player into view
      setTimeout(() => {
        lineRefs.current[strId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }, 0);
  };

  // Poll live game data every 30s while games are in progress
  useEffect(() => {
    const inProgressGames = games.filter(g => g.status.detailedState === 'In Progress');
    if (inProgressGames.length === 0) return;

    const fetchAll = () => {
      Promise.all(
        inProgressGames.map(game =>
          fetch(`https://statsapi.mlb.com/api/v1.1/game/${game.gamePk}/feed/live`)
            .then(res => res.json())
            .then(data => {
              const linescore = data.liveData?.linescore;
              const currentPlay = data.liveData?.plays?.currentPlay;
              setLiveInfo(prev => ({
                ...prev,
                [game.gamePk]: {
                  inning: linescore?.currentInning,
                  inningState: linescore?.inningState,
                  outs: linescore?.outs,
                  pitcher: currentPlay?.matchup?.pitcher?.fullName,
                  batter: currentPlay?.matchup?.batter?.fullName,
                  awayScore: linescore?.teams?.away?.runs,
                  homeScore: linescore?.teams?.home?.runs,
                }
              }));
            })
        )
      ).then(() => setLiveLastUpdated(Date.now()));
    };

    fetchAll();
    const id = setInterval(fetchAll, 30_000);
    return () => clearInterval(id);
  }, [games]);

  return (
    <div className={`app${darkMode ? ' dark' : ''}`}>
      {!currentUser ? (
        <UserSelection onUserSelect={setCurrentUser} />
      ) : (
        <>
          <div className="header-controls">
            {/* Main tabs for Games and Mentaculous */}
            <div className="main-tabs">
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
                Mentaculous ({currentUser})
              </button>
            </div>
            
            {/* Dropdown menu for other options */}
            <div className="menu-container">
              <button 
                className="menu-button"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                ☰ More
              </button>
              {menuOpen && (
                <div className="menu-dropdown">
                  <button
                    className={activeTab === 'standings' ? 'active' : ''}
                    onClick={() => {
                      setActiveTab('standings');
                      setMenuOpen(false);
                    }}
                  >
                    Standings
                  </button>
                  <button
                    className={activeTab === 'leaders' ? 'active' : ''}
                    onClick={() => {
                      setActiveTab('leaders');
                      setMenuOpen(false);
                    }}
                  >
                    Leaders
                  </button>
                  <button
                    className={activeTab === 'records' ? 'active' : ''}
                    onClick={() => {
                      setActiveTab('records');
                      setMenuOpen(false);
                    }}
                  >
                    Records
                  </button>
                  <button
                    className={activeTab === 'milestones' ? 'active' : ''}
                    onClick={() => {
                      setActiveTab('milestones');
                      setMenuOpen(false);
                    }}
                  >
                    Milestones
                  </button>
                  {selectedTeamRoster && (
                    <button
                      className={activeTab === 'roster' ? 'active' : ''}
                      onClick={() => {
                        setActiveTab('roster');
                        setMenuOpen(false);
                      }}
                    >
                      {selectedTeamRoster.name} Roster
                    </button>
                  )}
                  {manualOverride && (
                    <button
                      className={activeTab === 'backend' ? 'active' : ''}
                      onClick={() => {
                        setActiveTab('backend');
                        setMenuOpen(false);
                      }}
                    >
                      Mentaculous Backend
                    </button>
                  )}
                  <button
                    className={activeTab === 'stealaculous' ? 'active' : ''}
                    onClick={() => {
                      setActiveTab('stealaculous');
                      setMenuOpen(false);
                    }}
                  >
                    Stealaculous
                  </button>
                  <button
                    className={activeTab === 'historical' ? 'active' : ''}
                    onClick={() => {
                      setActiveTab('historical');
                      setMenuOpen(false);
                    }}
                  >
                    Historical Mentaculi
                  </button>
                  <button
                    className="menu-dark-toggle"
                    onClick={() => setDarkMode(d => !d)}
                  >
                    <span>{darkMode ? '☀ Light Mode' : '🌙 Dark Mode'}</span>
                    <span className="menu-dark-check">{darkMode ? 'On' : 'Off'}</span>
                  </button>
                  <button
                    className="user-switch-btn"
                    onClick={() => {
                      setMentaculous({});
                      setOrder([]);
                      setDataLoaded(false);
                      loadedForUserRef.current = null;
                      loadedDataHadEntriesRef.current = false;
                      setCurrentUser(null);
                      setMenuOpen(false);
                    }}
                  >
                    Switch User
                  </button>
                  <button
                    className="user-switch-btn"
                    style={{ color: '#c0392b' }}
                    onClick={() => {
                      if (!currentUser) return;
                      if (!window.confirm('Clear all local data for this user? (Firebase data is unaffected)')) return;
                      localStorage.removeItem(`mentaculous_${currentUser}`);
                      localStorage.removeItem(`mentaculousOrder_${currentUser}`);
                      localStorage.removeItem(`mentaculousUpdatedAt_${currentUser}`);
                      setMenuOpen(false);
                      window.location.reload();
                    }}
                  >
                    Clear Local Cache
                  </button>
                </div>
              )}
            </div>
          </div>

          {!['games', 'mentaculous'].includes(activeTab) && (() => {
            const tabLabels: Record<string, string> = {
              standings: 'Standings', leaders: 'Leaders', records: 'Records',
              milestones: 'Milestones', roster: 'Roster', stealaculous: 'Stealaculous',
              historical: 'Historical Mentaculi', backend: 'Mentaculous Backend',
            };
            return <div className="active-tab-crumb">{tabLabels[activeTab] ?? activeTab}</div>;
          })()}

          {activeTab === 'games' && (
            <div
              onTouchStart={e => {
                if (window.scrollY === 0) pullStartYRef.current = e.touches[0].clientY;
              }}
              onTouchMove={e => {
                if (pullStartYRef.current === null) return;
                const dy = e.touches[0].clientY - pullStartYRef.current;
                if (dy > 0) setPullDistance(Math.min(dy * 0.4, 72));
              }}
              onTouchEnd={() => {
                if (pullDistance >= 60) {
                  setRefreshKey(k => k + 1);
                }
                setPullDistance(0);
                pullStartYRef.current = null;
              }}
            >
              {(pullDistance > 0 || isRefreshing) && (
                <div className="pull-indicator" style={{ height: isRefreshing ? 44 : pullDistance * 0.6 }}>
                  <span className={`pull-spinner${isRefreshing ? ' spinning' : ''}`}>↻</span>
                  <span className="pull-label">{isRefreshing ? 'Refreshing…' : pullDistance >= 60 ? 'Release to refresh' : 'Pull to refresh'}</span>
                </div>
              )}
              {!selectedGame && (
                <>
                  <div className="date-selector">
                    <button onClick={() => changeDate(-1)}>←</button>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                    <button onClick={() => changeDate(1)}>→</button>
                    {date !== new Date().toLocaleDateString('en-CA') && (
                      <button className="today-btn" onClick={() => setDate(new Date().toLocaleDateString('en-CA'))}>Today</button>
                    )}
                  </div>

                  <div
                    className="games-list"
                    onTouchStart={e => { touchStartXRef.current = e.touches[0].clientX; }}
                    onTouchEnd={e => {
                      if (touchStartXRef.current === null) return;
                      const dx = e.changedTouches[0].clientX - touchStartXRef.current;
                      touchStartXRef.current = null;
                      if (Math.abs(dx) < 50) return;
                      changeDate(dx < 0 ? 1 : -1);
                    }}
                  >
                    {games.map((game) => {
                      const awayName = game.teams.away.team.name;
                      const homeName = game.teams.home.team.name;
                      const isFutureGame = game.status.detailedState === 'Scheduled' || game.status.detailedState === 'Pre-Game';
                      const isLive = game.status.detailedState === 'In Progress';
                      const pitchers = pitcherInfo[game.gamePk];
                      const gameDate = game.gameDate.slice(0, 10);
                      const knownHRIds = gameHRIds[game.gamePk];
                      const addedForGame = Object.values(mentaculous).reduce((sum: number, entry: any) => {
                        const teamInGame = entry.teamName === awayName || entry.teamName === homeName;
                        if (!teamInGame) return sum;
                        return sum + (entry.homeRuns ?? []).filter((hr: any) => {
                          if (knownHRIds) return knownHRIds.includes(hr.hrId);
                          const { date } = parseHrId(hr.hrId ?? '');
                          const otherTeam = entry.teamName === awayName ? homeName : awayName;
                          return date === gameDate && (hr.opponent === 'Manual' || hr.opponent?.includes(otherTeam));
                        }).length;
                      }, 0);
                      const totalForGame = gameHRTotals[game.gamePk];

                      return (
                        <div
                          key={game.gamePk}
                          className={`game-item${isLive ? ' game-item--live' : ''}`}
                          data-gamepk={game.gamePk}
                          onClick={() => {
                            lastViewedGamePkRef.current = game.gamePk;
                            setSelectedGame(game);
                            loadBoxScore(game.gamePk, game.gameDate);
                          }}
                        >
                          <div className="team-score-row">
                            <div className="team-row">
                              <img className="team-logo" src={getTeamLogoUrl(game.teams.away.team.id)} alt={awayName} />
                              <div className="team-details">
                                <div 
                                  className="team-name clickable-team-name"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchTeamRoster(game.teams.away.team.id);
                                  }}
                                >
                                  {awayName}
                                </div>
                                <div className="team-record">
                                  ({game.teams.away.leagueRecord.wins}–{game.teams.away.leagueRecord.losses})
                                </div>
                                {isFutureGame && (
                                  <div className="pitcher-info">
                                    {pitchers?.away ? (
                                      <div 
                                        className="pitcher-clickable"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPlayerId(pitchers.away.id);
                                        }}
                                      >
                                        <img 
                                          src={`https://img.mlbstatic.com/mlb-photos/image/upload/v1/people/${pitchers.away.id}/headshot/67/current.png`}
                                          alt={pitchers.away.fullName}
                                          className="pitcher-photo"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                        <div className="pitcher-details">
                                          <div className="pitcher-name">{pitchers.away.fullName}</div>
                                          {pitchers.away.stats && (
                                            <div className="pitcher-stats">
                                              ({pitchers.away.stats.wins}-{pitchers.away.stats.losses}, {pitchers.away.stats.era} ERA)
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="pitcher-details">
                                        <div className="pitcher-name">TBD</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="team-score">
                              {game.status.detailedState === 'Final' ? game.teams.away.score : (game.status.detailedState === 'In Progress' ? (liveInfo[game.gamePk]?.awayScore ?? '-') : '')}
                            </div>
                          </div>

                          <div className="team-score-row">
                            <div className="team-row">
                              <img className="team-logo" src={getTeamLogoUrl(game.teams.home.team.id)} alt={homeName} />
                              <div className="team-details">
                                <div 
                                  className="team-name clickable-team-name"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchTeamRoster(game.teams.home.team.id);
                                  }}
                                >
                                  {homeName}
                                </div>
                                <div className="team-record">
                                  ({game.teams.home.leagueRecord.wins}–{game.teams.home.leagueRecord.losses})
                                </div>
                                {isFutureGame && (
                                  <div className="pitcher-info">
                                    {pitchers?.home ? (
                                      <div 
                                        className="pitcher-clickable"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPlayerId(pitchers.home.id);
                                        }}
                                      >
                                        <img 
                                          src={`https://img.mlbstatic.com/mlb-photos/image/upload/v1/people/${pitchers.home.id}/headshot/67/current.png`}
                                          alt={pitchers.home.fullName}
                                          className="pitcher-photo"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                        <div className="pitcher-details">
                                          <div className="pitcher-name">{pitchers.home.fullName}</div>
                                          {pitchers.home.stats && (
                                            <div className="pitcher-stats">
                                              ({pitchers.home.stats.wins}-{pitchers.home.stats.losses}, {pitchers.home.stats.era} ERA)
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="pitcher-details">
                                        <div className="pitcher-name">TBD</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="team-score">
                              {game.status.detailedState === 'Final' ? game.teams.home.score : (game.status.detailedState === 'In Progress' ? (liveInfo[game.gamePk]?.homeScore ?? '-') : '')}
                            </div>
                          </div>

                          <div className="game-status">
                            {isLive && <span className="live-badge">● LIVE</span>}
                            {isLive && liveLastUpdated !== null && (
                              <span className="live-updated">updated {liveSecondsAgo}s ago</span>
                            )}
                            {isFutureGame ?
                              `${game.status.detailedState} - ${formatGameTime(game.gameDate)}` :
                              (!isLive ? game.status.detailedState : '')
                            }
                          </div>
                          {game.status.detailedState === 'In Progress' && (
                            <div className="game-live-info" style={{ marginTop: 8, fontSize: '0.95em', background: '#f3f6fa', borderRadius: 6, padding: 8 }}>
                              <div>
                                <strong>Inning:</strong> {liveInfo[game.gamePk]?.inningState ?? '-'} {liveInfo[game.gamePk]?.inning ?? '-'}
                              </div>
                              <div>
                                <strong>Outs:</strong> {liveInfo[game.gamePk]?.outs ?? '-'}
                              </div>
                              <div>
                                <strong>Pitcher:</strong> {liveInfo[game.gamePk]?.pitcher ?? '-'}
                              </div>
                              <div>
                                <strong>Batter:</strong> {liveInfo[game.gamePk]?.batter ?? '-'}
                              </div>
                            </div>
                          )}
                          {!isFutureGame && (totalForGame !== undefined || addedForGame > 0) && (
                            <div className={`hr-ticker${!isLive && totalForGame !== undefined && addedForGame >= totalForGame ? ' hr-ticker-complete' : ''}`}>
                              {totalForGame !== undefined
                                ? (isLive || addedForGame < totalForGame ? `${addedForGame}/${totalForGame}` : 'complete')
                                : `${addedForGame} HR${addedForGame !== 1 ? 's' : ''}`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {selectedGame && !boxScore && (
                <div className="loading">Loading box score...</div>
              )}

              {selectedGame && boxScore && (
                <div className="box-score">
                  <button
                    onClick={() => {
                      const pk = lastViewedGamePkRef.current;
                      setSelectedGame(null);
                      setBoxScore(null);
                      if (pk != null) {
                        requestAnimationFrame(() => {
                          const el = document.querySelector(`[data-gamepk="${pk}"]`);
                          el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        });
                      }
                    }}
                  >
                    ← Back to Games
                  </button>

                  <div className="view-toggle">
                    {(['away', 'home'] as const).map(side => {
                      const team = boxScore.teams?.[side]?.team;
                      const colors = MLB_TEAM_COLORS[team?.id] ?? { primary: '#041e42', text: '#fff' };
                      const isActive = selectedTeam === side;
                      return (
                        <button
                          key={side}
                          onClick={() => setSelectedTeam(side)}
                          style={isActive
                            ? { backgroundColor: colors.primary, color: colors.text, borderColor: colors.primary }
                            : { backgroundColor: 'transparent', color: colors.primary, borderColor: colors.primary }
                          }
                        >
                          {team?.name}
                        </button>
                      );
                    })}
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
            </div>
          )}
          {activeTab === 'backend' && manualOverride && (
            <div className="backend-tab">
              <h2>Mentaculous Backend</h2>
              {Object.entries(mentaculous).length === 0 ? (
                <p>No entries yet.</p>
              ) : (
                Object.entries(mentaculous)
                  .sort(([, a], [, b]) =>
                    a.playerName.localeCompare(b.playerName))
                  .map(([playerId, { playerName, homeRuns, teamName, teamId }]) => {
                    // Find missing HR numbers
                    const seasonTotal = homeRuns && homeRuns.length > 0 && homeRuns[0].seasonTotalHR
                      ? homeRuns[0].seasonTotalHR
                      : null;
                    let maxMentaculousHR = 0;
                    if (Array.isArray(homeRuns)) {
                      maxMentaculousHR = Math.max(0, ...homeRuns.map((hr: HomeRun) => {
                        if (hr.hrId) {
                          const parts = hr.hrId.split('_');
                          return Number(parts[2]) || 0;
                        }
                        return 0;
                      }));
                    }
                    const seasonHRTotal = Math.max(seasonTotal || 0, maxMentaculousHR);
                    const mentaculousHRNums = new Set(
                      (homeRuns || []).map((hr: HomeRun) => {
                        if (hr.hrId) {
                          const parts = hr.hrId.split('_');
                          return Number(parts[2]);
                        }
                        return null;
                      }).filter((x: number | null): x is number => x != null)
                    );
                    const missingHRs: number[] = [];
                    for (let n = 1; n <= seasonHRTotal; n++) {
                      if (!mentaculousHRNums.has(n)) missingHRs.push(n);
                    }
                    // Use manualHRAdd state for this player
                    const manualHRNum = manualHRAdd[playerId]?.num || '';
                    const manualHRDate = manualHRAdd[playerId]?.date || '';
                    return (
                      <div key={playerId} className="backend-player-block">
                        <h3>{playerName}</h3>
                        <ul>
                          {homeRuns.map((hr: HomeRun) => (
                            <li key={hr.hrId} className="backend-hr-line">
                              <code>{hr.hrId}</code>
                              <button
                                className="remove-button"
                                style={{ marginLeft: '8px' }}
                                onClick={() => handleRemoveHomeRun(playerId, hr.hrId)}
                              >
                                Delete
                              </button>
                            </li>
                          ))}
                        </ul>
                        <button
                          className="remove-button"
                          style={{ marginTop: '4px' }}
                          onClick={() => {
                            if (window.confirm(`Remove all ${playerName} entries?`)) {
                              setMentaculous(prev => {
                                const newMentaculous = { ...prev };
                                delete newMentaculous[playerId];
                                return newMentaculous;
                              });
                              setOrder(o => o.filter(id => id !== playerId));
                            }
                          }}
                        >
                          Delete All for {playerName}
                        </button>
                        {/* Show missing HRs and manual add UI */}
                        {missingHRs.length > 0 && (
                          <div className="missing-hrs-block">
                            <div style={{ marginTop: 8, fontWeight: 'bold', color: 'red' }}>
                              Missing HRs: {missingHRs.join(', ')}
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <label>
                                HR Number:
                                <input
                                  type="number"
                                  min="1"
                                  max={seasonHRTotal}
                                  value={manualHRNum}
                                  onChange={e => setManualHRAdd(prev => ({
                                    ...prev,
                                    [playerId]: { ...prev[playerId], num: e.target.value }
                                  }))}
                                  style={{ width: 50, marginLeft: 4 }}
                                />
                              </label>
                              <label style={{ marginLeft: 8 }}>
                                Date (YYYY-MM-DD):
                                <input
                                  type="date"
                                  value={manualHRDate}
                                  onChange={e => setManualHRAdd(prev => ({
                                    ...prev,
                                    [playerId]: { ...prev[playerId], date: e.target.value }
                                  }))}
                                  style={{ marginLeft: 4 }}
                                />
                              </label>
                              <button
                                style={{ marginLeft: 8 }}
                                disabled={
                                  !manualHRNum ||
                                  !manualHRDate ||
                                  !missingHRs.includes(Number(manualHRNum))
                                }
                                onClick={() => {
                                  const hrId = `${playerId}_${manualHRDate}_${manualHRNum}`;
                                  setMentaculous(prev => {
                                    const prevPlayer = prev[playerId] || { homeRuns: [], playerName, teamName, teamId };
                                    return {
                                      ...prev,
                                      [playerId]: {
                                        ...prevPlayer,
                                        homeRuns: [
                                          ...prevPlayer.homeRuns,
                                          { hrId, opponent: 'Manual', seasonTotalHR: seasonHRTotal },
                                        ],
                                        playerName,
                                        teamName,
                                        teamId,
                                      },
                                    };
                                  });
                                  if (!order.includes(playerId)) {
                                    setOrder(o => [...o, playerId]);
                                  }
                                  setManualHRAdd(prev => ({ ...prev, [playerId]: { num: '', date: '' } }));
                                }}
                              >
                                Add Missing HR
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {activeTab === 'standings' && renderStandings()}

          {activeTab === 'leaders' && renderLeaders()}

          {activeTab === 'records' && renderRecords()}

          {activeTab === 'milestones' && renderMilestones()}

          {activeTab === 'roster' && renderRoster()}

          {activeTab === 'mentaculous' && renderMentaculous()}

          {activeTab === 'stealaculous' && renderStealaculous()}

          {activeTab === 'historical' && renderHistorical()}

          {selectedPlayerId !== null && (
            <PlayerProfile
              playerId={selectedPlayerId}
              onClose={() => setSelectedPlayerId(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;