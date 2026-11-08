const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.resolve(__dirname);

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const parts = c.split('=');
    const name = parts[0].trim();
    if (name) {
      cookies[name] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });
  return cookies;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getQueryParam(req, paramName) {
  try {
    const parsed = new URL(req.url, 'http://localhost');
    return parsed.searchParams.get(paramName) || '';
  } catch (e) {
    return '';
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  // 1. Enforce Canonical Host (301 Permanent Redirect from WWW to Apex)
  const host = req.headers.host || '';
  if (host.startsWith('www.')) {
    const apexHost = host.slice(4);
    res.writeHead(301, {
      'Location': `https://${apexHost}${req.url}`,
      'Connection': 'close'
    });
    res.end();
    return;
  }

  // 2. Decode and Sanitize URL Path
  let rawUrl = (req.url || '/').split('?')[0];
  let decodedPath = '';
  try {
    decodedPath = decodeURIComponent(rawUrl);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request: Malformed URI Sequence');
    return;
  }

  // Strip null bytes and normalize slashes
  decodedPath = decodedPath.replace(/\0/g, '');

  // Parse incoming cookies
  const cookies = parseCookies(req.headers.cookie);
  const cookieSecurity = 'Path=/; HttpOnly; Secure; SameSite=Strict';

  // 2a. Secure Session Management API Endpoints
  if (decodedPath === '/api/auth/session' || decodedPath === '/api/session') {
    const sessionHandler = require('./api/auth/session');
    sessionHandler(req, res);
    return;
  }

  if (decodedPath === '/api/auth/logout' || decodedPath === '/api/logout') {
    const logoutHandler = require('./api/auth/logout');
    logoutHandler(req, res);
    return;
  }

  // 2b. Password Reset & Verification API Endpoints (Single-Use, 15-Minute Expiration)
  if (decodedPath === '/api/auth/forgot-password' || decodedPath === '/api/forgot-password') {
    const forgotHandler = require('./api/auth/forgot-password');
    forgotHandler(req, res);
    return;
  }

  if (decodedPath === '/api/auth/verify-reset-token' || decodedPath === '/api/verify-reset-token') {
    const verifyHandler = require('./api/auth/verify-reset-token');
    verifyHandler(req, res);
    return;
  }

  if (decodedPath === '/api/auth/reset-password' || decodedPath === '/api/reset-password') {
    const resetHandler = require('./api/auth/reset-password');
    resetHandler(req, res);
    return;
  }

  // 2c. Anti-Automation Rate Limiting API Endpoint
  if (decodedPath === '/api/auth/rate-limit' || decodedPath === '/api/rate-limit') {
    const rateLimitHandler = require('./api/auth/rate-limit');
    rateLimitHandler(req, res);
    return;
  }

  // 2d. Strictly Lock Admin Routes to Authorized Admins Only
  const isAdminRoute = 
    decodedPath === '/admin' || 
    decodedPath === '/admin.html' || 
    decodedPath.startsWith('/admin/');

  if (isAdminRoute) {
    const sessionToken = cookies.tixora_session;
    const userRole = (cookies.tixora_role || '').toLowerCase();

    // If user is authenticated with a non-admin role (e.g. promoter, attendee):
    // Strictly block access with HTTP 403 Forbidden!
    if (sessionToken && userRole && userRole !== 'admin' && userRole !== 'manager') {
      res.writeHead(403, {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
      });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 Forbidden | Tixora Operations Desk</title>
    <style>
        body { background: #0b0d14; color: #f8fafc; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: 1.5rem; }
        .card { background: #0e1018; border: 1px solid #1e2333; border-radius: 1rem; max-width: 480px; width: 100%; padding: 2rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; }
        .badge { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.625rem; border-radius: 0.375rem; font-size: 0.6875rem; font-family: monospace; text-transform: uppercase; background: rgba(244,63,94,0.15); color: #fb7185; border: 1px solid rgba(244,63,94,0.3); }
        .btn-primary { display: block; width: 100%; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 600; background: #059669; color: white; text-decoration: none; transition: background 0.15s; margin-top: 1.25rem; box-sizing: border-box; }
        .btn-primary:hover { background: #10b981; }
        .btn-secondary { display: block; width: 100%; padding: 0.625rem 1rem; border-radius: 0.5rem; font-size: 0.75rem; background: #161926; color: #94a3b8; text-decoration: none; margin-top: 0.5rem; border: 1px solid #22283a; box-sizing: border-box; }
        .btn-secondary:hover { color: white; background: #1e2333; }
    </style>
</head>
<body>
    <div class="card">
        <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🛡️</div>
        <div class="badge">Security Clearance Restricted</div>
        <h1 style="font-size: 1.5rem; font-weight: 700; margin: 0.75rem 0 0.5rem; letter-spacing: -0.025em;">403 Forbidden</h1>
        <p style="font-size: 0.8125rem; color: #94a3b8; line-height: 1.5; margin: 0;">
            The Tixora Operations Desk (<code style="color: #34d399; font-family: monospace;">/admin</code>) is locked to verified Administrator clearance.
        </p>
        <div style="margin-top: 1rem; padding: 0.75rem; border-radius: 0.5rem; background: rgba(255,255,255,0.02); border: 1px solid #1e2333; font-family: monospace; font-size: 0.75rem; text-align: left;">
            <div style="color: #64748b;">Active Session Role:</div>
            <div style="color: #f59e0b; font-weight: 700; text-transform: uppercase;">${escapeHtml(userRole)}</div>
            <div style="color: #64748b; margin-top: 0.25rem;">Required Clearance:</div>
            <div style="color: #10b981; font-weight: 700;">ADMINISTRATOR / MANAGER</div>
        </div>
        <a href="/dashboard" class="btn-primary">Return to Promoter Command Center</a>
        <a href="/" class="btn-secondary">Go to Live Concert Tours</a>
        <a href="/api/auth/logout" class="btn-secondary" style="color: #f43f5e;">Sign Out & Switch to Admin Account</a>
    </div>
</body>
</html>`);
      return;
    }
  }

  // 3. Prevent Path Traversal
  const normalizedRelPath = path.normalize(decodedPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.resolve(ROOT_DIR, '.' + path.sep + normalizedRelPath);

  // Strict boundary containment check
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: Directory Traversal Prohibited');
    return;
  }

  // 4. Route Mapping for Clean URLs
  let resolvedPath = filePath;
  const relFromRoot = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

  if (relFromRoot === '' || relFromRoot === '.') {
    resolvedPath = path.join(ROOT_DIR, 'index.html');
  } else if (relFromRoot === 'admin') {
    resolvedPath = path.join(ROOT_DIR, 'admin.html');
  } else if (relFromRoot === 'dashboard' || relFromRoot === 'portal') {
    resolvedPath = path.join(ROOT_DIR, 'dashboard.html');
  } else if (relFromRoot === 'tours') {
    resolvedPath = path.join(ROOT_DIR, 'tours.html');
  } else if (relFromRoot === 'promoter') {
    resolvedPath = path.join(ROOT_DIR, 'promoter.html');
  } else if (relFromRoot === 'protocol') {
    resolvedPath = path.join(ROOT_DIR, 'protocol.html');
  } else if (relFromRoot === 'about') {
    resolvedPath = path.join(ROOT_DIR, 'about.html');
  } else if (relFromRoot === 'faq') {
    resolvedPath = path.join(ROOT_DIR, 'faq.html');
  } else if (relFromRoot === 'privacy') {
    resolvedPath = path.join(ROOT_DIR, 'privacy.html');
  } else if (relFromRoot === 'terms') {
    resolvedPath = path.join(ROOT_DIR, 'terms.html');
  } else if (relFromRoot === 'reset-password') {
    resolvedPath = path.join(ROOT_DIR, 'reset-password.html');
  } else if (relFromRoot === 'sitemap') {
    resolvedPath = path.join(ROOT_DIR, 'sitemap.xml');
  } else if (relFromRoot === 'robots') {
    resolvedPath = path.join(ROOT_DIR, 'robots.txt');
  } else if (!path.extname(resolvedPath) && fs.existsSync(resolvedPath + '.html')) {
    resolvedPath = resolvedPath + '.html';
  }

  // 5. Block Access to Sensitive Files & Folders
  const checkRel = path.relative(ROOT_DIR, resolvedPath).replace(/\\/g, '/').toLowerCase();
  const isBlocked =
    checkRel.startsWith('database/') ||
    checkRel === 'database' ||
    checkRel.startsWith('.agents/') ||
    checkRel.startsWith('.') ||
    checkRel.endsWith('.sql') ||
    checkRel.endsWith('.db') ||
    checkRel.endsWith('.sqlite') ||
    checkRel.endsWith('.sqlite3') ||
    checkRel.endsWith('.zip') ||
    checkRel.endsWith('.md') ||
    checkRel.endsWith('.env') ||
    checkRel.endsWith('.yml') ||
    checkRel.endsWith('.yaml') ||
    (checkRel.endsWith('.json') && !checkRel.endsWith('manifest.json') && !checkRel.endsWith('.mcp.json'));

  const baseHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': checkRel.includes('admin') ? 'DENY' : 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
  };

  if (isBlocked) {
    res.writeHead(404, {
      ...baseHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow'
    });
    res.end('404 Not Found — Protected Resource');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    // 6. Handle 404 with Custom Branded 404.html
    if (err || !stats.isFile()) {
      const notFoundPath = path.join(ROOT_DIR, '404.html');
      fs.readFile(notFoundPath, 'utf8', (readErr, notFoundContent) => {
        if (!readErr && notFoundContent) {
          res.writeHead(404, {
            ...baseHeaders,
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': 'noindex, follow'
          });
          res.end(notFoundContent);
        } else {
          res.writeHead(404, {
            ...baseHeaders,
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Robots-Tag': 'noindex, follow'
          });
          res.end('404 Page Not Found — Tixora Protocol');
        }
      });
      return;
    }

    // 7. Serve File with Optimized Caching & Content-Type
    const ext = path.extname(resolvedPath).toLowerCase();
    const isHtml = ext === '.html';
    const isSitemap = ext === '.xml';

    let cacheControl = 'public, max-age=86400, stale-while-revalidate=604800';
    if (isHtml) cacheControl = 'no-cache';
    if (isSitemap) cacheControl = 'public, max-age=3600, stale-while-revalidate=86400';
    if (['.webp', '.jpg', '.jpeg', '.png', '.svg', '.ico', '.woff2', '.gif'].includes(ext)) {
      cacheControl = 'public, max-age=31536000, immutable';
    }

    const headers = {
      ...baseHeaders,
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': cacheControl
    };

    if (checkRel.includes('admin')) {
      headers['X-Robots-Tag'] = 'noindex, nofollow';
      headers['X-Frame-Options'] = 'DENY';
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0';
    }

    // Auto-provision secure HttpOnly SameSite=Strict session cookie for HTML pages
    if (isHtml && !cookies.tixora_session_id) {
      const newSessionId = crypto.randomBytes(24).toString('hex');
      headers['Set-Cookie'] = `tixora_session_id=${newSessionId}; ${cookieSecurity}; Max-Age=604800`;
    }

    res.writeHead(200, headers);
    fs.createReadStream(resolvedPath).pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Tixora server is live at http://localhost:${PORT}/ (Admin portal: http://localhost:${PORT}/admin)`);
  });
}

module.exports = server;
