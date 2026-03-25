import type { Env, ApiResponse } from "./types";

type SignKey =
  | "login"
  | "goods_list"
  | "goods_detail"
  | "goods_sku"
  | "categories"
  | "origins"
  | "admin_list"
  | "admin_login";

const SIGN_SEEDS: Record<
  SignKey,
  string | ((account: string, password: string) => string)
> = {
  login: (a, p) => a + p + "ggfgffgfggf",
  goods_list: "jsm6y$dh3hjsb",
  goods_detail: "jsk0r$dh3hjsb",
  goods_sku: "jsk0enu@3hjsb",
  categories: "jskdn$dh3hjsb",
  origins: "js0ntu$wphjsb",
  admin_list: "jskdsfgsnss$dsaah3hjsb",
  admin_login: (a, p) => a + p + "sjpOkkmhm9ds",
};

async function md5(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function sign(
  key: SignKey,
  account = "",
  password = ""
): Promise<string> {
  const seed = SIGN_SEEDS[key];
  const raw = typeof seed === "function" ? seed(account, password) : seed;
  return md5(raw);
}

interface RequestOptions {
  params?: Record<string, string | number>;
  body?: unknown;
  token?: string;
  account?: string;
  password?: string;
}

export async function apiRequest<T = unknown>(
  env: Env,
  method: string,
  path: string,
  signKey: SignKey,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  let url = env.APM_API_BASE + path;
  if (options.params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(options.params)) {
      qs.set(k, String(v));
    }
    url += "?" + qs.toString();
  }

  const signVal = await sign(
    signKey,
    options.account ?? "",
    options.password ?? ""
  );
  const token = options.token ?? "";

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    lang: "zh-cn",
    v: "7.0.3",
    p: "1",
    t: String(Math.floor(Date.now() / 1000)),
    sign: signVal,
    authcode: `HH ${token}`,
  };

  const init: RequestInit = { method, headers };
  if (options.body) {
    init.body = JSON.stringify(options.body);
  }

  try {
    const resp = await fetch(url, init);
    return (await resp.json()) as ApiResponse<T>;
  } catch (e) {
    return { code: -1, message: String(e) };
  }
}

const TOKEN_KV_KEY = "apm_admin_token";

interface TokenCache {
  token: string;
  expire: number;
}

// In-memory token cache (per Worker instance)
let memoryTokenCache: TokenCache | null = null;

export async function getToken(env: Env): Promise<string> {
  const now = Date.now() / 1000;

  // 1. Check in-memory cache
  if (memoryTokenCache && now < memoryTokenCache.expire - 60) {
    return memoryTokenCache.token;
  }

  // 2. Check KV cache
  if (env.TOKEN_CACHE) {
    const cached = await env.TOKEN_CACHE.get<TokenCache>(TOKEN_KV_KEY, "json");
    if (cached && now < cached.expire - 60) {
      memoryTokenCache = cached;
      return cached.token;
    }
  }

  // 3. Try auto-login
  if (env.APM_PASSWORD) {
    const account = env.APM_ACCOUNT;
    const password = env.APM_PASSWORD;
    const pwdMd5 = await md5(password);

    const endpoints: Array<{ path: string; signKey: SignKey }> = [
      { path: "/mem/admin/m_loginbyadmin", signKey: "admin_login" },
      { path: "/mem/admin/m_login", signKey: "admin_login" },
      { path: "/mem/app/m_login", signKey: "login" },
      { path: "/mem/app/login", signKey: "login" },
    ];

    for (const ep of endpoints) {
      const resp = await apiRequest<{ token?: string }>(
        env,
        "POST",
        ep.path,
        ep.signKey,
        { body: { account, password: pwdMd5 }, account, password }
      );
      const token = resp.result?.token;
      if (token) {
        const cache: TokenCache = { token, expire: now + 23 * 3600 };
        memoryTokenCache = cache;
        if (env.TOKEN_CACHE) {
          await env.TOKEN_CACHE.put(TOKEN_KV_KEY, JSON.stringify(cache), {
            expirationTtl: 23 * 3600,
          });
        }
        return token;
      }
    }
  }

  // 4. Fallback to pre-configured token
  if (env.APM_TOKEN) {
    return env.APM_TOKEN;
  }

  throw new Error("No APM token available. Set APM_TOKEN or APM_PASSWORD.");
}
