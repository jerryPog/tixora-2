const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
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

  // 2. Parse Clean URL Route
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath === '/admin' || reqPath === '/admin/') reqPath = '/admin.html';
  if (reqPath === '/tours' || reqPath === '/tours/') reqPath = '/tours.html';
  if (reqPath === '/promoter' || reqPath === '/promoter/') reqPath = '/promoter.html';
  if (reqPath === '/protocol' || reqPath === '/protocol/') reqPath = '/protocol.html';
  if (reqPath === '/about' || reqPath === '/about/') reqPath = '/about.html';
  if (reqPath === '/faq' || reqPath === '/faq/') reqPath = '/faq.html';
  if (reqPath === '/sitemap' || reqPath === '/sitemap/') reqPath = '/sitemap.xml';
  if (reqPath === '/robots' || reqPath === '/robots/') reqPath = '/robots.txt';

  // Support general clean URLs if a matching .html file exists
  if (!path.extname(reqPath) && fs.existsSync(path.join(__dirname, reqPath + '.html'))) {
    reqPath = reqPath + '.html';
  }

  const filePath = path.join(__dirname, reqPath);

  // Security & SEO headers
  const baseHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': reqPath.includes('admin') ? 'DENY' : 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };

  fs.stat(filePath, (err, stats) => {
    // 3. Handle 404 with Custom Branded 404.html
    if (err || !stats.isFile()) {
      const notFoundPath = path.join(__dirname, '404.html');
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

    // 4. Serve File with Optimized Caching & Content-Type
    const ext = path.extname(filePath).toLowerCase();
    const isHtml = ext === '.html';
    const isSitemap = ext === '.xml';

    let cacheControl = 'public, max-age=86400, stale-while-revalidate=604800';
    if (isHtml) cacheControl = 'no-cache';
    if (isSitemap) cacheControl = 'public, max-age=3600, stale-while-revalidate=86400';

    const headers = {
      ...baseHeaders,
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': cacheControl
    };

    if (reqPath.includes('admin')) {
      headers['X-Robots-Tag'] = 'noindex, nofollow';
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tixora server is live at http://localhost:${PORT}/ (Admin portal: http://localhost:${PORT}/admin)`);
});
