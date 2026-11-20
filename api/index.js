const { randomBytes } = require('node:crypto');

let app;

// One origin for the page and API. Database and provider keys stay on the server.
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (/^[a-f0-9]{7,40}$/i.test(process.env.VERCEL_GIT_COMMIT_SHA || '')) {
    res.setHeader('X-Sara-Commit', process.env.VERCEL_GIT_COMMIT_SHA);
  }
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
  // A health link opened from chat/docs is a cross-site navigation, not an
  // application request. Permit only public liveness/readiness navigation;
  // mutation, catalog and project routes retain the origin boundary.
  const publicHealthNavigation = ['GET', 'HEAD'].includes(req.method) &&
    !req.headers.origin && req.headers['sec-fetch-mode'] === 'navigate' &&
    /^\/api\/v1\/health(?:\/ping)?\/?$/.test(new URL(req.url, 'http://localhost').pathname);
  if ((!publicHealthNavigation && req.headers['sec-fetch-site'] === 'cross-site') ||
      (req.headers.origin && !origins.has(req.headers.origin))) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
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
