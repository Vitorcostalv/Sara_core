const { randomBytes } = require('node:crypto');

let app;

// One origin for the page and API. Database and provider keys stay on the server.
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'http://localhost');
  const route = req.query?.__sara_path ?? url.searchParams.get('__sara_path');
  if (typeof route === 'string') {
    url.searchParams.delete('__sara_path');
    req.url = `/api/v1/${route.replace(/^\/+/, '')}${url.search}`;
    if (req.query) delete req.query.__sara_path;
  }
  const origins = new Set(
    [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
      .filter(Boolean).map(host => `https://${host}`)
      .concat((process.env.CORS_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean))
  );
  if (req.headers['sec-fetch-site'] === 'cross-site' ||
      (req.headers.origin && !origins.has(req.headers.origin))) {
    res.statusCode = 403;
    return res.end(JSON.stringify({ error: { code: 'ORIGIN_DENIED', message: 'Origem não autorizada.' } }));
  }
  if (!['GET', 'POST', 'OPTIONS', 'HEAD'].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST, OPTIONS, HEAD');
    return res.end();
  }
  if (!app) {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_MODE = 'api-key';
    process.env.API_AUTH_KEY = randomBytes(32).toString('hex');
    process.env.DATABASE_SSL_MODE = 'verify-full';
    process.env.TRUST_PROXY = '1';
    process.env.CORS_ORIGINS = [...origins].join(',') || 'http://localhost:5191';
    app = require('../apps/backend/dist/app.js').createApp();
  }
  req.headers['x-sara-api-key'] = process.env.API_AUTH_KEY;
  return app(req, res);
};
