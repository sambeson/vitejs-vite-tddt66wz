import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import { backupToSupabase, supabase } from './supabase';

async function fetchOrderFromSupabase(userId: string) {
  console.log(`🔍 Fetching order for userId: "${userId}"`);
  const { data, error } = await supabase
    .from('mentaculous_backups')
    .select('mentorder')
    .eq('user_id', userId);

  if (error) {
    console.warn('Supabase mentorder fetch error:', error);
    return null;
  }

  console.log(`📊 Raw Supabase order data for "${userId}":`, data);

  let orderArr = [];
  if (data && data.length && data[0].mentorder) {
    if (typeof data[0].mentorder === 'string') {
      try {
        orderArr = JSON.parse(data[0].mentorder);
      } catch {
        orderArr = [];
      }
    } else if (Array.isArray(data[0].mentorder)) {
      orderArr = data[0].mentorder;
    }
  }
  console.log(`✅ Parsed order for "${userId}":`, orderArr);
  return orderArr;
}

async function fetchMentaculousFromSupabase(userId: string) {
  console.log(`🔍 Fetching mentaculous for userId: "${userId}"`);
  const { data, error } = await supabase
    .from('mentaculous_backups')
    .select('mentaculous')
    .eq('user_id', userId);

  if (error) {
    console.warn('Supabase mentaculous fetch error:', error);
    return null;
  }

  console.log(`📊 Raw Supabase mentaculous data for "${userId}":`, data);

  let mentaculousObj = {};
  if (data && data.length && data[0].mentaculous) {
    try {
      mentaculousObj = JSON.parse(data[0].mentaculous);
    } catch {
      mentaculousObj = {};
    }
  }
  console.log(`✅ Parsed mentaculous for "${userId}":`, mentaculousObj);
  return mentaculousObj;
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

  useEffect(() => {
    // Fetch player bio info
    fetch(`https://statsapi.mlb.com/api/v1/people/${playerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.people && data.people.length > 0) {
          const player = data.people[0];
          setProfile(player);

          // Determine if this is a pitcher
          const position = player.primaryPosition?.name || '';
          const pitcherCheck = position.toLowerCase().includes('pitcher') ||
            position.toLowerCase() === 'p';
          setIsPitcher(pitcherCheck);

          console.log(`Player ${player.fullName} is pitcher: ${pitcherCheck} (position: ${position})`);
        }
      })
      .catch((err) =>
        console.error('Error fetching player bio for', playerId, err)
      );

    // We'll fetch both hitting and pitching stats, then display based on isPitcher
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
          setCareerStats((prev: any) => ({
            ...prev,
            hitting: data.stats[0].splits[0].stat
          }));
        }
      })
      .catch((err) =>
        console.error('Error fetching career hitting stats for', playerId, err)
      );

    // Fetch career pitching stats
    fetch(
      `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=career&group=pitching`
    )
      .then((res) => res.json())
      .then((data) => {
        if (
          data.stats &&
          data.stats[0] &&
          data.stats[0].splits &&
          data.stats[0].splits.length > 0
        ) {
          setCareerStats((prev: any) => ({
            ...prev,
            pitching: data.stats[0].splits[0].stat
          }));
        }
      })
      .catch((err) =>
        console.error('Error fetching career pitching stats for', playerId, err)
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
          setSeasonStats(prev => ({
            ...prev,
            hitting: data.stats[0].splits
          }));
        }
      })
      .catch((err) =>
        console.error('Error fetching year-by-year hitting stats for', playerId, err)
      );

    // Fetch year-by-year pitching stats
    fetch(
      `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=yearByYear&group=pitching`
    )
      .then((res) => res.json())
      .then((data) => {
        if (
          data.stats &&
          data.stats[0] &&
          data.stats[0].splits &&
          data.stats[0].splits.length > 0
        ) {
          setSeasonStats(prev => ({
            ...prev,
            pitching: data.stats[0].splits
          }));
        }
      })
      .catch((err) =>
        console.error('Error fetching year-by-year pitching stats for', playerId, err)
      );
  }, [playerId]);

  return (
    <div className="modal">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          × Close
        </button>
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
                    <p>
                      <strong>Wins:</strong> {careerStats.pitching.wins}
                    </p>
                    <p>
                      <strong>Losses:</strong> {careerStats.pitching.losses}
                    </p>
                    <p>
                      <strong>ERA:</strong> {careerStats.pitching.era}
                    </p>
                    <p>
                      <strong>Quality Starts:</strong> {careerStats.pitching.qualityStarts || 0}
                    </p>
                    <p>
                      <strong>Innings Pitched:</strong> {careerStats.pitching.inningsPitched}
                    </p>
                    <p>
                      <strong>Strikeouts:</strong> {careerStats.pitching.strikeOuts}
                    </p>
                    <p>
                      <strong>Saves:</strong> {careerStats.pitching.saves}
                    </p>
                    <p>
                      <strong>WHIP:</strong> {careerStats.pitching.whip}
                    </p>
                  </>
                ) : careerStats.hitting ? (
                  <>
                    <h3>Career Hitting Stats</h3>
                    <p>
                      <strong>Games Played:</strong> {careerStats.hitting.gamesPlayed}
                    </p>
                    <p>
                      <strong>At Bats:</strong> {careerStats.hitting.atBats}
                    </p>
                    <p>
                      <strong>Hits:</strong> {careerStats.hitting.hits}
                    </p>
                    <p>
                      <strong>Home Runs:</strong> {careerStats.hitting.homeRuns}
                    </p>
                    <p>
                      <strong>Average:</strong> {careerStats.hitting.avg}
                    </p>
                    <p>
                      <strong>OPS:</strong> {careerStats.hitting.ops}
                    </p>
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
                  </>
                ) : seasonStats.hitting && Array.isArray(seasonStats.hitting) && seasonStats.hitting.length > 0 ? (
                  <>
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
                              <td>{s.stat?.homeRuns ?? '-'} </td>
                              <td>{s.stat?.rbi ?? '-'}</td>
                              <td>{s.stat?.stolenBases ?? '-'}</td>
                              <td>{s.stat?.avg ?? '-'}</td>
                              <td>{s.stat?.obp ?? '-'}</td>
                              <td>{s.stat?.ops ?? '-'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </>
                ) : null}
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

type HomeRun = {
  hrId: string;
  opponent?: string;
  seasonTotalHR?: number;
};

type MentaculousPlayer = {
  playerName: string;
  teamName: string;
  teamId: string;
  homeRuns: HomeRun[];
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
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [games, setGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [boxScore, setBoxScore] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState('away');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('games');
  const [mentaculous, setMentaculous] = React.useState<Record<string, MentaculousPlayer>>({});
  const [mentaculousPage, setMentaculousPage] = useState(0)
  const [updatedPlayerId, setUpdatedPlayerId] = useState<number | null>(null);
  const [tooltipOpenId, setTooltipOpenId] = useState<number | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const lineRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const linesContainerRef = useRef<HTMLDivElement>(null);
  const [manualOverride, setManualOverride] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); // New state to track data loading
  const [liveInfo, setLiveInfo] = useState<Record<string, any>>({}); // Add this state

  // Manual HR add state for backend tab, keyed by playerId
  const [manualHRAdd, setManualHRAdd] = useState<Record<string, { num: string; date: string }>>({});

  useEffect(() => {
    if (!currentUser) return; // Don't load data until user is selected

    setDataLoaded(false); // Reset to false before loading
    async function loadInitialData() {
      // MIGRATION: If mentaculous is missing, but old keys exist, migrate them
      let mentaculousRaw = localStorage.getItem(`mentaculous_${currentUser}`);
      if (!mentaculousRaw || mentaculousRaw === '{}' || mentaculousRaw === 'null') {
        const newMentaculous: Record<string, any> = {};
        let fallbackAddedAt = Date.now();
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          // Example pattern: 12345_416_12
          const match = key.match(/^(\d+)_(\d+)_([\d]+)$/);
          if (match) {
            const [, playerId] = match;
            const hrId = key;
            let value;
            try {
              value = JSON.parse(localStorage.getItem(key) || '{}');
            } catch {
              value = localStorage.getItem(key);
            }
            if (!newMentaculous[playerId]) {
              newMentaculous[playerId] = {
                playerName: value?.playerName || "Unknown",
                teamName: value?.teamName || "Unknown",
                teamId: value?.teamId || null,
                homeRuns: [],
                // Use fallbackAddedAt and increment for each new player
                addedAt: fallbackAddedAt++,
              };
            }
            newMentaculous[playerId].homeRuns.push({
              hrId,
              opponent: value?.opponent || "Unknown",
            });
          }
        }
        if (Object.keys(newMentaculous).length > 0) {
          localStorage.setItem(`mentaculous_${currentUser}`, JSON.stringify(newMentaculous));
        }
      }

      // --- SUPABASE MENTACULOUS LOAD STARTS HERE ---
      // Try to load mentaculous from Supabase
      let parsed = {};
      if (currentUser) {
        console.log(`🔍 Loading data for user: "${currentUser}"`);
        const supabaseMentaculous = await fetchMentaculousFromSupabase(currentUser);
        console.log(`📊 Supabase data for "${currentUser}":`, supabaseMentaculous);
        if (supabaseMentaculous && Object.keys(supabaseMentaculous).length) {
          parsed = supabaseMentaculous;
          localStorage.setItem(`mentaculous_${currentUser}`, JSON.stringify(parsed));
          console.log(`💾 Saved Supabase data to localStorage for "${currentUser}"`);
        } else {
          mentaculousRaw = localStorage.getItem(`mentaculous_${currentUser}`);
          console.log(`💿 Loading from localStorage for "${currentUser}":`, mentaculousRaw);
          if (mentaculousRaw) {
            try {
              parsed = JSON.parse(mentaculousRaw);
            } catch {
              parsed = {};
            }
          }
        }
      }
      console.log(`✅ Final parsed data for "${currentUser}":`, parsed);
      setMentaculous(parsed);

      // --- SUPABASE ORDER LOAD (as before) ---
      // Try to load order from Supabase
      let orderArr: string[] = [];
      if (currentUser) {
        const supabaseOrder = await fetchOrderFromSupabase(currentUser);
        if (supabaseOrder && supabaseOrder.length) {
          orderArr = supabaseOrder;
          localStorage.setItem(`mentaculousOrder_${currentUser}`, JSON.stringify(orderArr));
        } else {
          const storedOrder = localStorage.getItem(`mentaculousOrder_${currentUser}`);
          if (storedOrder) {
            orderArr = JSON.parse(storedOrder);
            if (!orderArr.length) {
              orderArr = Object.entries(parsed)
                .sort(([, a], [, b]) => ((a as any).addedAt ?? 0) - ((b as any).addedAt ?? 0))
                .map(([id]) => id);
            }
          } else {
            orderArr = Object.entries(parsed)
              .sort(([, a], [, b]) => ((a as any).addedAt ?? 0) - ((b as any).addedAt ?? 0))
              .map(([id]) => id);
          }
        }
      }
      setOrder(orderArr);
      setDataLoaded(true); // Set to true after data is loaded
    }

    loadInitialData();
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

  // Autosave to Supabase and localStorage after mentaculous/order changes, but only after dataLoaded
  useEffect(() => {
    if (!dataLoaded || !currentUser) return;
    // Debug: log autosave trigger
    console.log('[Autosave] Triggered', { mentaculous, order, currentUser });
    localStorage.setItem(`mentaculous_${currentUser}`, JSON.stringify(mentaculous));
    localStorage.setItem(`mentaculousOrder_${currentUser}`, JSON.stringify(order));
    backupToSupabase(currentUser, mentaculous, order); // Pass the current data
  }, [mentaculous, order, dataLoaded, currentUser]);

  useEffect(() => {
    fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`)
      .then((res) => res.json())
      .then((data) => setGames(data.dates[0]?.games || []))
      .catch((error) => console.error('Error fetching schedule:', error));
  }, [date]);


  const loadBoxScore = async (gamePk: number) => {
    try {
      const res = await fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`);
      const boxScore = await res.json();

      const awayPlayers = boxScore?.teams?.away?.players ?? {};
      const homePlayers = boxScore?.teams?.home?.players ?? {};
      const allPlayers = [...Object.values(awayPlayers), ...Object.values(homePlayers)];

      const today = new Date().toISOString().split('T')[0];

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
                console.log(`📊 Season stats for ${player.person.fullName}: ${seasonStat.saves} saves, ${seasonStat.era} ERA`);
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

        console.log('🏀 Play-by-play data fetched successfully for game:', gamePk);

        // Track when each pitcher first appeared
        const pitcherFirstAppearance = new Map();
        let playIndex = 0;

        for (const inning of playByPlayData.allPlays || []) {
          const pitcher = inning.matchup?.pitcher;
          if (pitcher && !pitcherFirstAppearance.has(pitcher.id)) {
            pitcherFirstAppearance.set(pitcher.id, playIndex);
            console.log(`⚾ Pitcher ${pitcher.fullName} first appeared at play index ${playIndex}`);
          }
          playIndex++;
        }

        console.log('🎯 Final pitcher order map:', Array.from(pitcherFirstAppearance.entries()));

        // Apply pitching order to players
        ['home', 'away'].forEach((teamKey) => {
          const team = boxScore.teams[teamKey];
          for (let key in team.players) {
            const player = team.players[key];
            if (player.stats?.pitching && pitcherFirstAppearance.has(player.person.id)) {
              player.pitchingOrder = pitcherFirstAppearance.get(player.person.id);
              console.log(`✅ Set pitchingOrder ${player.pitchingOrder} for ${player.person.fullName}`);
            }
          }
        });
      } catch (error) {
        console.warn('❌ Could not fetch play-by-play data for pitching order:', error);
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
      .map(([_, p]: [string, any]) => {
        const name = getLastName(p.person);
        const gameSB = p.stats.batting.stolenBases;
        // If you’ve fetched season-by-season, p.seasonStats.batting?.stolenBases should exist
        const seasonSB = p.seasonStats?.batting?.stolenBases ?? 'N/A';
        return `${name} ${gameSB} (${seasonSB})`;
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
              SB— {steals.join('; ')}
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
          console.log(`🔄 Sorting: ${a.person.fullName} (order: ${a.pitchingOrder}) vs ${b.person.fullName} (order: ${b.pitchingOrder})`);
          return a.pitchingOrder - b.pitchingOrder;
        }

        // If either player doesn't have pitchingOrder, maintain original order
        console.log(`⚠️ No pitching order for ${a.person.fullName} or ${b.person.fullName} - maintaining original order`);
        return 0;
      });

    console.log('📋 Final pitcher order:', pitchers.map(p => `${p.person.fullName} (${p.pitchingOrder ?? 'no order'})`));

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
              <th>H</th>
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
                    <td>{stats.atBats}</td>
                    <td>{stats.runs}</td>
                    <td>{stats.hits}</td>
                    <td>{stats.rbi}</td>
                    <td>{stats.baseOnBalls}</td>
                    <td>{stats.strikeOuts}</td>
                    <td>{stats.seasonAvg}</td>
                    <td>{stats.seasonOps}</td>
                  </tr>
                  {battingLine && (
                    <tr className="batting-line">
                      <td colSpan={9}>{battingLine}</td>
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
    // Use the order array to sort mentaculous entries
    const entries = order
      .map(id => [id, mentaculous[id]] as [string, MentaculousPlayer])
      .filter(([, entry]) => entry);

    const start = mentaculousPage * 32;
    const currentEntries = entries.slice(start, start + 32);

    return (
      <div className="mentaculous-container">
        {renderPagination()}

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
                    className={`notebook-line filled ${updatedPlayerId === parseInt(playerId) ? 'update-animate' : ''
                      }`}
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
                      <span className="notebook-abbr">{teamAbbr}</span>
                    </div>

                    <div className="player-info">
                      <div className="player-name">
                        {playerName} –{' '}
                        <span
                          className="hr-count-wrapper"
                          onClick={() =>
                            setTooltipOpenId((prev) =>
                              prev === parseInt(playerId) ? null : parseInt(playerId)
                            )
                          }
                        >
                          {homeRuns.length}
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
                        <button
                          className="view-button"
                          onClick={() => setSelectedPlayerId(parseInt(playerId))}
                        >
                          View
                        </button>
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

  const handleRemoveHomeRun = (playerId: string, hrId: string) => {
    setMentaculous(prev => {
      const prevPlayer = prev[playerId];
      if (!prevPlayer) return prev;
      const newHomeRuns = prevPlayer.homeRuns.filter(hr => hr.hrId !== hrId);
      // If no HRs left, remove player from mentaculous and order
      if (newHomeRuns.length === 0) {
        const newMentaculous = { ...prev };
        delete newMentaculous[playerId];
        setOrder(o => o.filter(id => id !== playerId));
        return newMentaculous;
      }
      return {
        ...prev,
        [playerId]: {
          ...prevPlayer,
          homeRuns: newHomeRuns,
        },
      };
    });
  };

  // Add a home run to mentaculous for a player (restored async version with opponent lookup and navigation)
  const handleAddToMentaculous = async (player: any, hr: any, teamName: string, teamId?: string) => {
    const playerId = Number(player.person.id);
    if (!hr?.hrId) return;

    const hrDate = hr.hrId.split('_')[1];

    // Try to find in existing games first
    let matchingGame = games.find((g) => g.gameDate.startsWith(hrDate));

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
          homeRuns: [...base.homeRuns, { hrId: hr.hrId, opponent }],
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
    setTimeout(() => {
      setActiveTab('mentaculous');
      setUpdatedPlayerId(playerId);

      // Find the index of the player in the order
      const strId = String(playerId);
      const idx = order.includes(strId)
        ? order.indexOf(strId)
        : order.length; // If just added, will be at the end

      const page = Math.floor(idx / 32);
      setMentaculousPage(page);

      setTimeout(() => setUpdatedPlayerId(null), 1000);
    }, 0);
  };

  // Add this effect after games are loaded
  useEffect(() => {
    // Only fetch for in-progress games
    const inProgressGames = games.filter(g => g.status.detailedState === 'In Progress');
    if (inProgressGames.length === 0) return;
    inProgressGames.forEach(game => {
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
        });
    });
  }, [games]);

  return (
    <div className="app">
      {!currentUser ? (
        <UserSelection onUserSelect={setCurrentUser} />
      ) : (
        <>
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
              Mentaculous ({currentUser})
            </button>
            {manualOverride && (
              <button
                className={activeTab === 'backend' ? 'active' : ''}
                onClick={() => setActiveTab('backend')}
              >
                Mentaculous Backend
              </button>
            )}
            <button
              className="user-switch-btn"
              onClick={() => setCurrentUser(null)}
            >
              Switch User
            </button>
          </div>

          {activeTab === 'games' && (
            <>
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
                  </div>

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

                          <div className="team-score-row">
                            <div className="team-row">
                              <img className="team-logo" src={getTeamLogoUrl(game.teams.away.team.id)} alt={awayName} />
                              <div className="team-details">
                                <div className="team-name">{awayName}</div>
                                <div className="team-record">
                                  ({game.teams.away.leagueRecord.wins}–{game.teams.away.leagueRecord.losses})
                                </div>
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
                                <div className="team-name">{homeName}</div>
                                <div className="team-record">
                                  ({game.teams.home.leagueRecord.wins}–{game.teams.home.leagueRecord.losses})
                                </div>
                              </div>
                            </div>
                            <div className="team-score">
                              {game.status.detailedState === 'Final' ? game.teams.home.score : (game.status.detailedState === 'In Progress' ? (liveInfo[game.gamePk]?.homeScore ?? '-') : '')}
                            </div>
                          </div>

                          <div className="game-status">{game.status.detailedState}</div>
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

          {activeTab === 'mentaculous' && renderMentaculous()}

          {selectedPlayerId && (
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

// Debug function to check localStorage contents
function debugLocalStorage() {
  console.log('🔍 localStorage debug:');
  console.log('Sam\'s mentaculous:', localStorage.getItem('mentaculous_Sam beson'));
  console.log('Sam\'s order:', localStorage.getItem('mentaculousOrder_Sam beson'));
  console.log('Jalk\'s mentaculous:', localStorage.getItem('mentaculous_Jalk McUser'));
  console.log('Jalk\'s order:', localStorage.getItem('mentaculousOrder_Jalk McUser'));
  
  // Show all localStorage keys
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    allKeys.push(localStorage.key(i));
  }
  console.log('All localStorage keys:', allKeys);
}

// Manual function to clear Jalk's data
function clearJalkData() {
  console.log('🗑️ Manually clearing Jalk\'s localStorage...');
  localStorage.removeItem('mentaculous_Jalk McUser');
  localStorage.removeItem('mentaculousOrder_Jalk McUser');
  console.log('✅ Jalk\'s localStorage manually cleared!');
}

// Generic function to clear any user's localStorage
function clearUserDataFromLocalStorage(userId: string) {
  console.log(`🗑️ Clearing localStorage for user "${userId}"...`);
  localStorage.removeItem(`mentaculous_${userId}`);
  localStorage.removeItem(`mentaculousOrder_${userId}`);
  console.log(`✅ Successfully cleared localStorage for user "${userId}"`);
}

// Function to restore a user's data from Supabase
async function restoreUserDataFromSupabase(userId: string) {
  console.log(`🔄 Restoring data for user "${userId}" from Supabase...`);
  
  try {
    // Fetch mentaculous data
    const mentaculousData = await fetchMentaculousFromSupabase(userId);
    if (mentaculousData && Object.keys(mentaculousData).length > 0) {
      localStorage.setItem(`mentaculous_${userId}`, JSON.stringify(mentaculousData));
      console.log(`✅ Restored mentaculous data for "${userId}"`);
    } else {
      console.log(`⚠️ No mentaculous data found in Supabase for "${userId}"`);
    }
    
    // Fetch order data
    const orderData = await fetchOrderFromSupabase(userId);
    if (orderData && orderData.length > 0) {
      localStorage.setItem(`mentaculousOrder_${userId}`, JSON.stringify(orderData));
      console.log(`✅ Restored order data for "${userId}"`);
    } else {
      console.log(`⚠️ No order data found in Supabase for "${userId}"`);
    }
    
    console.log(`🎉 Data restoration complete for "${userId}"! Refresh the page to see the restored data.`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to restore data for "${userId}":`, error);
    return false;
  }
}

