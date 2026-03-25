#!/usr/bin/env python3
"""
APM Zoom Goods Query CLI (v2)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Full-featured CLI for querying, searching, and AI-analyzing goods from APM Zoom.

Usage:
    python3 apm-goods-query.py search "蓝色T恤"              # AI natural language search
    python3 apm-goods-query.py list [--mark selling] [--category T恤] [--format table]
    python3 apm-goods-query.py detail <goods_id>
    python3 apm-goods-query.py analyze "给我一份T恤市场分析"    # LLM deep analysis
    python3 apm-goods-query.py sync                           # Sync all data from API
    python3 apm-goods-query.py stats                          # Quick DB stats
    python3 apm-goods-query.py categories / origins
"""

import argparse
import base64
import hashlib
import json
import os
import re
import sqlite3
import sys
import time
import urllib.request
import urllib.error
import urllib.parse

# ──────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────

# Resolve project root: walk up from src/ until we find data/goods.db or reach /
def _find_project_root():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(10):
        if os.path.exists(os.path.join(d, "data", "goods.db")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            break
        d = parent
    # Fallback: assume 3 levels up from src/ (skills/apm-goods-query/src -> project root)
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_DIR = _find_project_root()
DB_PATH = os.path.join(BASE_DIR, "data", "goods.db")
DATA_DIR = os.path.join(BASE_DIR, "data")

API_BASE = os.environ.get("APM_API_BASE", "https://44k2t5n59e.execute-api.ap-northeast-2.amazonaws.com")
OLLAMA_URL = os.environ.get("APM_OLLAMA_URL", "http://localhost:11434/api/chat")
OMLX_URL = os.environ.get("APM_OMLX_URL", "http://localhost:8000/v1/chat/completions")
OMLX_KEY = os.environ.get("APM_OMLX_KEY", "")
TOKEN_CACHE = "/tmp/.apm_token_cache.json"

DEFAULT_ACCOUNT = os.environ.get("APM_ACCOUNT", "")
DEFAULT_PASSWORD = os.environ.get("APM_PASSWORD", "")

SIGN_SEEDS = {
    "login":        lambda a, p: a + p + "ggfgffgfggf",
    "goods_list":   "jsm6y$dh3hjsb",
    "goods_detail": "jsk0r$dh3hjsb",
    "goods_sku":    "jsk0enu@3hjsb",
    "categories":   "jskdn$dh3hjsb",
    "origins":      "js0ntu$wphjsb",
    "admin_list":   "jskdsfgsnss$dsaah3hjsb",
    "admin_login":  lambda a, p: a + p + "sjpOkkmhm9ds",
}

ADMIN_TOKEN_FILE = "/tmp/.apm_admin_token.json"


# ──────────────────────────────────────────────
# Utilities
# ──────────────────────────────────────────────

def md5(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest().upper()


def sign(key: str, account="", password="") -> str:
    seed = SIGN_SEEDS[key]
    raw = seed(account, password) if callable(seed) else seed
    return md5(raw)


def api_request(method, path, sign_key, params=None, body=None,
                token="", account="", password=""):
    url = API_BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "lang": "zh-cn", "v": "7.0.3", "p": "1",
        "t": str(int(time.time())),
        "sign": sign(sign_key, account, password),
        "authcode": f"HH {token}" if token else "HH ",
    }

    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"code": e.code, "message": e.read().decode("utf-8", errors="replace")}
    except Exception as e:
        return {"code": -1, "message": str(e)}


def _try_login(account, password, sign_key, endpoints):
    """Try logging in via multiple API endpoints."""
    pwd_md5 = md5(password)
    for path in endpoints:
        body = {"account": account, "password": pwd_md5}
        resp = api_request("POST", path, sign_key,
                           body=body, account=account, password=password)
        token = resp.get("result", {}).get("token") or resp.get("token")
        if token:
            return token
    return None


