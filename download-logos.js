import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logosDir = path.join(__dirname, 'public', 'logos');
if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

const teams = [
  'ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CHW', 'CIN', 'CLE', 'COL',
  'DET', 'HOU', 'KAN', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN',
  'NYM', 'NYY', 'OAK', 'PHI', 'PIT', 'SD', 'SEA', 'SF',
  'STL', 'TB', 'TEX', 'TOR', 'WAS'
];

const getLogoUrl = (abbr) =>
  `https://raw.githubusercontent.com/gilbsgilbs/react-mlb-logos/main/src/logos/${abbr}.svg`;

const downloadSvg = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(`Failed: ${res.statusCode}`);
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
};

(async () => {
  for (const abbr of teams) {
    const url = getLogoUrl(abbr);
    const filepath = path.join(logosDir, `${abbr}.svg`);
    try {
      console.log(`Downloading ${abbr}...`);
      await downloadSvg(url, filepath);
    } catch (err) {
      console.error(`Failed to download ${abbr}:`, err);
    }
  }
})();
