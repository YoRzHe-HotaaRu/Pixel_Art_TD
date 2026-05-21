import http from 'http';

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log(`[BROWSER ${data.type.toUpperCase()}]`, data.msg);
      } catch (e) {
        console.log('Failed to parse body:', body);
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(5175, () => {
  console.log('Log server listening on port 5175');
});