def _do_login():
    """Login via API and cache the token."""
    account = DEFAULT_ACCOUNT
    password = DEFAULT_PASSWORD

    # Try admin login endpoints first
    admin_paths = [
        "/mem/admin/m_loginbyadmin",
        "/mem/admin/m_login",
        "/mem/admin/login",
    ]
    token = _try_login(account, password, "admin_login", admin_paths)

    # Fallback to regular user login
    if not token:
        user_paths = [
            "/mem/app/m_login",
            "/mem/app/login",
            "/mem/app/m_userlogin",
        ]
        token = _try_login(account, password, "login", user_paths)

    if not token:
        return None

    # Cache token
    try:
        cache = {"account": account, "token": token, "expire": time.time() + 23 * 3600}
        with open(ADMIN_TOKEN_FILE, "w") as f:
            json.dump(cache, f)
    except:
        pass
    return token


def get_admin_token():
    """Get cached admin token, auto-login if expired."""
    # Check admin token cache
    for cache_file in [ADMIN_TOKEN_FILE, TOKEN_CACHE]:
        if os.path.exists(cache_file):
            try:
                with open(cache_file) as f:
                    cache = json.load(f)
                if time.time() < cache.get("expire", 0) - 60:
                    return cache["token"]
            except:
                pass

    # Auto-login
    print("🔑 Token 过期，正在重新登录...")
    token = _do_login()
    if token:
        print("✅ 登录成功，token 已缓存")
        return token

    print("[ERROR] 自动登录失败。请手动获取 token 并写入:", file=sys.stderr)
    print(f'  echo \'{{"token":"YOUR_TOKEN","expire":9999999999}}\' > {ADMIN_TOKEN_FILE}', file=sys.stderr)
    sys.exit(1)


def get_db():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database not found: {DB_PATH}", file=sys.stderr)
        print(f"  Run: python3 {sys.argv[0]} sync", file=sys.stderr)
        sys.exit(1)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def llm_chat(prompt, model="Qwen3-30B-A3B-Instruct-2507-4bit-hub", max_tokens=2000):
    """Call local oMLX LLM."""
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.5,
    }).encode("utf-8")

    req = urllib.request.Request(OMLX_URL, data=body, headers={
        "Authorization": f"Bearer {OMLX_KEY}",
        "Content-Type": "application/json",
    }, method="POST")

    resp = urllib.request.urlopen(req, timeout=180)
    result = json.loads(resp.read())
    return result["choices"][0]["message"]["content"]


def vision_analyze(img_path_or_url):
    """Analyze image with local minicpm-v."""
    if img_path_or_url.startswith("http"):
        img_req = urllib.request.Request(img_path_or_url, headers={"User-Agent": "Mozilla/5.0"})
        img_data = urllib.request.urlopen(img_req, timeout=10).read()
    else:
        with open(img_path_or_url, "rb") as f:
            img_data = f.read()
    img_b64 = base64.b64encode(img_data).decode("utf-8")

    body = json.dumps({
        "model": "minicpm-v:8b",
        "messages": [{
            "role": "user",
            "content": '只回答JSON：{"color":"主色","style":"款式","pattern":"图案","score":评分1到10}',
            "images": [img_b64]
        }],
        "stream": False,
        "options": {"num_predict": 150}
    }).encode("utf-8")

    req = urllib.request.Request(OLLAMA_URL, data=body, headers={"Content-Type": "application/json"}, method="POST")
    resp = urllib.request.urlopen(req, timeout=30)
    answer = json.loads(resp.read())["message"]["content"]

    m = re.search(r'\{[^}]+\}', answer)
    return json.loads(m.group()) if m else {"raw": answer}


# ──────────────────────────────────────────────
# Commands
# ──────────────────────────────────────────────

