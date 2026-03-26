import type { Env, ApiResponse, TokenCache } from './types';

// ── Sign Seeds (from Python SIGN_SEEDS) ──

type SignSeed = string | ((account: string, password: string) => string);

const SIGN_SEEDS: Record<string, SignSeed> = {
  login:        (a, p) => a + p + 'ggfgffgfggf',
  goods_list:   'jsm6y$dh3hjsb',
  goods_detail: 'jsk0r$dh3hjsb',
  goods_sku:    'jsk0enu@3hjsb',
  categories:   'jskdn$dh3hjsb',
  origins:      'js0ntu$wphjsb',
  admin_list:   'jskdsfgsnss$dsaah3hjsb',
  admin_login:  (a, p) => a + p + 'sjpOkkmhm9ds',
};

// ── Pure JS MD5 (RFC 1321) ──
// Cloudflare Workers don't support crypto.subtle.digest('MD5')

function md5(input: string): string {
  // Convert string to byte array (UTF-8)
  const str = unescape(encodeURIComponent(input));
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));

  // Pre-processing
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  // Append length in bits as 64-bit little-endian
  for (let i = 0; i < 4; i++) bytes.push((bitLen >>> (i * 8)) & 0xff);
  for (let i = 0; i < 4; i++) bytes.push(0); // high 32 bits (0 for short strings)

  // Helper functions
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

    // Round 1
    a=ff(a,b,c,d,w[0],7,0xd76aa478);   d=ff(d,a,b,c,w[1],12,0xe8c7b756);
    c=ff(c,d,a,b,w[2],17,0x242070db);   b=ff(b,c,d,a,w[3],22,0xc1bdceee);
    a=ff(a,b,c,d,w[4],7,0xf57c0faf);   d=ff(d,a,b,c,w[5],12,0x4787c62a);
    c=ff(c,d,a,b,w[6],17,0xa8304613);   b=ff(b,c,d,a,w[7],22,0xfd469501);
    a=ff(a,b,c,d,w[8],7,0x698098d8);   d=ff(d,a,b,c,w[9],12,0x8b44f7af);
    c=ff(c,d,a,b,w[10],17,0xffff5bb1);  b=ff(b,c,d,a,w[11],22,0x895cd7be);
    a=ff(a,b,c,d,w[12],7,0x6b901122);  d=ff(d,a,b,c,w[13],12,0xfd987193);
    c=ff(c,d,a,b,w[14],17,0xa679438e);  b=ff(b,c,d,a,w[15],22,0x49b40821);

    // Round 2
    a=gg(a,b,c,d,w[1],5,0xf61e2562);   d=gg(d,a,b,c,w[6],9,0xc040b340);
    c=gg(c,d,a,b,w[11],14,0x265e5a51);  b=gg(b,c,d,a,w[0],20,0xe9b6c7aa);
    a=gg(a,b,c,d,w[5],5,0xd62f105d);   d=gg(d,a,b,c,w[10],9,0x02441453);
    c=gg(c,d,a,b,w[15],14,0xd8a1e681);  b=gg(b,c,d,a,w[4],20,0xe7d3fbc8);
    a=gg(a,b,c,d,w[9],5,0x21e1cde6);   d=gg(d,a,b,c,w[14],9,0xc33707d6);
    c=gg(c,d,a,b,w[3],14,0xf4d50d87);   b=gg(b,c,d,a,w[8],20,0x455a14ed);
    a=gg(a,b,c,d,w[13],5,0xa9e3e905);  d=gg(d,a,b,c,w[2],9,0xfcefa3f8);
    c=gg(c,d,a,b,w[7],14,0x676f02d9);   b=gg(b,c,d,a,w[12],20,0x8d2a4c8a);

    // Round 3
    a=hh(a,b,c,d,w[5],4,0xfffa3942);   d=hh(d,a,b,c,w[8],11,0x8771f681);
    c=hh(c,d,a,b,w[11],16,0x6d9d6122);  b=hh(b,c,d,a,w[14],23,0xfde5380c);
    a=hh(a,b,c,d,w[1],4,0xa4beea44);   d=hh(d,a,b,c,w[4],11,0x4bdecfa9);
    c=hh(c,d,a,b,w[7],16,0xf6bb4b60);   b=hh(b,c,d,a,w[10],23,0xbebfbc70);
    a=hh(a,b,c,d,w[13],4,0x289b7ec6);  d=hh(d,a,b,c,w[0],11,0xeaa127fa);
    c=hh(c,d,a,b,w[3],16,0xd4ef3085);   b=hh(b,c,d,a,w[6],23,0x04881d05);
    a=hh(a,b,c,d,w[9],4,0xd9d4d039);   d=hh(d,a,b,c,w[12],11,0xe6db99e5);
    c=hh(c,d,a,b,w[15],16,0x1fa27cf8);  b=hh(b,c,d,a,w[2],23,0xc4ac5665);

    // Round 4
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

