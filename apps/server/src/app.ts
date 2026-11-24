import { readFileSync } from 'node:fs';
import express from 'express';
import type { Config } from './config';
import type { DB } from './db';
import { adminRouter } from './admin';
import { DELETE_PAGE } from './deletePage';
import { googleVerifier, type GoogleVerifier } from './google';
import { apiRouter, clickRedirect } from './api';
import type { Sender } from './senders';

export function createApp(
  db: DB,
  cfg: Config,
  sender: Sender,
  verifyGoogle: GoogleVerifier = googleVerifier(cfg.googleClientIds),
) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback'); // behind nginx on the same machine

  app.use((req, res, next) => {
    res.set('x-content-type-options', 'nosniff');
    res.set('referrer-policy', 'no-referrer');
    // CORS for the app (Capacitor serves it from https://localhost or capacitor://localhost).
    const origin = req.get('origin');
    if (origin && req.path.startsWith('/api/') && cfg.corsOrigins.includes(origin)) {
      res.set('access-control-allow-origin', origin);
      res.set('vary', 'Origin');
      res.set('access-control-allow-headers', 'authorization, content-type');
      res.set('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
    }
    next();
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.get('/delete-account', (_req, res) => res.type('html').send(DELETE_PAGE));
  // Privacy policy (the same page as docs/store/privacy-policy.html).
  app.get('/privacy', (_req, res) => {
    try {
      res.type('html').send(readFileSync(new URL('../../../docs/store/privacy-policy.html', import.meta.url), 'utf8'));
    } catch {
      res.status(404).send('Privacy policy not found');
    }
  });
  app.use('/api', apiRouter(db, cfg, sender, verifyGoogle));
  app.get('/r/:id', clickRedirect(db));
  app.use(
    '/uploads',
    (_req, res, next) => {
      // Ad images are loaded into the game canvas, which needs CORS.
      res.set('access-control-allow-origin', '*');
      res.set('cache-control', 'public, max-age=86400');
      next();
    },
    express.static(cfg.uploadDir, { index: false, dotfiles: 'deny' }),
  );
  app.use('/admin', adminRouter(db, cfg));
  app.get('/', (_req, res) => res.redirect('/admin'));
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}