def cmd_stats(args):
    conn = get_db()
    c = conn.cursor()
    total = c.execute("SELECT COUNT(*) FROM goods").fetchone()[0]
    cats = c.execute("SELECT COUNT(*) FROM categories").fetchone()[0]
    stores_n = c.execute("SELECT COUNT(*) FROM stores").fetchone()[0]
    vision_done = c.execute("SELECT COUNT(*) FROM goods WHERE vision_done=1").fetchone()[0]
    avg_price = c.execute("SELECT ROUND(AVG(price)) FROM goods").fetchone()[0]

    print(f"📊 APM Zoom 商品数据库")
    print(f"   总商品: {total:,}  |  品类: {cats}  |  店铺: {stores_n}")
    print(f"   均价: ₩{avg_price:,.0f}  |  视觉标注: {vision_done:,}/{total:,} ({vision_done/total*100:.1f}%)")

    print(f"\n   Top 10 品类:")
    for r in c.execute("SELECT name, count, ROUND(avg_price) FROM categories ORDER BY count DESC LIMIT 10"):
        print(f"     {r[1]:>5} | ₩{r[2]:>8,.0f} | {r[0]}")

    if vision_done > 0:
        print(f"\n   颜色分布 (已标注{vision_done}件):")
        for r in c.execute("SELECT color, COUNT(*) FROM goods WHERE vision_done=1 AND color!='' GROUP BY color ORDER BY COUNT(*) DESC LIMIT 10"):
            print(f"     {r[1]:>4} | {r[0]}")
    conn.close()


def cmd_list(args):
    conn = get_db()
    c = conn.cursor()

    sql = "SELECT * FROM goods WHERE 1=1"
    params = []

    if args.category:
        sql += " AND category LIKE ?"
        params.append(f"%{args.category}%")
    if args.color:
        sql += " AND color LIKE ?"
        params.append(f"%{args.color}%")
    if args.store:
        sql += " AND store LIKE ?"
        params.append(f"%{args.store}%")
    if args.min_price:
        sql += " AND price >= ?"
        params.append(args.min_price)
    if args.max_price:
        sql += " AND price <= ?"
        params.append(args.max_price)
    if args.mark == "selling":
        sql += " AND is_sell = 1"
    elif args.mark == "pending":
        sql += " AND is_sell = 0"

    sql += " ORDER BY id DESC LIMIT ?"
    params.append(args.limit)

    rows = c.execute(sql, params).fetchall()
    count_sql = sql.replace("SELECT *", "SELECT COUNT(*)").rsplit("LIMIT", 1)[0]
    total = c.execute(count_sql, params[:-1]).fetchone()[0]

    print(f"--- 商品列表 | 共 {total:,} 件，显示 {len(rows)} 件 ---\n")

    if args.fmt == "table":
        print(f"{'ID':<16} {'名称':<25} {'品类':<8} {'颜色':<6} {'价格':>10} {'库存':>5} {'店铺':<25}")
        print("-" * 100)
        for r in rows:
            name = (r["name"] or "")[:22]
            color = (r["color"] or "")[:5]
            print(f"{r['id']:<16} {name:<25} {r['category']:<8} {color:<6} ₩{r['price']:>8,.0f} {r['stock']:>5} {r['store'][:22]}")
    else:
        print(json.dumps([dict(r) for r in rows], ensure_ascii=False, indent=2))

    conn.close()


