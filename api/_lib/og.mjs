// Open Graph link-info extraction. Pure logic, no dependencies, runtime-agnostic
// (Vercel Edge function in ../og.js, node tests in tests/og.test.cjs, local harness).
// Design rules for this prototype:
// - never fetch anything but public http(s) pages (SSRF guards below)
// - read at most the document head, then stop (meta tags live there)
// - every failure mode returns {ok:false, error} instead of throwing

const MAX_REDIRECTS = 3;
// big enough for pages that inline megabytes of scripts before </head> (YouTube
// puts its og: tags after ~800KB); early </head> exit keeps typical reads small
const MAX_BYTES = 1536 * 1024;
const TIMEOUT_MS = 8000;

// --- URL safety ------------------------------------------------------------

function isPrivateHost(hostname) {
  let host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  // wildcard-DNS services (nip.io, sslip.io, …) embed an IP in the hostname and
  // resolve it through public DNS — a public-looking name can point at a private
  // address. Apply the same private-address rules to the embedded IP; names
  // without a clear dotted IP fail closed.
  if (/\.nip\.io$/.test(host)) {
    const base = host.slice(0, -'.nip.io'.length);
    const dotted = base.split('.').slice(-4).join('.');          // 93.184.216.34.nip.io
    const dashed = base.split('.').pop().replace(/-/g, '.');      // 10-0-0-1.nip.io
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(dotted)) return isPrivateHost(dotted);
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(dashed)) return isPrivateHost(dashed);
    return true;
  }
  if (/\.sslip\.io$/.test(host)) {
    const parts = host.slice(0, -'.sslip.io'.length).split('.');
    const dotted = parts.slice(-4).join('.');
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(dotted)) return isPrivateHost(dotted);
    const label = parts[parts.length - 1].replace(/-/g, '.');
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(label)) return isPrivateHost(label);
    return true;
  }
  // strip zone id (fe80::1%en0)
  const percent = host.indexOf('%');
  if (percent !== -1) host = host.slice(0, percent);
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan')) return true;
  if (!host.includes(':') && host.endsWith('.')) host = host.slice(0, -1); // FQDN dot
  if (host.includes(':')) {
    // IPv6 literal
    const lower = host.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true; // link-local, ULA
    // v4-mapped, dotted (kept as-is by some runtimes) or hex (URL parsers normalise to this)
    const dotted = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isPrivateHost(dotted[1]);
    const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const g1 = parseInt(hex[1], 16);
      const g2 = parseInt(hex[2], 16);
      return isPrivateHost(`${(g1 >> 8) & 255}.${g1 & 255}.${(g2 >> 8) & 255}.${g2 & 255}`);
    }
    return false;
  }
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = v4.slice(1).map(Number);
    if (v4.slice(1).some(x => Number(x) > 255)) return true; // malformed → refuse
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  return false;
}

function assertFetchableUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    throw { code: 'invalid_url', message: 'This is not a usable link.' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw { code: 'invalid_url', message: 'Only http and https links are supported.' };
  }
  if (url.username || url.password) {
    throw { code: 'invalid_url', message: 'Links with credentials are not supported.' };
  }
  if (isPrivateHost(url.hostname)) {
    throw { code: 'private_url', message: 'Internal addresses are not fetched.' };
  }
  return url;
}

// --- HTML helpers ----------------------------------------------------------

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©',
  reg: '®', trade: '™', mdash: '—', ndash: '–', hellip: '…', rsquo: '’',
  lsquo: '‘', rdquo: '”', ldquo: '“', middot: '·', laquo: '«', raquo: '»',
};

function decodeEntities(text) {
  if (!text) return '';
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeFromCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeFromCode(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] || m);
}

function safeFromCode(code) {
  try {
    if (!Number.isFinite(code) || code < 9 || code > 0x10ffff) return '';
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

function cleanText(text) {
  return decodeEntities(String(text || ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch(html, tagPatterns) {
  for (const pattern of tagPatterns) {
    const match = pattern.exec(html);
    if (match && match[1] && match[1].trim()) return cleanText(match[1]);
  }
  return '';
}

// One meta tag → {key, content}. Handles attribute order, quote styles,
// property vs name, and ignores tags without content.
function* metaTags(html) {
  const re = /<meta\b[^>]*>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const tag = match[0];
    const key = firstMatch(tag, [
      /\bproperty\s*=\s*"([^"]*)"/i,
      /\bproperty\s*=\s*'([^']*)'/i,
      /\bproperty\s*=\s*([^\s"'>]+)/i,
      /\bname\s*=\s*"([^"]*)"/i,
      /\bname\s*=\s*'([^']*)'/i,
      /\bname\s*=\s*([^\s"'>]+)/i,
    ]).toLowerCase();
    const content = firstMatch(tag, [
      /\bcontent\s*=\s*"([^"]*)"/i,
      /\bcontent\s*=\s*'([^']*)'/i,
      /\bcontent\s*=\s*([^\s"'>]+)/i,
    ]);
    if (key && content) yield { key, content };
  }
}

function extractMeta(html, baseUrl) {
  const meta = {};
  for (const { key, content } of metaTags(html)) {
    if (meta[key] === undefined) meta[key] = content;
  }
  let title =
    meta['og:title'] ||
    meta['twitter:title'] ||
    firstMatch(html, [/<title[^>]*>([\s\S]*?)<\/title>/i]);
  let description = meta['og:description'] || meta['description'] || meta['twitter:description'];
  let image = meta['og:image'] || meta['og:image:url'] || meta['og:image:secure_url'] ||
    meta['twitter:image'] || meta['twitter:image:src'] || meta['image'];
  const siteName = meta['og:site_name'] || '';
  title = title ? title.slice(0, 300) : '';
  description = description ? description.slice(0, 500) : '';
  if (image) {
    try {
      image = new URL(decodeEntities(image), baseUrl).href;
    } catch {
      image = '';
    }
  }
  return { title, description, image: image || '', siteName };
}

