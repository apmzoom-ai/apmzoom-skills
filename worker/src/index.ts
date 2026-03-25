import type { Env } from "./lib/types";
import {
  handleSearch,
  handleList,
  handleDetail,
  handleCategories,
  handleOrigins,
  handleStats,
} from "./api/goods";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // API routes
      if (path === "/api/goods/search") {
        return handleSearch(request, env);
      }
      if (path === "/api/goods/list") {
        return handleList(request, env);
      }
      if (path === "/api/goods/categories") {
        return handleCategories(request, env);
      }
      if (path === "/api/goods/origins") {
        return handleOrigins(request, env);
      }
      if (path === "/api/goods/stats") {
        return handleStats(request, env);
      }

      // /api/goods/:id
      const detailMatch = path.match(/^\/api\/goods\/(\d+)$/);
      if (detailMatch) {
        return handleDetail(request, env, detailMatch[1]);
      }

      // Health check
      if (path === "/api/health") {
        return new Response(
          JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    } catch (e) {
      return new Response(
        JSON.stringify({ error: String(e) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