def _parse_search_query(query):
    """Parse natural language query into filters using keyword matching (no LLM)."""
    # Known categories
    CATEGORIES = ["T恤","上衣","夹克","休闲裤","衬衫","短裙","连衣裙","开衫","牛仔裤",
                  "吊带","背心","外套","大衣","风衣","棉服","羽绒服","西装","马甲",
                  "卫衣","针织衫","毛衣","半裙","长裤","短裤","裙子","套装","西裤"]
    COLORS = {"白":"白","黑":"黑","蓝":"蓝","红":"红","灰":"灰","粉":"粉","棕":"棕",
              "绿":"绿","米":"米","紫":"紫","卡其":"卡其","黄":"黄","橙":"橙","驼":"驼"}
    filters = {"category": None, "color": None, "min_price": None, "max_price": None, "limit": 20}

    # Match category
    for cat in CATEGORIES:
        if cat in query:
            filters["category"] = cat
            break

    # Match color
    for kw, color in COLORS.items():
        if kw in query:
            filters["color"] = color
            break

    # Match price patterns (supports 万/w)
    price_below = re.search(r'(\d+(?:\.\d+)?)\s*万?\s*以下', query)
    price_above = re.search(r'(\d+(?:\.\d+)?)\s*万?\s*以上', query)
    price_range = re.search(r'(\d+(?:\.\d+)?)\s*[~\-到]\s*(\d+(?:\.\d+)?)', query)

    def parse_price(s, context=""):
        v = float(s)
        if "万" in context or v < 1000:
            v = v * 10000
        return v

    if price_range:
        ctx = query[max(0,price_range.start()-2):price_range.end()+2]
        filters["min_price"] = parse_price(price_range.group(1), ctx)
        filters["max_price"] = parse_price(price_range.group(2), ctx)
    elif price_below:
        ctx = query[max(0,price_below.start()-2):price_below.end()+2]
        filters["max_price"] = parse_price(price_below.group(1), ctx)
    elif price_above:
        ctx = query[max(0,price_above.start()-2):price_above.end()+2]
        filters["min_price"] = parse_price(price_above.group(1), ctx)

    # Detect "高评分" / "好看"
    if "高评分" in query or "好看" in query or "高分" in query:
        filters["min_score"] = 7
    else:
        filters["min_score"] = None

    return filters


def cmd_search(args):
    """Keyword-based search with smart query parsing (no LLM required)."""
    query = args.query
    conn = get_db()
    c = conn.cursor()

    filters = _parse_search_query(query)
    print(f"🔍 搜索: \"{query}\"")
    print(f"   筛选条件: {json.dumps(filters, ensure_ascii=False)}")

    # Build SQL
    sql = "SELECT * FROM goods WHERE 1=1"
    params = []

    if filters.get("category"):
        sql += " AND category LIKE ?"
        params.append(f"%{filters['category']}%")
    if filters.get("color"):
        sql += " AND color LIKE ?"
        params.append(f"%{filters['color']}%")
    if filters.get("min_price"):
        sql += " AND price >= ?"
        params.append(filters["min_price"])
    if filters.get("max_price"):
        sql += " AND price <= ?"
        params.append(filters["max_price"])
    if filters.get("min_score"):
        sql += " AND look_score >= ?"
        params.append(filters["min_score"])

    limit = min(filters.get("limit", 20), 50)
    sql += " ORDER BY look_score DESC, id DESC LIMIT ?"
    params.append(limit)

    rows = c.execute(sql, params).fetchall()

    # Count total matches
    count_sql = sql.replace("SELECT *", "SELECT COUNT(*)").rsplit("LIMIT", 1)[0]
    total = c.execute(count_sql, params[:-1]).fetchone()[0]

    print(f"   匹配: {total:,} 件，显示前 {len(rows)} 件\n")

    if not rows:
        print("   未找到匹配商品。")
        conn.close()
        return

    print(f"{'#':>3} {'ID':<16} {'名称':<22} {'品类':<7} {'颜色':<6} {'评分':>4} {'价格':>10} {'店铺':<22}")
    print("-" * 100)
    for i, r in enumerate(rows, 1):
        name = (r["name"] or "")[:20]
        color = (r["color"] or "")[:5]
        score = r["look_score"] or 0
        print(f"{i:>3} {r['id']:<16} {name:<22} {r['category']:<7} {color:<6} {score:>4.0f} ₩{r['price']:>8,.0f} {r['store'][:20]}")

    # Show image URLs for top results
    print(f"\n📷 Top 3 商品图片:")
    for r in rows[:3]:
        print(f"   [{r['id']}] {r['big_img']}")

    conn.close()


