import type { Env, ApiResponse, TokenCache } from './types';

// ── Sign Seeds (from Swagger docs) ──

type SignSeed = string | ((a: string, b: string) => string);

const SIGN_SEEDS: Record<string, SignSeed> = {
  // Admin endpoints
  admin_list:     'jskdsfgsnss$dsaah3hjsb',
  admin_class:    'jskdn$dh3hjsb',
  // App endpoints (merchant)
  goods_list:     'jsm6y$dh3hjsb',
  categories:     'jskdn$dh3hjsb',
  origins:        'js0ntu$wphjsb',
  // User endpoints
  u_search:       'jsm6y$nu5wjsb',
  u_goods:        'jsk0r$om2djsb',
  // Auth
  captcha:        'ijhteuPPokM6241R24',
  refresh_token:  (rt: string, _: string) => rt + 'ffdfddfdfu***',
};

// ── Pure JS MD5 (RFC 1321) ──

function md5(input: string): string {
  const str = unescape(encodeURIComponent(input));
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 0; i < 4; i++) bytes.push((bitLen >>> (i * 8)) & 0xff);
  for (let i = 0; i < 4; i++) bytes.push(0);

  const add = (a: number, b: number) => (a + b) | 0;
  const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));

  const ff = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
    add(rotl(add(add(a, ((b & c) | (~b & d))), add(x, t)), s), b);
  const gg = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
    add(rotl(add(add(a, ((b & d) | (c & ~d))), add(x, t)), s), b);
  const hh = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
    add(rotl(add(add(a, (b ^ c ^ d)), add(x, t)), s), b);
  const ii = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
    add(rotl(add(add(a, (c ^ (b | ~d))), add(x, t)), s), b);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

  for (let i = 0; i < bytes.length; i += 64) {
    const w: number[] = [];
    for (let j = 0; j < 16; j++) {
      w[j] = bytes[i + j * 4] | (bytes[i + j * 4 + 1] << 8) |
             (bytes[i + j * 4 + 2] << 16) | (bytes[i + j * 4 + 3] << 24);
    }

    let a = a0, b = b0, c = c0, d = d0;

    a=ff(a,b,c,d,w[0],7,0xd76aa478);   d=ff(d,a,b,c,w[1],12,0xe8c7b756);
    c=ff(c,d,a,b,w[2],17,0x242070db);   b=ff(b,c,d,a,w[3],22,0xc1bdceee);
    a=ff(a,b,c,d,w[4],7,0xf57c0faf);   d=ff(d,a,b,c,w[5],12,0x4787c62a);
    c=ff(c,d,a,b,w[6],17,0xa8304613);   b=ff(b,c,d,a,w[7],22,0xfd469501);
    a=ff(a,b,c,d,w[8],7,0x698098d8);   d=ff(d,a,b,c,w[9],12,0x8b44f7af);
    c=ff(c,d,a,b,w[10],17,0xffff5bb1);  b=ff(b,c,d,a,w[11],22,0x895cd7be);
    a=ff(a,b,c,d,w[12],7,0x6b901122);  d=ff(d,a,b,c,w[13],12,0xfd987193);
    c=ff(c,d,a,b,w[14],17,0xa679438e);  b=ff(b,c,d,a,w[15],22,0x49b40821);

    a=gg(a,b,c,d,w[1],5,0xf61e2562);   d=gg(d,a,b,c,w[6],9,0xc040b340);
    c=gg(c,d,a,b,w[11],14,0x265e5a51);  b=gg(b,c,d,a,w[0],20,0xe9b6c7aa);
    a=gg(a,b,c,d,w[5],5,0xd62f105d);   d=gg(d,a,b,c,w[10],9,0x02441453);
    c=gg(c,d,a,b,w[15],14,0xd8a1e681);  b=gg(b,c,d,a,w[4],20,0xe7d3fbc8);
    a=gg(a,b,c,d,w[9],5,0x21e1cde6);   d=gg(d,a,b,c,w[14],9,0xc33707d6);
    c=gg(c,d,a,b,w[3],14,0xf4d50d87);   b=gg(b,c,d,a,w[8],20,0x455a14ed);
    a=gg(a,b,c,d,w[13],5,0xa9e3e905);  d=gg(d,a,b,c,w[2],9,0xfcefa3f8);
    c=gg(c,d,a,b,w[7],14,0x676f02d9);   b=gg(b,c,d,a,w[12],20,0x8d2a4c8a);

    a=hh(a,b,c,d,w[5],4,0xfffa3942);   d=hh(d,a,b,c,w[8],11,0x8771f681);
    c=hh(c,d,a,b,w[11],16,0x6d9d6122);  b=hh(b,c,d,a,w[14],23,0xfde5380c);
    a=hh(a,b,c,d,w[1],4,0xa4beea44);   d=hh(d,a,b,c,w[4],11,0x4bdecfa9);
    c=hh(c,d,a,b,w[7],16,0xf6bb4b60);   b=hh(b,c,d,a,w[10],23,0xbebfbc70);
    a=hh(a,b,c,d,w[13],4,0x289b7ec6);  d=hh(d,a,b,c,w[0],11,0xeaa127fa);
    c=hh(c,d,a,b,w[3],16,0xd4ef3085);   b=hh(b,c,d,a,w[6],23,0x04881d05);
    a=hh(a,b,c,d,w[9],4,0xd9d4d039);   d=hh(d,a,b,c,w[12],11,0xe6db99e5);
    c=hh(c,d,a,b,w[15],16,0x1fa27cf8);  b=hh(b,c,d,a,w[2],23,0xc4ac5665);

    a=ii(a,b,c,d,w[0],6,0xf4292244);   d=ii(d,a,b,c,w[7],10,0x432aff97);
    c=ii(c,d,a,b,w[14],15,0xab9423a7);  b=ii(b,c,d,a,w[5],21,0xfc93a039);
    a=ii(a,b,c,d,w[12],6,0x655b59c3);  d=ii(d,a,b,c,w[3],10,0x8f0ccc92);
    c=ii(c,d,a,b,w[10],15,0xffeff47d);  b=ii(b,c,d,a,w[1],21,0x85845dd1);
    a=ii(a,b,c,d,w[8],6,0x6fa87e4f);   d=ii(d,a,b,c,w[15],10,0xfe2ce6e0);
    c=ii(c,d,a,b,w[6],15,0xa3014314);   b=ii(b,c,d,a,w[13],21,0x4e0811a1);
    a=ii(a,b,c,d,w[4],6,0xf7537e82);   d=ii(d,a,b,c,w[11],10,0xbd3af235);
    c=ii(c,d,a,b,w[2],15,0x2ad7d2bb);   b=ii(b,c,d,a,w[9],21,0xeb86d391);

    a0 = add(a0, a); b0 = add(b0, b); c0 = add(c0, c); d0 = add(d0, d);
  }

  function toHex(n: number) {
    return [(n) & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  return (toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0)).toUpperCase();
}

