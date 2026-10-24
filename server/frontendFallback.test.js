import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { registerFrontendFallback } from './frontendFallback.js';

test('serves SPA routes, preserves static assets, and returns JSON for unknown API paths', async () => {
  const frontendDistPath = await mkdtemp(path.join(os.tmpdir(), 'hcm-lite-spa-'));
  const indexHtml = '<!doctype html><html><body><div id="root"></div></body></html>';
  await writeFile(path.join(frontendDistPath, 'index.html'), indexHtml);
  await writeFile(path.join(frontendDistPath, 'app.js'), 'console.log("asset");');

  const app = express();
  registerFrontendFallback(app, frontendDistPath);
  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    const origin = `http://127.0.0.1:${address.port}`;

    for (const route of ['/', '/login', '/auth/employee', '/employee-approvals']) {
      const response = await fetch(new URL(route, origin), { headers: { Accept: 'text/html' } });
      assert.equal(response.status, 200, `${route} should serve the SPA entry point`);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.equal(await response.text(), indexHtml);
    }

    const assetResponse = await fetch(new URL('/app.js', origin));
    assert.equal(assetResponse.status, 200);
    assert.equal(await assetResponse.text(), 'console.log("asset");');

    const apiResponse = await fetch(new URL('/api/not-a-real-endpoint', origin), {
      headers: { Accept: 'text/html' },
    });
    assert.equal(apiResponse.status, 404);
    assert.match(apiResponse.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await apiResponse.json(), { message: 'API endpoint not found.' });

    const missingAssetResponse = await fetch(new URL('/missing.js', origin));
    assert.equal(missingAssetResponse.status, 404);
    assert.doesNotMatch(await missingAssetResponse.text(), /<html/i);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await rm(frontendDistPath, { recursive: true, force: true });
  }
});