def cmd_detail(args):
    conn = get_db()
    c = conn.cursor()
    r = c.execute("SELECT * FROM goods WHERE id=?", (args.goods_id,)).fetchone()
    if not r:
        print(f"[ERROR] Goods ID {args.goods_id} not found", file=sys.stderr)
        sys.exit(1)

    print(f"--- 商品详情 (ID: {r['id']}) ---\n")
    for key in ["id","name","sn","category","price","discount","stock","store","color","style","pattern","look_score","is_sell","added"]:
        val = r[key]
        if val is not None and val != "":
            print(f"  {key:<14}: {val}")
    print(f"  {'thumb':<14}: {r['thumb']}")
    print(f"  {'big_img':<14}: {r['big_img']}")

    if not r["vision_done"]:
        print(f"\n  ℹ️  视觉标注未完成")

    conn.close()


def cmd_analyze(args):
    """Data-driven analysis using pure SQL queries (no LLM)."""
    conn = get_db()
    c = conn.cursor()

    query = args.query
    print(f"📊 数据分析: \"{query}\"\n")

    # Overall stats
    total = c.execute("SELECT COUNT(*) FROM goods").fetchone()[0]
    total_selling = c.execute("SELECT COUNT(*) FROM goods WHERE is_sell=1").fetchone()[0]
    avg_price = c.execute("SELECT ROUND(AVG(price)) FROM goods").fetchone()[0]
    print(f"  总商品: {total:,} 件 | 在售: {total_selling:,} 件 | 均价: ₩{avg_price:,.0f}\n")

    # Category breakdown
    cats = c.execute("SELECT name, count, ROUND(avg_price), min_price, max_price FROM categories ORDER BY count DESC").fetchall()
    print(f"  品类分布 ({len(cats)} 个品类):")
    print(f"  {'品类':<10} {'数量':>6} {'均价':>12} {'最低价':>12} {'最高价':>12}")
    print("  " + "-" * 58)
    for r in cats[:20]:
        print(f"  {r[0]:<10} {r[1]:>6} ₩{r[2]:>10,.0f} ₩{r[3]:>10,.0f} ₩{r[4]:>10,.0f}")
    if len(cats) > 20:
        print(f"  ... 还有 {len(cats)-20} 个品类")

    # Top stores
    print()
    top_stores = c.execute("SELECT name, count, ROUND(avg_price) FROM stores ORDER BY count DESC LIMIT 15").fetchall()
    print(f"  Top 15 店铺:")
    print(f"  {'店铺':<30} {'商品数':>6} {'均价':>12}")
    print("  " + "-" * 52)
    for r in top_stores:
        print(f"  {r[0][:28]:<30} {r[1]:>6} ₩{r[2]:>10,.0f}")

    # Color distribution
    colors = c.execute("SELECT color, COUNT(*) FROM goods WHERE vision_done=1 AND color!='' GROUP BY color ORDER BY COUNT(*) DESC LIMIT 15").fetchall()
    if colors:
        tagged = c.execute("SELECT COUNT(*) FROM goods WHERE vision_done=1").fetchone()[0]
        print(f"\n  颜色分布 (已标注 {tagged:,} 件):")
        for r in colors:
            bar = "█" * min(int(r[1] / 10), 40)
            print(f"    {r[0]:<6} {r[1]:>5} {bar}")

    # Price distribution
    print(f"\n  价格区间分布:")
    ranges = [
        ("₩0~1万", 0, 10000),
        ("₩1~3万", 10000, 30000),
        ("₩3~5万", 30000, 50000),
        ("₩5~10万", 50000, 100000),
        ("₩10万+", 100000, 999999999),
    ]
    for label, lo, hi in ranges:
        cnt = c.execute("SELECT COUNT(*) FROM goods WHERE price>=? AND price<?", (lo, hi)).fetchone()[0]
        pct = cnt / total * 100 if total else 0
        bar = "█" * min(int(pct), 40)
        print(f"    {label:<10} {cnt:>6} ({pct:>5.1f}%) {bar}")

    conn.close()


