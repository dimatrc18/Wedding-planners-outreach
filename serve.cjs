const http = require('http');
const fs = require('fs');
const path = require('path');
const tls = require('tls');
const readline = require('readline');

const baseDir = __dirname;
const PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4'
};

function performSmtpAuth(user, pass) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(465, 'smtp.hostinger.com', { minVersion: 'TLSv1.2' });
    socket.setEncoding('utf8');

    let step = 0;
    const rl = readline.createInterface({ input: socket });

    rl.on('line', (line) => {
      const code = parseInt(line.substring(0, 3), 10);
      if (line.charAt(3) === '-') return;

      try {
        if (step === 0 && code === 220) {
          step++;
          socket.write('EHLO b2b-dorogo.it\r\n');
        } else if (step === 1 && code === 250) {
          step++;
          socket.write('AUTH LOGIN\r\n');
        } else if (step === 2 && code === 334) {
          step++;
          socket.write(Buffer.from(user).toString('base64') + '\r\n');
        } else if (step === 3 && code === 334) {
          step++;
          socket.write(Buffer.from(pass).toString('base64') + '\r\n');
        } else if (step === 4 && code === 235) {
          step++;
          socket.write('QUIT\r\n');
          socket.end();
          resolve(true);
        } else if (code >= 400) {
          socket.end();
          reject(new Error(`SMTP Authentication Error [${code}]: ${line}`));
        }
      } catch (e) {
        socket.end();
        reject(e);
      }
    });

    socket.on('error', (err) => reject(err));
    socket.setTimeout(12000, () => {
      socket.destroy();
      reject(new Error('SMTP Connection timed out (12s)'));
    });
  });
}

function sendSmtpEmail({ to, toName, subject, body, hostingerPass, fromEmail = 'igor@b2b-dorogo.it', fromName = 'Igor' }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(465, 'smtp.hostinger.com', { minVersion: 'TLSv1.2' });
    socket.setEncoding('utf8');

    let step = 0;
    let queueId = '';
    const rl = readline.createInterface({ input: socket });

    rl.on('line', (line) => {
      const code = parseInt(line.substring(0, 3), 10);
      if (line.charAt(3) === '-') return;

      try {
        if (step === 0 && code === 220) {
          step++;
          socket.write('EHLO b2b-dorogo.it\r\n');
        } else if (step === 1 && code === 250) {
          step++;
          socket.write('AUTH LOGIN\r\n');
        } else if (step === 2 && code === 334) {
          step++;
          socket.write(Buffer.from(fromEmail).toString('base64') + '\r\n');
        } else if (step === 3 && code === 334) {
          step++;
          socket.write(Buffer.from(hostingerPass).toString('base64') + '\r\n');
        } else if (step === 4 && code === 235) {
          step++;
          socket.write(`MAIL FROM:<${fromEmail}>\r\n`);
        } else if (step === 5 && code === 250) {
          step++;
          socket.write(`RCPT TO:<${to}>\r\n`);
        } else if (step === 6 && code === 250) {
          step++;
          socket.write('DATA\r\n');
        } else if (step === 7 && code === 354) {
          step++;
          const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@b2b-dorogo.it>`;
          const toFormatted = toName ? `"${toName.replace(/"/g, '')}" <${to}>` : `<${to}>`;
          const rawEmail = [
            `From: ${fromName} <${fromEmail}>`,
            `To: ${toFormatted}`,
            `Subject: ${subject}`,
            `Date: ${new Date().toUTCString()}`,
            `Message-ID: ${messageId}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/plain; charset=UTF-8`,
            `Content-Transfer-Encoding: 8bit`,
            ``,
            body,
            `.`
          ].join('\r\n');
          socket.write(rawEmail + '\r\n');
        } else if (step === 8 && code === 250) {
          step++;
          queueId = line;
          socket.write('QUIT\r\n');
        } else if (step === 9 && code === 221) {
          socket.end();
          resolve({ ok: true, queueId });
        } else if (code >= 400) {
          socket.end();
          reject(new Error(`SMTP Dispatch Error [${code}]: ${line}`));
        }
      } catch (e) {
        socket.end();
        reject(e);
      }
    });

    socket.on('error', (err) => reject(err));
    socket.setTimeout(25000, () => {
      socket.destroy();
      reject(new Error('SMTP Dispatch timed out (25s)'));
    });
  });
}

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const reqPath = url.pathname;

  // API Endpoints
  if (reqPath.startsWith('/api/')) {
    if (reqPath === '/api/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, sender: 'igor@b2b-dorogo.it', host: 'smtp.hostinger.com', port: 465 }));
      return;
    }

    if (req.method === 'POST') {
      let bodyData = '';
      req.on('data', chunk => { bodyData += chunk; });
      req.on('end', async () => {
        try {
          const payload = bodyData ? JSON.parse(bodyData) : {};

          if (reqPath === '/api/test-smtp') {
            const pass = payload.hostingerPass || process.env.HOSTINGER_PASS;
            const user = payload.email || 'igor@b2b-dorogo.it';
            if (!pass) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Password required' }));
              return;
            }
            await performSmtpAuth(user, pass);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, message: 'SMTP credentials verified successfully' }));
            return;
          }

          if (reqPath === '/api/send-email') {
            const pass = payload.hostingerPass || process.env.HOSTINGER_PASS;
            if (!pass) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Hostinger password required to dispatch email' }));
              return;
            }
            if (!payload.to || !payload.subject || !payload.body) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Missing required fields: to, subject, body' }));
              return;
            }

            const result = await sendSmtpEmail({
              to: payload.to,
              toName: payload.toName || '',
              subject: payload.subject,
              body: payload.body,
              hostingerPass: pass,
              fromEmail: payload.fromEmail || 'igor@b2b-dorogo.it',
              fromName: payload.fromName || 'Igor'
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, queueId: result.queueId }));
            return;
          }

          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Endpoint not found' }));
        } catch (err) {
          console.error('API Error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
      return;
    }
  }

  // Static File Serving
  let filePath = path.join(baseDir, decodeURIComponent(reqPath === '/' ? '/index.html' : reqPath));

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found: ' + reqPath);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': mime,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`DOROGO Zero-Cache Outreach Server running at http://127.0.0.1:${PORT}`);
});