// --- charset handling ------------------------------------------------------

function sniffCharset(lowerHead) {
  let m = lowerHead.match(/<meta[^>]+charset\s*=\s*["']?\s*([a-z0-9_-]+)/i);
  if (!m) m = lowerHead.match(/<\?xml[^>]+encoding\s*=\s*["']([a-z0-9_-]+)/i);
  return m ? m[1].toLowerCase() : '';
}

function decodeHtml(bytes) {
  const probe = bytes.subarray(0, Math.min(bytes.length, 4096));
  const headAscii = probe.toString('latin1').toLowerCase();
  let label = '';
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    label = 'utf-8';
  } else {
    label = sniffCharset(headAscii);
  }
  const aliases = { ksx1001: 'euc-kr', ksc5601: 'euc-kr', windows949: 'euc-kr', cp949: 'euc-kr', ms949: 'euc-kr' };
  label = aliases[label] || label;
  if (label && label !== 'utf-8' && label !== 'us-ascii') {
    try {
      return { text: new TextDecoder(label).decode(bytes), charset: label };
    } catch {
      // unknown label in this runtime → fall through to utf-8
    }
  }
  return { text: new TextDecoder('utf-8', { fatal: false }).decode(bytes), charset: label || 'utf-8' };
}

// --- fetching ---------------------------------------------------------------

// Reads the response body up to maxBytes, stopping early once </head> is seen.
async function readHead(response, maxBytes = MAX_BYTES) {
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  let tail = ''; // last ascii bytes of the stream, so a tag split across chunks is still found
  while (total < maxBytes) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value && value.length) {
      chunks.push(value);
      total += value.length;
      const ascii = asciiOf(value);
      if ((tail + ascii).toLowerCase().includes('</head>')) break;
      tail = ascii.slice(-16);
    }
  }
  try { await reader.cancel(); } catch { /* stream already closed */ }
  return concatBytes(chunks, maxBytes);
}

function asciiOf(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    text += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, bytes.length)));
  }
  return text;
}

function concatBytes(chunks, cap) {
  const total = Math.min(chunks.reduce((n, c) => n + c.length, 0), cap);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= total) break;
    const view = chunk.subarray(0, Math.min(chunk.length, total - offset));
    out.set(view, offset);
    offset += view.length;
  }
  return out;
}

// Follows redirects manually so every hop is re-validated against the same
// private-address rules as the original URL (redirects are the classic SSRF bypass).
async function fetchOpenGraph(raw, opts = {}) {
  const fetchImpl = opts.fetchImpl || fetch;
  const timeoutMs = opts.timeoutMs || TIMEOUT_MS;
  const maxBytes = opts.maxBytes || MAX_BYTES;
  let current;
  try {
    current = assertFetchableUrl(raw);
  } catch (err) {
    return { ok: false, error: err.code, message: err.message };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await fetchImpl(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          // a desktop browser identity: some blogs serve skeletons to unknown agents
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 PinmapPrototype/0.1',
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'accept-language': 'ko, en;q=0.8',
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) return { ok: false, error: 'unreachable', message: 'The server returned a redirect without a target.' };
        try {
          current = assertFetchableUrl(new URL(location, current).href);
        } catch (err) {
          return { ok: false, error: err.code || 'unreachable', message: err.message || 'Redirect target is not fetchable.' };
        }
        continue;
      }
      if (!response.ok) {
        const code = response.status === 401 || response.status === 403 || response.status === 405
          ? 'blocked'
          : response.status === 404 || response.status === 410 ? 'not_found' : 'unreachable';
        return { ok: false, error: code, message: `The server answered ${response.status}.` };
      }
      const type = (response.headers.get('content-type') || '').toLowerCase();
      if (type && !type.includes('html') && !type.includes('xml') && !type.includes('text')) {
        return { ok: false, error: 'not_html', message: 'The link does not point to a web page.' };
      }
      const bytes = await readHead(response, maxBytes);
      const { text, charset } = decodeHtml(bytes);
      const lower = text.toLowerCase();
      const headEnd = lower.indexOf('</head>');
      const scope = headEnd !== -1 ? text.slice(0, headEnd) : text;
      const meta = extractMeta(scope, response.url || current.href);
      if (!meta.title && !meta.image && !meta.description) {
        return { ok: false, error: 'no_metadata', message: 'No title or image could be read from the page.' };
      }
      return {
        ok: true,
        url: current.href,
        host: current.hostname.replace(/^www\./, ''),
        charset,
        ...meta,
      };
    }
    return { ok: false, error: 'unreachable', message: 'Too many redirects.' };
  } catch (err) {
    if (err && (err.name === 'AbortError' || err.code === 'ABORT_ERR' || controller.signal.aborted)) {
      return { ok: false, error: 'timeout', message: 'The page took too long to answer.' };
    }
    return { ok: false, error: 'unreachable', message: 'The page could not be reached.' };
  } finally {
    clearTimeout(timer);
  }
}

export {
  assertFetchableUrl,
  decodeEntities,
  extractMeta,
  fetchOpenGraph,
  isPrivateHost,
  sniffCharset,
  decodeHtml,
};