def cmd_sync(args):
    """Sync all goods data from API to local DB."""
    os.makedirs(DATA_DIR, exist_ok=True)
    token = get_admin_token()
    sign_key = "admin_list"

    # Remove old DB for fresh sync
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE goods (
            id INTEGER PRIMARY KEY, name TEXT, sn TEXT, category TEXT,
            price REAL, discount REAL, stock INTEGER, store TEXT,
            thumb TEXT, big_img TEXT, source_img TEXT,
            is_sell INTEGER, audit INTEGER, added TEXT,
            color TEXT, style TEXT, pattern TEXT, look_score REAL, vision_done INTEGER DEFAULT 0
        );
        CREATE INDEX idx_category ON goods(category);
        CREATE INDEX idx_store ON goods(store);
        CREATE INDEX idx_price ON goods(price);
        CREATE INDEX idx_color ON goods(color);
        CREATE TABLE categories (name TEXT PRIMARY KEY, count INTEGER, avg_price REAL, min_price REAL, max_price REAL, store_count INTEGER);
        CREATE TABLE stores (name TEXT PRIMARY KEY, count INTEGER, avg_price REAL, cat_count INTEGER);
        CREATE TABLE sync_log (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT, total INTEGER, source TEXT);
    """)

    all_items = []
    page = 1
    start = time.time()
    print("🚀 同步商品数据...\n")

    while True:
        params = {
            "page": page, "page_size": 200,
            "merchant_store_id": -1, "publish_user_id": -1, "publish_type_id": -1,
            "audit_state": -1, "currency_type_id": -1,
            "first_goods_class_id": -1, "second_goods_class_id": -1, "third_goods_class_id": -1,
            "db_mark": 2026, "start_time": -1, "end_tiem": -1,
            "make_address_id": -1, "is_sell": -1, "goods_name": "",
        }
        resp = api_request("GET", "/gds/admin/goodslist", sign_key, params=params, token=token)
        items = resp.get("result", {}).get("data", [])
        total = resp.get("result", {}).get("total", 0)
        if not items:
            break

        for g in items:
            c.execute("""INSERT OR REPLACE INTO goods
                (id,name,sn,category,price,discount,stock,store,thumb,big_img,source_img,is_sell,audit,added)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (g.get("goods_id"), g.get("goods_name",""), g.get("goods_sn",""),
                 g.get("goods_class_name",""), g.get("sale_price",0), g.get("discount_percent",1),
                 g.get("stock_count",0), g.get("store_name",""),
                 g.get("goods_thumb_img",""), g.get("goods_big_img",""), g.get("goods_source_img",""),
                 g.get("is_sell",0), g.get("audit_state",0), g.get("add_time","")))

        all_items.extend(items)
        if page % 10 == 0:
            conn.commit()
            pct = len(all_items)/total*100 if total else 0
            print(f"  {len(all_items):>6}/{total} ({pct:.0f}%)")
        page += 1

    # Build stats tables
    cats, stores = {}, {}
    for g in all_items:
        cat = g.get("goods_class_name","")
        store = g.get("store_name","")
        cats.setdefault(cat, {"c":0,"t":0,"mn":float("inf"),"mx":0,"s":set()})
        cats[cat]["c"] += 1; cats[cat]["t"] += g.get("sale_price",0)
        cats[cat]["mn"] = min(cats[cat]["mn"], g.get("sale_price",0))
        cats[cat]["mx"] = max(cats[cat]["mx"], g.get("sale_price",0))
        cats[cat]["s"].add(store)
        stores.setdefault(store, {"c":0,"t":0,"cats":set()})
        stores[store]["c"] += 1; stores[store]["t"] += g.get("sale_price",0)
        stores[store]["cats"].add(cat)

    for n, d in cats.items():
        c.execute("INSERT INTO categories VALUES (?,?,?,?,?,?)", (n, d["c"], d["t"]/d["c"], d["mn"], d["mx"], len(d["s"])))
    for n, d in stores.items():
        c.execute("INSERT INTO stores VALUES (?,?,?,?)", (n, d["c"], d["t"]/d["c"], len(d["cats"])))

    c.execute("INSERT INTO sync_log (timestamp,total,source) VALUES (datetime('now'),?,'admin_api')", (len(all_items),))
    conn.commit()
    conn.close()

    elapsed = time.time() - start
    print(f"\n✅ 同步完成: {len(all_items):,} 件, {elapsed:.0f}s, {os.path.getsize(DB_PATH)/1024/1024:.1f}MB")


