// Vercel Edge function: GET /api/og?url=<public http(s) page>
// Returns {ok:true, url, host, title, description, image, siteName, charset}
// or {ok:false, error, message}. Same-origin only: no CORS headers are sent,
// so other sites cannot use this as an open proxy. All fetching/parsing rules
// live in ./_lib/og.mjs (shared with the tests).
export const config = { runtime: 'edge' };

import { fetchOpenGraph } from './_lib/og.mjs';

export default async function handler(request) {
  if (request.method !== 'GET') {
    return jsonResponse(405, { ok: false, error: 'method', message: 'GET only.' });
  }
  const target = new URL(request.url).searchParams.get('url');
  if (!target) {
    return jsonResponse(400, { ok: false, error: 'missing_url', message: 'Pass ?url=.' });
  }
  if (target.length > 2048) {
    return jsonResponse(414, { ok: false, error: 'invalid_url', message: 'The link is too long.' });
  }
  const result = await fetchOpenGraph(target);
  return jsonResponse(result.ok ? 200 : 422, result, {
    'cache-control': 'no-store',
  });
}

function jsonResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}
