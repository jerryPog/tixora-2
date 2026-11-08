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
