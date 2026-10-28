# LLM Round Table - Multi-Agent Debate System

## Overview

A TypeScript-based multi-agent debate system that orchestrates multiple LLMs to collaboratively refine responses through structured rounds of discussion.

## Hardware Configuration

- **GPUs:** Dual 8GB AMD GPUs (16GB total)
- **Strategy:** Hot-loading with GPU alternation
- **Inference Engine:** Ollama (Vulkan support for AMD)

## Models

| Model | Ollama Tag | Size (Q4) | Context | Source |
|-------|------------|-----------|---------|--------|
| Phi-4 Mini Reasoning | `phi4-mini-reasoning:3.8b` | ~2.5GB | 128k | Microsoft |
| Qwen 3.5 | `qwen3.5:4b` | ~2.5GB | 128k | Alibaba |
| Granite 3.3 | `granite3.3:8b` | ~5GB | 128k | IBM |
| GLM-4 | `glm4:9b` | ~6GB | 128k | Zhipu AI |

**Total VRAM per round:** ~16GB (but only 2 models loaded at once)

## Architecture

### Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js |
| Language | TypeScript |
| Backend Framework | Express |
| Frontend | React |
| Inference | Ollama (local) |
| Streaming | Server-Sent Events (SSE) |
| State | In-memory (transcript array) |

### Project Structure

```
LLMRoundTable/
├── ARCHITECTURE.md          # This file
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts             # Express server entry point
│   ├── services/
│   │   └── moderator.ts     # Debate orchestration logic
│   ├── config/
│   │   └── agents.ts        # Model definitions & prompts
│   └── types/
│       └── index.ts         # TypeScript interfaces
├── client/                  # React frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── ChatInterface.tsx
│       │   ├── MessageStream.tsx
│       │   └── AgentPanel.tsx
│       └── hooks/
│           └── useSSE.ts    # SSE connection hook
└── .env.example             # Environment variables template
```

## Round Table Flow

### Round 1: Brainstorm

Each LLM receives the user query plus accumulated context from previous speakers.

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ LLM1 (Phi-4)                                                │
│ Input: User Query                                           │
│ Output: Initial proposal                                    │
└─────────────────────────────────────────────────────────────┘
    │
    ▼ (GPU0 → GPU1 hot-load)
┌─────────────────────────────────────────────────────────────┐
│ LLM2 (Qwen)                                                 │
│ Input: User Query + LLM1 Context                            │
│ Output: Enhanced proposal                                   │
└─────────────────────────────────────────────────────────────┘
    │
    ▼ (GPU1 → GPU0 hot-load)
┌─────────────────────────────────────────────────────────────┐
│ LLM3 (Granite)                                              │
│ Input: User Query + LLM1 + LLM2 Context                     │
│ Output: Further refined proposal                            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼ (GPU0 → GPU1 hot-load)
┌─────────────────────────────────────────────────────────────┐
│ LLM4 (GLM-4)                                                │
│ Input: User Query + LLM1 + LLM2 + LLM3 Context              │
│ Output: Consolidated proposal                               │
└─────────────────────────────────────────────────────────────┘
```

### Round 2: Refine & Consolidate

All four proposals are presented to each LLM for final refinement.

```
Full Transcript (User Query + 4 Proposals)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ LLM1 (Phi-4)                                                │
│ Input: Full transcript + "Refine and consolidate"           │
│ Output: Refined perspective                                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼ (Continue through LLM2, LLM3, LLM4)
    │
    ▼
Final Answer
```

## Hot-Loading Strategy

Ollama alternates between GPUs to minimize latency:

```
Timeline:
─────────────────────────────────────────────────────────────►

GPU0: [LLM1 generating] ─── [idle] ─── [LLM3 generating] ─── [idle]
GPU1:      [LLM2 loading] ─── [LLM2 generating] ─── [LLM4 loading] ─── [LLM4 generating]

Round 2:
GPU0: [LLM1 loading] ─── [LLM1 generating] ─── [idle] ─── [LLM3 generating]
GPU1:      [idle] ─── [LLM2 loading] ─── [LLM2 generating] ─── [LLM4 loading]
```

## API Endpoints

### `POST /api/debate`
Initiates a new debate session.

**Request:**
```json
{
  "query": "How should I structure my authentication system?",
  "rounds": 2
}
```

**Response:** SSE stream with events:
- `agent_start`: Agent begins generating
- `token`: Individual token from model
- `agent_complete`: Agent finished
- `round_complete`: All agents in round finished
- `debate_complete`: Full debate finished

### `GET /api/health`
Health check endpoint.

## System Prompt

All agents share the same role definition:

```
You are a collaborative AI assistant participating in a round-table discussion.
Your role is to provide your best-effort response and enhance the contributions 
of previous participants. Consider all perspectives presented, identify gaps, 
and build upon the collective knowledge to refine the solution.
```

## Context Management

- **Context Window:** 128k tokens per model
- **Transcript Storage:** In-memory JavaScript array
- **Context Bleed Mitigation:** Single-pass per round (no recursive debates)
- **Summarization:** Not required for planning tasks (128k sufficient)

## Development

### Prerequisites

- Node.js 18+
- Ollama installed and running
- Models pulled: `phi4-mini-reasoning:3.8b`, `qwen3.5:4b`, `granite3.3:8b`, `glm4:9b`

### Installation

```bash
# Backend
npm install

# Frontend
cd client && npm install

# Run development
npm run dev
```

### Environment Variables

```env
PORT=4000
OLLAMA_BASE_URL=http://localhost:11434
```

## Future Enhancements

- [ ] Persistent transcript storage (SQLite)
- [ ] Configurable number of rounds
- [ ] Model temperature/performance tuning
- [ ] WebSocket fallback for SSE
- [ ] Export debate transcript