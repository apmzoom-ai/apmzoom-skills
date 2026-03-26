#!/usr/bin/env python3
"""
APM Zoom Goods Query CLI (v3 — Pure API)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
All data fetched from APM Zoom remote API. No local DB, no local LLM.

Usage:
    python3 apm-goods-query.py search "蓝色T恤"
    python3 apm-goods-query.py list [--category T恤] [--page 1] [--limit 20]
    python3 apm-goods-query.py detail <goods_id>
    python3 apm-goods-query.py categories [--flat]
    python3 apm-goods-query.py origins
"""

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
import urllib.parse

# ──────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────

API_BASE = os.environ.get("APM_API_BASE", "https://44k2t5n59e.execute-api.ap-northeast-2.amazonaws.com")
TOKEN_CACHE = "/tmp/.apm_admin_token.json"

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

    if not account or not password:
        print("[ERROR] APM_ACCOUNT / APM_PASSWORD 环境变量未设置", file=sys.stderr)
        return None

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
        with open(TOKEN_CACHE, "w") as f:
            json.dump(cache, f)
    except:
        pass
    return token


def get_admin_token():
    """Get cached admin token, auto-login if expired."""
    if os.path.exists(TOKEN_CACHE):
        try:
            with open(TOKEN_CACHE) as f:
                cache = json.load(f)
            if time.time() < cache.get("expire", 0) - 60:
                return cache["token"]
        except:
            pass

    # Auto-login
    print("🔑 Token 过期，正在重新登录...", file=sys.stderr)
    token = _do_login()
    if token:
        print("✅ 登录成功，token 已缓存", file=sys.stderr)
        return token

    print("[ERROR] 自动登录失败。请设置 APM_ACCOUNT 和 APM_PASSWORD 环境变量", file=sys.stderr)
    sys.exit(1)


# ──────────────────────────────────────────────
# Commands
# ──────────────────────────────────────────────

def cmd_search(args):
    """Search goods via API with keyword and filters."""
    token = get_admin_token()
    query = args.query
    page = getattr(args, "page", 1) or 1
    limit = getattr(args, "limit", 20) or 20

    # Parse natural language filters
    filters = _parse_search_query(query)

    params = {
        "page": page, "page_size": limit,
        "merchant_store_id": -1, "publish_user_id": -1, "publish_type_id": -1,
        "audit_state": -1, "currency_type_id": -1,
        "first_goods_class_id": -1, "second_goods_class_id": -1, "third_goods_class_id": -1,
        "db_mark": 2026, "start_time": -1, "end_tiem": -1,
        "make_address_id": -1, "is_sell": -1,
        "goods_name": filters.get("keyword", query),
    }

    resp = api_request("GET", "/gds/admin/goodslist", "admin_list", params=params, token=token)

    if resp.get("code") not in (100, 200, None):
        print(f"[ERROR] {resp.get('message', 'Unknown error')}", file=sys.stderr)
        sys.exit(1)

    items = resp.get("result", {}).get("data", [])
    total = resp.get("result", {}).get("total", 0)

    print(f"🔍 搜索: \"{query}\" | 共 {total} 件，显示 {len(items)} 件\n")

    if not items:
        print("   未找到匹配商品。")
        return

    print(f"{'#':>3} {'ID':<10} {'名称':<25} {'品类':<8} {'价格':>10} {'库存':>5} {'店铺':<22}")
    print("-" * 90)
    for i, g in enumerate(items, 1):
        name = (g.get("goods_name", "") or "")[:22]
        cat = (g.get("goods_class_name", "") or "")[:7]
        price = g.get("sale_price", 0)
        stock = g.get("stock_count", 0)
        store = (g.get("store_name", "") or "")[:20]
        gid = g.get("goods_id", "")
        print(f"{i:>3} {gid:<10} {name:<25} {cat:<8} ₩{price:>8,.0f} {stock:>5} {store:<22}")

    # Show images for top 3
    print(f"\n📷 Top 3 商品图片:")
    for g in items[:3]:
        img = g.get("goods_big_img", "") or g.get("goods_thumb_img", "")
        print(f"   [{g.get('goods_id')}] {img}")


def cmd_list(args):
    """List goods via API with filters."""
    token = get_admin_token()

    params = {
        "page": args.page, "page_size": args.limit,
        "merchant_store_id": -1, "publish_user_id": -1, "publish_type_id": -1,
        "audit_state": -1, "currency_type_id": -1,
        "first_goods_class_id": -1, "second_goods_class_id": -1, "third_goods_class_id": -1,
        "db_mark": 2026, "start_time": -1, "end_tiem": -1,
        "make_address_id": -1,
        "is_sell": 1 if args.mark == "selling" else (0 if args.mark == "pending" else -1),
        "goods_name": args.keyword or "",
    }

    resp = api_request("GET", "/gds/admin/goodslist", "admin_list", params=params, token=token)

    if resp.get("code") not in (100, 200, None):
        print(f"[ERROR] {resp.get('message', 'Unknown error')}", file=sys.stderr)
        sys.exit(1)

    items = resp.get("result", {}).get("data", [])
    total = resp.get("result", {}).get("total", 0)

    print(f"--- 商品列表 | 共 {total:,} 件，显示 {len(items)} 件 (第{args.page}页) ---\n")

    if args.fmt == "json":
        print(json.dumps(items, ensure_ascii=False, indent=2))
    else:
        print(f"{'#':>3} {'ID':<10} {'名称':<25} {'品类':<8} {'价格':>10} {'库存':>5} {'店铺':<22}")
        print("-" * 90)
        for i, g in enumerate(items, 1):
            name = (g.get("goods_name", "") or "")[:22]
            cat = (g.get("goods_class_name", "") or "")[:7]
            price = g.get("sale_price", 0)
            stock = g.get("stock_count", 0)
            store = (g.get("store_name", "") or "")[:20]
            gid = g.get("goods_id", "")
            print(f"{i:>3} {gid:<10} {name:<25} {cat:<8} ₩{price:>8,.0f} {stock:>5} {store:<22}")


