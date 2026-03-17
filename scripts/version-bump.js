import fs from 'fs';
import { execSync } from 'child_process';

const bumpType = process.argv[2] || 'patch';

const packageJson = JSON.parse(fs.readFileSync('./client/package.json', 'utf8'));
let [major, minor, patch] = packageJson.version.split('.').map(Number);

if (bumpType === 'major') {
  major++; minor = 0; patch = 0;
} else if (bumpType === 'minor') {
  minor++; patch = 0;
} else {
  patch++;
}

const newVersion = `${major}.${minor}.${patch}`;

packageJson.version = newVersion;
fs.writeFileSync('./client/package.json', JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version mise à jour: ${newVersion}`);

execSync(`git add client/package.json`);
execSync(`git commit -m "chore(release): v${newVersion}"`);
execSync(`git tag v${newVersion}`);
execSync(`git push && git push --tags`);

console.log(`Tag v${newVersion} créé et pushé`);
