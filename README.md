# 🪑 LLM Round Table

A TypeScript-based multi-agent debate system that orchestrates multiple LLMs to collaboratively refine responses through structured rounds of discussion.

## Features

- **4 Diverse Models**: Phi-4 Mini, Qwen 3.5, Granite 3.3, GLM-4
- **2-Round Debate**: Brainstorm → Refine & Consolidate
- **Real-time Streaming**: SSE-powered token-by-token output
- **React Frontend**: Modern, responsive chat interface
- **Hot-Loading Ready**: Optimized for dual-GPU setups

## Prerequisites

- Node.js 18+
- [Ollama](https://ollama.ai) installed and running
- Models pulled:
  ```bash
  ollama pull phi4-mini-reasoning:3.8b
  ollama pull qwen3.5:4b
  ollama pull granite3.3:8b
  ollama pull glm4:9b
  ```

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Copy environment file
cp .env.example .env

# Start both backend and frontend (single command)
npm run dev:all
```

- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:5173

Alternatively, run in separate terminals:
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
npm run dev:client
```

## Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Round 1: Brainstorm                                          │
│   Phi-4 → Qwen → Granite → GLM-4                            │
│   (Each receives accumulated context)                        │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Round 2: Refine & Consolidate                                │
│   Phi-4 → Qwen → Granite → GLM-4                            │
│   (Each sees all proposals, refines final answer)           │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Final Output
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/debate` | Start a debate (SSE stream) |
| GET | `/api/agents` | List available agents |
| GET | `/api/health` | Health check |

### POST /api/debate

**Request:**
```json
{
  "query": "Your question here",
  "rounds": 2
}
```

**Response:** SSE stream with events:
- `agent_start`: Agent begins generating
- `token`: Individual token from model
- `agent_complete`: Agent finished
- `round_complete`: Round finished
- `debate_complete`: Full debate finished

## Project Structure

```
LLMRoundTable/
├── src/                    # Backend (Express + TypeScript)
│   ├── index.ts           # Server entry point
│   ├── config/agents.ts   # Model definitions
│   ├── services/moderator.ts  # Debate orchestration
│   └── types/index.ts     # TypeScript interfaces
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ChatInterface.tsx
│   │   │   └── AgentPanel.tsx
│   │   └── hooks/useSSE.ts
│   └── dist/              # Production build
├── ARCHITECTURE.md        # Detailed architecture docs
└── package.json
```

## Configuration

Environment variables (`.env`):

```env
PORT=4000
OLLAMA_BASE_URL=http://localhost:11434
```

## Production Build

```bash
# Build backend
npm run build

# Build frontend
cd client && npm run build

# Start production server
npm start
```

## License

MIT