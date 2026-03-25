# APM Zoom Skills

[Claude Code](https://claude.ai/claude-code) Skills for the APM Zoom e-commerce platform.

## Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| [apm-goods-query](./apm-goods-query/) | `/apm-goods` | Search and AI-analyze 27K+ goods (SQLite + Qwen3-30B + minicpm-v Vision) |

## Installation

Copy the skill folder into your project's `.claude/skills/` directory:

```bash
git clone https://github.com/apmzoom-ai/apmzoom-skills.git
cp -r apmzoom-skills/apm-goods-query /path/to/your/project/.claude/skills/
```

## Environment Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `APM_OMLX_URL` | `http://localhost:8000` | Text LLM (Qwen3-30B via oMLX) |
| `APM_OLLAMA_URL` | `http://localhost:11434` | Vision LLM (minicpm-v via Ollama) |
| `APM_DB_PATH` | `./data/goods.db` | SQLite database path |

## License

MIT
