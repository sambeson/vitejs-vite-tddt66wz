export const testStatEndpoints = async (playerId: number = 592450): Promise<void> => {
  // rest of function
  const statsTypes = [
    "career",
    "season",
    "yearByYear",
    "yearByYearAdvanced",
    "gameLog",
    "statsSingleSeason",
    "byDateRange"
  ];
  const groups = ["hitting", "pitching", "fielding"];

  for (let statsType of statsTypes) {
    for (let group of groups) {
      const url = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=${statsType}&group=${group}`;
      try {
        const res = await fetch(url);
        const json = await res.json();
        const split = json?.stats?.[0]?.splits?.[0];
        const keys = split?.stat ? Object.keys(split.stat) : [];
        console.log(`✅ ${statsType} | ${group}`);
        console.log(`   Endpoint: ${url}`);
        console.log(`   Keys:`, keys);
        console.log('---');
      } catch (err) {
        console.error(`❌ Error with ${statsType}/${group}:`, err);
      }
    }
  }
};