def cmd_detail(args):
    """Get goods detail via API."""
    token = get_admin_token()

    # Query by goods_id
    params = {
        "page": 1, "page_size": 1,
        "merchant_store_id": -1, "publish_user_id": -1, "publish_type_id": -1,
        "audit_state": -1, "currency_type_id": -1,
        "first_goods_class_id": -1, "second_goods_class_id": -1, "third_goods_class_id": -1,
        "db_mark": 2026, "start_time": -1, "end_tiem": -1,
        "make_address_id": -1, "is_sell": -1, "goods_name": "",
        "goods_id": args.goods_id,
    }

    resp = api_request("GET", "/gds/admin/goodslist", "admin_list", params=params, token=token)
    items = resp.get("result", {}).get("data", [])

    if not items:
        print(f"[ERROR] 商品 ID {args.goods_id} 未找到", file=sys.stderr)
        sys.exit(1)

    g = items[0]
    print(f"--- 商品详情 (ID: {g.get('goods_id')}) ---\n")
    fields = [
        ("goods_id", "ID"), ("goods_name", "名称"), ("goods_sn", "货号"),
        ("goods_class_name", "品类"), ("sale_price", "售价"),
        ("discount_percent", "折扣"), ("stock_count", "库存"),
        ("store_name", "店铺"), ("is_sell", "在售"),
        ("add_time", "上架时间"),
    ]
    for key, label in fields:
        val = g.get(key)
        if val is not None and val != "":
            print(f"  {label:<10}: {val}")

    thumb = g.get("goods_thumb_img", "")
    big = g.get("goods_big_img", "")
    if thumb:
        print(f"  {'缩略图':<10}: {thumb}")
    if big:
        print(f"  {'大图':<10}: {big}")


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
# Search query parser (keyword-based, no LLM)
# ──────────────────────────────────────────────

def _parse_search_query(query):
    """Parse natural language query into filters."""
    CATEGORIES = ["T恤", "上衣", "夹克", "休闲裤", "衬衫", "短裙", "连衣裙", "开衫", "牛仔裤",
                  "吊带", "背心", "外套", "大衣", "风衣", "棉服", "羽绒服", "西装", "马甲",
                  "卫衣", "针织衫", "毛衣", "半裙", "长裤", "短裤", "裙子", "套装", "西裤"]
    COLORS = {"白": "白", "黑": "黑", "蓝": "蓝", "红": "红", "灰": "灰", "粉": "粉", "棕": "棕",
              "绿": "绿", "米": "米", "紫": "紫", "卡其": "卡其", "黄": "黄", "橙": "橙", "驼": "驼"}

    filters = {"keyword": query, "category": None, "color": None}

    for cat in CATEGORIES:
        if cat in query:
            filters["category"] = cat
            filters["keyword"] = query.replace(cat, "").strip()
            break

    for kw, color in COLORS.items():
        if kw in query:
            filters["color"] = color
            filters["keyword"] = filters["keyword"].replace(kw, "").strip() or query
            break

    return filters


# ──────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(prog="apm-goods-query",
        description="APM Zoom Goods Query CLI v3 — Pure API, no local DB.")
    sub = parser.add_subparsers(dest="command")

    # search
    p = sub.add_parser("search", help="Search goods by keyword")
    p.add_argument("query", help="Search query (e.g. '蓝色T恤')")
    p.add_argument("--page", type=int, default=1)
    p.add_argument("--limit", type=int, default=20)

    # list
    p = sub.add_parser("list", help="List goods with filters")
    p.add_argument("--keyword", help="Filter by keyword")
    p.add_argument("--mark", choices=["all", "selling", "pending"], default="all")
    p.add_argument("--page", type=int, default=1)
    p.add_argument("--limit", type=int, default=20)
    p.add_argument("--format", dest="fmt", choices=["json", "table"], default="table")

    # detail
    p = sub.add_parser("detail", help="Show goods detail")
    p.add_argument("goods_id", type=int)

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
        "search": cmd_search,
        "list": cmd_list,
        "detail": cmd_detail,
        "categories": cmd_categories,
        "origins": cmd_origins,
    }[args.command](args)


if __name__ == "__main__":
    main()