def cmd_categories(args):
    """List categories from API."""
    resp = api_request("GET", "/gds/app/m_goodsclasslist", "categories",
                       token=get_admin_token())
    if resp.get("code") != 100:
        print(f"[ERROR] {resp.get('message')}", file=sys.stderr)
        sys.exit(1)

    def print_tree(items, indent=0):
        for c in items:
            prefix = "  " * indent
            print(f"{prefix}{c['goods_class_id']:>4} | {c['goods_class_name']}")
            if c.get("ls_child"):
                print_tree(c["ls_child"], indent + 1)

    items = resp.get("result", [])
    print(f"--- 商品类别 ({len(items)} 顶级) ---\n")
    if hasattr(args, "flat") and args.flat:
        def flat(items, path=""):
            for c in items:
                cur = c["goods_class_name"] if not path else f"{path} > {c['goods_class_name']}"
                if not c.get("ls_child"):
                    print(f"  {c['goods_class_id']:>4} | {cur}")
                else:
                    flat(c["ls_child"], cur)
        flat(items)
    else:
        print_tree(items)


def cmd_origins(args):
    """List product origins from API."""
    resp = api_request("GET", "/gds/app/m_goodsmakeaddresslist", "origins",
                       token=get_admin_token())
    if resp.get("code") != 100:
        print(f"[ERROR] {resp.get('message')}", file=sys.stderr)
        sys.exit(1)
    items = resp.get("result", [])
    print(f"--- 产地 ({len(items)}) ---\n")
    for o in items:
        oid = o.get("address_id") or o.get("make_address_id", "")
        oname = o.get("address_name") or o.get("make_address_name", "")
        print(f"  {oid:>4} | {oname}")


# ──────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(prog="apm-goods-query",
        description="APM Zoom Goods Query CLI v2 - Search, analyze, and explore goods with AI.")
    sub = parser.add_subparsers(dest="command")

    # stats
    sub.add_parser("stats", help="Show database statistics")

    # list
    p = sub.add_parser("list", help="List goods with filters")
    p.add_argument("--category", help="Filter by category (e.g. T恤)")
    p.add_argument("--color", help="Filter by color (e.g. 蓝)")
    p.add_argument("--store", help="Filter by store name")
    p.add_argument("--min-price", type=float, help="Min price")
    p.add_argument("--max-price", type=float, help="Max price")
    p.add_argument("--mark", choices=["all","selling","pending"], default="all")
    p.add_argument("--limit", type=int, default=20)
    p.add_argument("--format", dest="fmt", choices=["json","table"], default="table")

    # search (AI)
    p = sub.add_parser("search", help="AI natural language search")
    p.add_argument("query", help="Natural language query (e.g. '蓝色T恤')")

    # detail
    p = sub.add_parser("detail", help="Show goods detail")
    p.add_argument("goods_id", type=int)

    # analyze (LLM)
    p = sub.add_parser("analyze", help="Deep analysis with local LLM")
    p.add_argument("query", help="Analysis question (e.g. '给我T恤市场分析')")

    # sync
    sub.add_parser("sync", help="Sync all data from API to local DB")

    # categories
    p = sub.add_parser("categories", help="List goods categories")
    p.add_argument("--flat", action="store_true")

    # origins
    sub.add_parser("origins", help="List product origins")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    {
        "stats": cmd_stats,
        "list": cmd_list,
        "search": cmd_search,
        "detail": cmd_detail,
        "analyze": cmd_analyze,
        "sync": cmd_sync,
        "categories": cmd_categories,
        "origins": cmd_origins,
    }[args.command](args)


if __name__ == "__main__":
    main()