// Function to check what's actually in Supabase for all users
async function checkSupabaseData() {
  console.log('🔍 Checking all data in Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('mentaculous_backups')
      .select('*');
      
    if (error) {
      console.error('❌ Error fetching Supabase data:', error);
      return;
    }
    
    console.log('📊 All Supabase records:', data);
    
    if (data && data.length > 0) {
      data.forEach(record => {
        console.log(`📝 User: "${record.user_id}"`);
        console.log(`   Mentaculous: ${record.mentaculous ? 'Has data' : 'Empty'}`);
        console.log(`   Order: ${record.mentorder ? 'Has data' : 'Empty'}`);
        if (record.mentaculous) {
          try {
            const parsed = JSON.parse(record.mentaculous);
            const playerCount = Object.keys(parsed).length;
            console.log(`   Player count: ${playerCount}`);
          } catch (e) {
            console.log(`   Mentaculous data: "${record.mentaculous}"`);
          }
        }
      });
    } else {
      console.log('⚠️ No records found in Supabase!');
    }
  } catch (error) {
    console.error('❌ Failed to check Supabase data:', error);
  }
}

// Make them available globally
(window as any).debugLocalStorage = debugLocalStorage;
(window as any).clearJalkData = clearJalkData;
(window as any).clearUserDataFromLocalStorage = clearUserDataFromLocalStorage;
(window as any).restoreUserDataFromSupabase = restoreUserDataFromSupabase;
(window as any).checkSupabaseData = checkSupabaseData;

export default App;