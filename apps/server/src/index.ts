import { createApp } from './app';
import { loadConfig } from './config';
import { openDb } from './db';
import { makeSender } from './senders';

const cfg = loadConfig();
const db = openDb(cfg.dbPath);
createApp(db, cfg, makeSender(cfg)).listen(cfg.port, () => {
  console.log(`Nutwise server on :${cfg.port} (${cfg.production ? 'production' : 'development'})`);
  if (!cfg.production) console.log(`Admin panel: http://localhost:${cfg.port}/admin`);
});
