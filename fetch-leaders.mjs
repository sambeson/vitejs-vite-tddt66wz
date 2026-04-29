// Run: node fetch-leaders.mjs
// Fetches MLB league leaders for each stat/year and writes src/leagueLeaders.json

import { writeFileSync } from 'fs';

const HITTING_CATS = [
  'homeRuns',
  'rbi',
  'hits',
  'runs',
  'baseOnBalls',
  'stolenBases',
  'battingAverage',
  'onBasePercentage',
  'onBasePlusSlugging',
  'doubles',
  'triples',
  'strikeouts',
];

const PITCHING_CATS = [
  'wins',
  'earnedRunAverage',
  'strikeouts',
  'saves',
  'whip',
];

const START_YEAR = 1900;
const END_YEAR = 2025;

async function fetchLeaders(season, cats, group) {
  const url = `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=${cats.join(',')}&season=${season}&limit=1&statGroup=${group}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${season} ${group}`);
  const data = await res.json();
  const result = {};
  for (const entry of (data.leagueLeaders ?? [])) {
    const cat = entry.leaderCategory;
    const top = entry.leaders?.[0];
    if (top) {
      result[cat] = {
        playerId: top.person?.id,
        playerName: top.person?.fullName,
        value: top.value,
      };
    }
  }
  return result;
}

async function main() {
  const output = { hitting: {}, pitching: {} };
  const years = [];
  for (let y = START_YEAR; y <= END_YEAR; y++) years.push(y);

  // Fetch in batches of 5 to avoid hammering the API
  const BATCH = 5;
  for (let i = 0; i < years.length; i += BATCH) {
    const batch = years.slice(i, i + BATCH);
    await Promise.all(batch.map(async (year) => {
      try {
        const [hitting, pitching] = await Promise.all([
          fetchLeaders(year, HITTING_CATS, 'hitting'),
          fetchLeaders(year, PITCHING_CATS, 'pitching'),
        ]);
        output.hitting[year] = hitting;
        output.pitching[year] = pitching;
        console.log(`✓ ${year}`);
      } catch (e) {
        console.error(`✗ ${year}: ${e.message}`);
        output.hitting[year] = {};
        output.pitching[year] = {};
      }
    }));
  }

  writeFileSync('src/leagueLeaders.json', JSON.stringify(output, null, 2));
  console.log('\nWrote src/leagueLeaders.json');
}

main();
