import { lireEnv } from './env.js';
import { ouvrirBase } from './db/index.js';

const env = lireEnv();
ouvrirBase(env.DATABASE_PATH);
console.log(`Migrations appliquées sur ${env.DATABASE_PATH}`);
