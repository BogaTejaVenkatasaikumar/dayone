export const config = { api: { bodyParser: false } };

const PROXY_HOST = 'dayone-navy.vercel.app';
const CLERK_UPSTREAM = 'frontend-api.clerk.dev';

export default async function handler(req, res) {
  try {
    const parsedUrl = new URL(req.url, 'http://localhost');
    let path = parsedUrl.searchParams.get('path') || '';
    if (req.query.path) {
      path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    }
    parsedUrl.searchParams.delete('path');
    const qs = parsedUrl.searchParams.toString();
    const clerkUrl = `https://${CLERK_UPSTREAM}/${path}${qs ? '?' + qs : ''}`;

    const skipRequestHeaders = new Set(['host','connection','keep-alive','transfer-encoding','content-length']);
    const requestHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!skipRequestHeaders.has(key.toLowerCase())) requestHeaders[key] = value;
    }
    requestHeaders['host'] = CLERK_UPSTREAM;
    requestHeaders['Clerk-Proxy-Url'] = `https://${PROXY_HOST}/__clerk`;
    requestHeaders['Clerk-Secret-Key'] = process.env.CLERK_SECRET_KEY || '';

    let requestBody = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      if (chunks.length > 0) requestBody = Buffer.concat(chunks);
    }

    const response = await fetch(clerkUrl, {
      method: req.method,
      headers: requestHeaders,
      body: requestBody,
      redirect: 'manual',
    });

    const skipResponseHeaders = new Set(['connection','keep-alive','transfer-encoding','content-encoding','content-length']);

    response.headers.forEach((value, key) => {
      if (skipResponseHeaders.has(key.toLowerCase())) return;
      if (key.toLowerCase() === 'set-cookie') {
        const rewritten = value.replace(/domain=[^;,]*/gi, `domain=.${PROXY_HOST}`);
        res.setHeader('Set-Cookie', rewritten);
      } else if (key.toLowerCase() === 'location') {
        const rewritten = value.replace(new RegExp(`https://${CLERK_UPSTREAM}`, 'g'), `https://${PROXY_HOST}/__clerk`);
        res.setHeader('Location', rewritten);
      } else {
        res.setHeader(key, value);
      }
    });

    res.status(response.status);

    // Read body as text first to safely handle empty/redirect responses
    const bodyText = await response.text();
    if (!bodyText) {
      res.end();
      return;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        res.json(JSON.parse(bodyText));
      } catch {
        res.send(bodyText);
      }
    } else {
      res.send(bodyText);
    }
  } catch (error) {
    console.error('Clerk proxy error:', error);
    res.status(500).json({ error: error.message, envKeyPresent: !!process.env.CLERK_SECRET_KEY });
  }
}
