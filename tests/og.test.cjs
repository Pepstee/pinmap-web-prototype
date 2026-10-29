// Tests for the /api/og link-info extractor: pure parser, charset handling,
// SSRF guards and the fetch/redirect flow (network is injected, never real).
// CJS test files cannot top-level-await an ESM import, so the module loads
// once as a promise and every test receives it resolved.
const { test } = require('node:test');
const assert = require('node:assert');

const ogP = import('../api/_lib/og.mjs');
const T = (name, fn) => test(name, async () => fn(await ogP));

// ---- URL safety ----

T('accepts ordinary public http(s) links', (og) => {
  for (const url of ['https://blog.example.com/post/123', 'http://example.com', 'https://8.8.8.8/a', 'https://172.32.0.1/x', 'https://sub.domain.co.kr/']) {
    assert.equal(og.assertFetchableUrl(url).protocol.startsWith('http'), true, url);
  }
});

T('rejects non-http schemes and credential links', (og) => {
  for (const url of ['ftp://example.com/a', 'javascript:alert(1)', 'file:///etc/passwd', 'https://user:pass@example.com/']) {
    assert.throws(() => og.assertFetchableUrl(url), undefined, url);
  }
  assert.throws(() => og.assertFetchableUrl('not a url'));
  assert.throws(() => og.assertFetchableUrl(''));
});

T('rejects loopback, private and link-local addresses', (og) => {
  const hosts = [
    'http://localhost/', 'http://localhost:8080/', 'http://shop.localhost/',
    'http://127.0.0.1/', 'http://127.1.2.3/',
    'http://10.0.0.1/', 'http://10.255.1.2/',
    'http://172.16.0.1/', 'http://172.31.255.1/',
    'http://192.168.0.1/', 'http://192.168.100.7/',
    'http://169.254.169.254/latest/meta-data/', // cloud metadata
    'http://0.0.0.0/', 'http://100.64.0.1/', 'http://198.18.0.1/',
    'http://224.0.0.1/', 'http://240.0.0.1/', 'http://255.255.255.255/',
    'http://[::1]/', 'http://[::]/', 'http://[fe80::1]/', 'http://[fc00::1]/', 'http://[fd12::1]/',
    'http://[::ffff:127.0.0.1]/', 'http://[::ffff:192.168.1.1]/',
    'http://myserver.local/', 'http://db.internal/', 'http://nas.lan/',
    'http://127.0.0.1.nip.io/', 'http://10.0.0.1.sslip.io/',      // wildcard-DNS to private IP
    'http://192.168.1.1.nip.io/', 'http://myhost.nip.io/',       // fail closed on non-IP wildcard names
  ];
  for (const url of hosts) {
    try {
      og.assertFetchableUrl(url);
      assert.fail(`should have rejected ${url}`);
    } catch (err) {
      assert.equal(err.code, 'private_url', url);
    }
  }
});

T('does not over-block addresses that only look private', (og) => {
  for (const url of ['https://172.32.1.1/', 'https://100.200.100.200/', 'https://198.20.1.1/', 'https://169.250.1.1/']) {
    assert.doesNotThrow(() => og.assertFetchableUrl(url), url);
  }
});

// ---- entity decoding ----

T('wildcard-DNS names with public IPs stay fetchable', (og) => {
  for (const url of ['https://93.184.216.34.nip.io/', 'https://site.public.example.sslip.io/'.replace('site.public.example.', '8.8.8.8.')]) {
    assert.doesNotThrow(() => og.assertFetchableUrl(url), url);
  }
});

T('decodes html entities in titles', (og) => {
  assert.equal(og.decodeEntities('A &amp; B &#39;C&#x27; &quot;D&quot;'), "A & B 'C' \"D\"");
  assert.equal(og.decodeEntities('모르는 &foobar; 는 그대로'), '모르는 &foobar; 는 그대로');
  assert.equal(og.decodeEntities('카페&nbsp;&amp;&nbsp;디저트'), '카페 & 디저트');
});

// ---- meta extraction ----

