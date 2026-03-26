#!/usr/bin/env node
/**
 * APM Zoom Goods Query — MCP Server
 *
 * Provides tools to search and query Korean fashion goods
 * from the APM Zoom platform via skiil.apmzoom.ai API.
 *
 * Usage:
 *   node mcp-server.js
 *
 * Claude Code config (~/.claude/settings.json):
 *   {
 *     "mcpServers": {
 *       "apm-goods": {
 *         "command": "node",
 *         "args": ["/path/to/mcp-server.js"]
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = "https://skiil.apmzoom.ai";

async function apiCall(path) {
  const resp = await fetch(`${API_BASE}${path}`);
  return resp.json();
}

const server = new McpServer({
  name: "apm-goods-query",
  version: "0.4.0",
});

// Tool: search_goods
server.tool(
  "search_goods",
  "Search Korean fashion goods from APM Zoom (27K+ items). Returns goods with name, price, stock, store, and image URLs.",
  {
    keyword: z.string().default("").describe("Search keyword (e.g. 'T恤', '夹克', '连衣裙')"),
    page: z.number().default(1).describe("Page number"),
    limit: z.number().default(20).describe("Items per page (max 200)"),
    is_sell: z.number().default(-1).describe("Filter: 1=selling, 0=pending, -1=all"),
  },
  async ({ keyword, page, limit, is_sell }) => {
    const params = new URLSearchParams({
      q: keyword, page: String(page), limit: String(limit), is_sell: String(is_sell),
    });
    const data = await apiCall(`/api/goods?${params}`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// Tool: get_goods_detail
server.tool(
  "get_goods_detail",
  "Get detailed information for a specific goods item by ID, including images and pricing.",
  {
    goods_id: z.number().describe("The goods ID to look up"),
  },
  async ({ goods_id }) => {
    const data = await apiCall(`/api/goods/${goods_id}`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// Tool: list_categories
server.tool(
  "list_categories",
  "List all goods categories from APM Zoom (女装, 男装, 童装, 鞋包饰品, 男女通用) with subcategory tree.",
  {},
  async () => {
    const data = await apiCall("/api/categories");
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