function sign(key: string, account = '', password = ''): string {
  const seed = SIGN_SEEDS[key];
  const raw = typeof seed === 'function' ? seed(account, password) : seed;
  return md5(raw);
}

// ── API Request ──

interface RequestOptions {
  params?: Record<string, string | number>;
  body?: any;
  token?: string;
  account?: string;
  password?: string;
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

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'lang': 'zh-cn',
    'v': '7.0.3',
    'p': '1',
    't': String(Math.floor(Date.now() / 1000)),
    'sign': sign(signKey, opts.account || '', opts.password || ''),
    'authcode': opts.token ? `HH ${opts.token}` : 'HH ',
  };

  const fetchOpts: RequestInit = {
    method,
    headers,
  };

  if (opts.body) {
    fetchOpts.body = JSON.stringify(opts.body);
  }

  try {
    const resp = await fetch(url, fetchOpts);
    const text = await resp.text();
    try {
      return JSON.parse(text) as ApiResponse;
    } catch {
      return { code: resp.status, message: `Non-JSON response (${resp.status}): ${text.substring(0, 200)}` };
    }
  } catch (e: any) {
    return { code: -1, message: e.message || 'Network error' };
  }
}

// ── Token Management ──

const TOKEN_KV_KEY = 'apm_admin_token';

async function tryLogin(
  env: Env,
  signKey: string,
  endpoints: string[]
): Promise<string | null> {
  const account = env.APM_ACCOUNT;
  const password = env.APM_PASSWORD;
  const pwdMd5 = md5(password);

  for (const path of endpoints) {
    const resp = await apiRequest(env, 'POST', path, signKey, {
      body: { account, password: pwdMd5 },
      account,
      password,
    });

    const token = resp.result?.token || (resp as any).token;
    if (token) return token;
  }
  return null;
}

async function doLogin(env: Env): Promise<string | null> {
  // Try admin login
  const adminPaths = [
    '/mem/admin/m_loginbyadmin',
    '/mem/admin/m_login',
    '/mem/admin/login',
  ];
  let token = await tryLogin(env, 'admin_login', adminPaths);

  // Fallback to user login
  if (!token) {
    const userPaths = [
      '/mem/app/m_login',
      '/mem/app/login',
      '/mem/app/m_userlogin',
    ];
    token = await tryLogin(env, 'login', userPaths);
  }

  if (!token) return null;

  // Cache to KV (23 hours TTL)
  const cache: TokenCache = {
    token,
    expire: Date.now() + 23 * 3600 * 1000,
  };

  try {
    await env.TOKEN_CACHE.put(TOKEN_KV_KEY, JSON.stringify(cache), {
      expirationTtl: 23 * 3600,
    });
  } catch {
    // KV write failure is non-fatal
  }

  return token;
}

export async function getToken(env: Env): Promise<string> {
  // Check KV cache
  try {
    const cached = await env.TOKEN_CACHE.get(TOKEN_KV_KEY);
    if (cached) {
      const data: TokenCache = JSON.parse(cached);
      if (Date.now() < data.expire - 60000) {
        return data.token;
      }
    }
  } catch {
    // Cache miss
  }

  // Auto-login
  const token = await doLogin(env);
  if (token) return token;

  // Fallback: use pre-configured token
  if (env.APM_TOKEN) {
    console.log('Using pre-configured APM_TOKEN as fallback');
    return env.APM_TOKEN;
  }

  throw new Error('Login failed and no APM_TOKEN configured');
}