T('extracts Open Graph tags with different attribute styles', (og) => {
  const html = `
    <html><head>
      <meta charset="utf-8">
      <meta property="og:title" content='카페 &amp; 디저트  지도'>
      <meta content="성수동 카페 이야기" property="og:description">
      <meta property=og:image content="/img/cover.jpg">
      <meta name="description" content="fallback 설명">
      <title>페이지 제목</title>
    </head><body>…</body></html>`;
  const meta = og.extractMeta(html, 'https://blog.example.com/posts/1');
  assert.equal(meta.title, '카페 & 디저트 지도');
  assert.equal(meta.description, '성수동 카페 이야기');
  assert.equal(meta.image, 'https://blog.example.com/img/cover.jpg');
});

T('falls back to twitter tags and page title', (og) => {
  const html = `<html><head><meta name="twitter:title" content="트위터 제목">
    <meta name="twitter:description" content="트위터 설명">
    <meta name="twitter:image" content="https://cdn.example.com/t.jpg"><title>무시됨</title></head></html>`;
  const meta = og.extractMeta(html, 'https://example.com/');
  assert.equal(meta.title, '트위터 제목');
  assert.equal(meta.description, '트위터 설명');
  assert.equal(meta.image, 'https://cdn.example.com/t.jpg');

  const bare = og.extractMeta('<html><head><title>제목만 있는 페이지</title></head></html>', 'https://example.com/');
  assert.equal(bare.title, '제목만 있는 페이지');
  assert.equal(bare.image, '');
  assert.equal(bare.description, '');
});

T('keeps first og:title when a page repeats it', (og) => {
  const html = `<meta property="og:title" content="진짜 제목"><meta property="og:title" content="중복">`;
  assert.equal(og.extractMeta(html, 'https://example.com/').title, '진짜 제목');
});

// ---- charset ----

T('sniffs and decodes EUC-KR pages', (og) => {
  // '서울 성수동' in EUC-KR bytes; modern pages are UTF-8, older Korean blogs are not
  const head = Buffer.from('<html><head><meta charset="euc-kr"><title>', 'ascii');
  const body = Buffer.from([0xbc, 0xad, 0xbf, 0xef, 0x20, 0xbc, 0xba, 0xbc, 0xf6, 0xb5, 0xbf]);
  const tail = Buffer.from('</title></head></html>', 'ascii');
  const { text, charset } = og.decodeHtml(Buffer.concat([head, body, tail]));
  assert.equal(charset, 'euc-kr');
  assert.match(text, /서울 성수동/);
});

T('falls back to utf-8 for unknown charsets and keeps garbage harmless', (og) => {
  const { text } = og.decodeHtml(Buffer.from('<meta charset="x-made-up"><title>한글</title>'));
  assert.match(text, /한글/);
  const junk = og.decodeHtml(Buffer.from([0xff, 0xfe, 0x61, 0xff]));
  assert.equal(typeof junk.text, 'string');
});

// ---- fetch flow (network injected) ----

function htmlResponse(body, { status = 200, url, type = 'text/html; charset=utf-8', headers = {} } = {}) {
  return new Response(body, { status, headers: { 'content-type': type, ...headers }, url });
}

T('follows public redirects and reports the final url', async (og) => {
  const seen = [];
  const impl = async (url) => {
    seen.push(String(url));
    if (seen.length === 1) {
      return new Response(null, { status: 302, headers: { location: 'https://example.com/final' } });
    }
    return htmlResponse('<title>도착 페이지</title>', { url });
  };
  const result = await og.fetchOpenGraph('https://example.com/redirect', { fetchImpl: impl });
  assert.equal(result.ok, true);
  assert.equal(result.title, '도착 페이지');
  assert.equal(result.url, 'https://example.com/final');
  assert.equal(result.host, 'example.com');
  assert.deepEqual(seen, ['https://example.com/redirect', 'https://example.com/final']);
});

T('refuses redirects into private space', async (og) => {
  const impl = async () => new Response(null, { status: 301, headers: { location: 'http://169.254.169.254/meta' } });
  const result = await og.fetchOpenGraph('https://evil.example/open', { fetchImpl: impl });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'private_url');
});

