export default async function handler(req, res) {
  // Get path from query parameter (forwarded from vercel.json rewrite)
  const path = req.query.path || '';
  
  // Forward to Clerk's Frontend API
  const clerkUrl = `https://frontend-api.clerk.dev/${path}`;
  
  // Copy original headers
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() !== 'host') {
      headers[key] = value;
    }
  }
  
  // Set required Clerk proxy headers
  headers['Clerk-Proxy-Url'] = 'https://dayone-navy.vercel.app/__clerk';
  headers['Clerk-Secret-Key'] = process.env.CLERK_SECRET_KEY || '';
  
  try {
    const response = await fetch(clerkUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    
    // Copy response headers back
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
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
    res.status(500).send('Internal Server Error');
  }
}
