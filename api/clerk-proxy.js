export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  try {
    // 1. Parse path robustly
    let path = '';
    if (req.query.path) {
      path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    } else {
      const parsedUrl = new URL(req.url, 'http://localhost');
      path = parsedUrl.searchParams.get('path') || '';
    }

    // 2. Preserve the original query string (e.g. __clerk_api_version, _is_native, etc.)
    const parsedUrl = new URL(req.url, 'http://localhost');
    parsedUrl.searchParams.delete('path');
    const qs = parsedUrl.searchParams.toString();
    const clerkUrl = `https://frontend-api.clerk.dev/${path}${qs ? '?' + qs : ''}`;

    // 2. Clean up request headers (remove forbidden/problematic headers)
    const requestHeaders = {};
    const skipRequestHeaders = new Set([
      'host',
      'connection',
      'keep-alive',
      'transfer-encoding',
      'content-length'
    ]);

    for (const [key, value] of Object.entries(req.headers)) {
      if (!skipRequestHeaders.has(key.toLowerCase())) {
        requestHeaders[key] = value;
      }
    }

    // Set required Clerk proxy headers
    requestHeaders['Clerk-Proxy-Url'] = 'https://dayone-navy.vercel.app/__clerk';
    requestHeaders['Clerk-Secret-Key'] = process.env.CLERK_SECRET_KEY || '';

    // Handle body forwarding using raw buffer (preserves Content-Type exactly)
    let requestBody = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      if (chunks.length > 0) {
        requestBody = Buffer.concat(chunks);
      }
    }

    // 3. Perform the fetch request
    const response = await fetch(clerkUrl, {
      method: req.method,
      headers: requestHeaders,
      body: requestBody,
    });

    // 4. Clean up response headers before forwarding back to client
    const skipResponseHeaders = new Set([
      'connection',
      'keep-alive',
      'transfer-encoding',
      'content-encoding',
      'content-length'
    ]);

    response.headers.forEach((value, key) => {
      if (!skipResponseHeaders.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.status(response.status);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      res.json(json);
    } else {
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (error) {
    console.error('Clerk proxy error:', error);
    // Send full error stack to client to easily debug on production
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      envKeyPresent: !!process.env.CLERK_SECRET_KEY
    });
  }
}