// ── Sign ──

function sign(key: string, arg1 = '', arg2 = ''): string {
  const seed = SIGN_SEEDS[key];
  const raw = typeof seed === 'function' ? seed(arg1, arg2) : seed;
  return md5(raw);
}

// ── API Request ──

interface RequestOptions {
  params?: Record<string, string | number>;
  body?: any;
  token?: string;
  signArgs?: [string, string];  // Extra args for sign function
}

export async function apiRequest(
  env: Env,
  method: string,
  path: string,
  signKey: string,
  opts: RequestOptions = {}
): Promise<ApiResponse> {
  let url = env.APM_API_BASE + path;

  if (opts.params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.params)) {
      qs.set(k, String(v));
    }
    url += '?' + qs.toString();
  }

  const [arg1, arg2] = opts.signArgs || ['', ''];

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'lang': 'zh-cn',
    'v': '7.0.3',
    'p': '3',  // Admin backend
    't': String(Math.floor(Date.now() / 1000)),
    'sign': sign(signKey, arg1, arg2),
    'authcode': opts.token ? `HH ${opts.token}` : 'HH ',
  };

  const fetchOpts: RequestInit = { method, headers };
  if (opts.body) {
    fetchOpts.body = JSON.stringify(opts.body);
  }

  try {
    const resp = await fetch(url, fetchOpts);
    const text = await resp.text();
    try {
      return JSON.parse(text) as ApiResponse;
    } catch {
      return { code: resp.status, message: `Non-JSON (${resp.status}): ${text.substring(0, 200)}` };
    }
  } catch (e: any) {
    return { code: -1, message: e.message || 'Network error' };
  }
}

// ── Token Management via refresh_token ──

const TOKEN_KV_KEY = 'apm_access_token';

async function refreshAccessToken(env: Env): Promise<string | null> {
  const refreshToken = env.APM_REFRESH_TOKEN;
  if (!refreshToken) return null;

  const resp = await apiRequest(env, 'POST', '/ids/refresh_token', 'refresh_token', {
    body: { refresh_token: refreshToken },
    signArgs: [refreshToken, ''],
  });

  if (resp.code !== 100) {
    console.log('refresh_token failed:', resp.message);
    return null;
  }

  const accessToken = resp.result?.access_token;
  const expireAt = resp.result?.access_token_expire_at;

  if (!accessToken) return null;

  // Cache to KV
  const cache: TokenCache = {
    token: accessToken,
    expire: expireAt ? expireAt * 1000 : Date.now() + 12 * 3600 * 1000,
  };

  try {
    await env.TOKEN_CACHE.put(TOKEN_KV_KEY, JSON.stringify(cache), {
      expirationTtl: 12 * 3600,  // 12 hours
    });
  } catch {
    // KV write failure is non-fatal
  }

  return accessToken;
}

export async function getToken(env: Env): Promise<string> {
  // Check KV cache
  try {
    const cached = await env.TOKEN_CACHE.get(TOKEN_KV_KEY);
    if (cached) {
      const data: TokenCache = JSON.parse(cached);
      // Check if token expires in more than 5 minutes
      const expireMs = data.expire > 1e12 ? data.expire : data.expire * 1000;
      if (Date.now() < expireMs - 5 * 60 * 1000) {
        return data.token;
      }
    }
  } catch {
    // Cache miss
  }

  // Refresh access_token
  const token = await refreshAccessToken(env);
  if (token) return token;

  throw new Error('Failed to refresh access_token. Check APM_REFRESH_TOKEN.');
}
