import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';

export function registerFrontendFallback(app, frontendDistPath) {
  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'API endpoint not found.' });
  });

  app.use(express.static(frontendDistPath, { index: false }));
  app.get('*', (req, res, next) => {
    if (!/\btext\/html\b/i.test(req.get('accept') || '')) return next();
    const indexPath = path.join(frontendDistPath, 'index.html');
    if (!existsSync(indexPath)) {
      return res.status(503).type('text').send('HCM Lite frontend has not been built. Run npm run build before starting the production server.');
    }
    res.sendFile(indexPath, (error) => {
      if (error) next(error);
    });
  });
  app.use((_req, res) => {
    res.status(404).type('text').send('Not found.');
  });
}
