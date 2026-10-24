const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');

// Exercise the hosting boundary without connecting to a database or paid provider.
const backendPath = require.resolve('../apps/backend/dist/app.js');
require.cache[backendPath] = {
  id: backendPath, filename: backendPath, loaded: true,
  exports: { createApp: () => (req, res) => {
    assert.equal(req.headers['x-sara-api-key'], process.env.API_AUTH_KEY);
    assert.equal(process.env.AUTH_MODE, 'api-key');
    assert.equal(process.env.DATABASE_SSL_MODE, 'verify-full');
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({ path: req.url }));
  } },
};
process.env.VERCEL_PROJECT_PRODUCTION_URL = 'sara-core.example.com';
const handler = require('../api/index.js');

test('cloud entry preserves paths/query and keeps its integration key server-side', async () => {
  const server = http.createServer(handler).listen(0,'127.0.0.1');
  await new Promise(r => server.once('listening',r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/api?__sara_path=ecology/species&page=2`, {
      headers: { Origin:'https://sara-core.example.com', 'x-sara-api-key':'untrusted-browser-value' },
    });
    assert.equal(response.status,200);
    assert.equal(response.headers.get('cache-control'),'no-store');
    const text = await response.text();
    assert.deepEqual(JSON.parse(text),{path:'/api/v1/ecology/species?page=2'});
    assert.ok(!text.includes(process.env.API_AUTH_KEY));
    assert.equal((await fetch(`${base}/api?__sara_path=health`,{headers:{Origin:'https://unrelated.example'}})).status,403);
    assert.equal((await fetch(`${base}/api?__sara_path=health`,{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
    assert.equal((await fetch(`${base}/api?__sara_path=health`,{method:'DELETE'})).status,405);
  } finally {
    server.closeAllConnections();
    await new Promise(r => server.close(r));
  }
});