T('gives up after too many redirects', async (og) => {
  const impl = async () => new Response(null, { status: 302, headers: { location: 'https://example.com/next' } });
  const result = await og.fetchOpenGraph('https://example.com/loop', { fetchImpl: impl });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'unreachable');
});

T('maps http errors to friendly codes', async (og) => {
  const blocked = await og.fetchOpenGraph('https://walled.example/post', {
    fetchImpl: async () => htmlResponse('', { status: 403 }),
  });
  assert.equal(blocked.error, 'blocked');
  const missing = await og.fetchOpenGraph('https://gone.example/post', {
    fetchImpl: async () => htmlResponse('', { status: 404 }),
  });
  assert.equal(missing.error, 'not_found');
});

T('refuses non-html content types', async (og) => {
  const result = await og.fetchOpenGraph('https://cdn.example.com/paper.pdf', {
    fetchImpl: async () => htmlResponse('', { type: 'application/pdf' }),
  });
  assert.equal(result.error, 'not_html');
});

T('reports pages without any readable metadata', async (og) => {
  const result = await og.fetchOpenGraph('https://empty.example/', {
    fetchImpl: async () => htmlResponse('<html><head></head><body>내용뿐</body></html>'),
  });
  assert.equal(result.error, 'no_metadata');
});

T('stops reading the body early once the head is complete', async (og) => {
  let reads = 0;
  const big = `<html><head><meta property="og:title" content="헤드만 있는 제목"></head>`;
  const stream = new ReadableStream({
    pull(controller) {
      reads++;
      controller.enqueue(new TextEncoder().encode(big));
      // deliberately never closes the stream
    },
  });
  const impl = async () => new Response(stream, { headers: { 'content-type': 'text/html' }, url: 'https://example.com/' });
  const result = await og.fetchOpenGraph('https://example.com/', { fetchImpl: impl });
  assert.equal(result.ok, true);
  assert.equal(result.title, '헤드만 있는 제목');
  // the endless stream must not be drained: a couple of pulls happen from queue
  // refilling, but early </head> exit means far fewer than the 400KB cap allows
  assert.ok(reads <= 2, `expected early stop, got ${reads} reads`);
});

T('surfaces aborts as timeouts', async (og) => {
  const impl = async (url, init) => {
    return new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
  };
  const result = await og.fetchOpenGraph('https://slow.example/', { fetchImpl: impl, timeoutMs: 30 });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'timeout');
});

T('resolves relative og:image against the final page url', async (og) => {
  const impl = async () => htmlResponse('<meta property="og:image" content="../pic/cover.png">', { url: 'https://example.com/a/b/post' });
  const result = await og.fetchOpenGraph('https://example.com/a/b/post', { fetchImpl: impl });
  assert.equal(result.image, 'https://example.com/a/pic/cover.png');
});

T('reads past large inline scripts before </head> (YouTube-style pages)', async (og) => {
  // real case: youtube's og: tags sit ~800KB into the head, after megabytes of JS
  const padding = `<script>var x="${'x'.repeat(600 * 1024)}";</script>`;
  const html = `<html><head>${padding}<meta property="og:title" content="Поздний заголовок"><meta property="og:image" content="/late.jpg"></head><body></body></html>`;
  const impl2 = async () => htmlResponse(html, { url: 'https://video.example/watch' });
  const result = await og.fetchOpenGraph('https://video.example/watch', { fetchImpl: impl2 });
  assert.equal(result.ok, true);
  assert.equal(result.title, 'Поздний заголовок');
  assert.equal(result.image, 'https://video.example/late.jpg');
});

T('gives up on pages whose head never closes within the cap', async (og) => {
  const padding = `<script>var x="${'x'.repeat(200 * 1024)}";</script>`;
  const html = `<html><head>${padding.repeat(10)}<meta property="og:title" content="За лимитом">`;
  const result = await og.fetchOpenGraph('https://huge.example/watch', {
    fetchImpl: async () => htmlResponse(html, { url: 'https://huge.example/watch' }),
    maxBytes: 400 * 1024, // small cap just for this test
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'no_metadata');
});
