import type { LimiteurTentatives } from './auth.js';
import type { Db } from './db/index.js';
import type { Env } from './env.js';
import type { ClientIA } from './ia/client.js';

export interface Deps {
  db: Db;
  env: Env;
  ia: ClientIA;
  limiteur: LimiteurTentatives;
}
