import { execSync } from 'child_process';

console.log('[seed] Step 1/3: Ingesting tenders...');
execSync('tsx scripts/ingest.ts', { stdio: 'inherit' });

console.log('[seed] Step 2/3: Running scoring pass...');
execSync('tsx scripts/score.ts', { stdio: 'inherit' });

console.log('[seed] Step 3/3: Stats:');
execSync('tsx scripts/stats.ts', { stdio: 'inherit' });

console.log('[seed] Done.');
