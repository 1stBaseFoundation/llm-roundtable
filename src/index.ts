import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createDebate } from './services/moderator';
import { SSEEventData } from './types';
import { loadHistory, getDebateById, deleteDebate, clearHistory, saveDebate } from './services/storage';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from client build
app.use(express.static('client/dist'));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debate endpoint with SSE streaming
app.post('/api/debate', async (req: Request, res: Response) => {
  const { query, rounds = 2, selectedAgents } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required and must be a string' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Helper to send SSE event
  const sendEvent = (event: string, data: SSEEventData) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const moderator = createDebate(query, rounds, selectedAgents);

    for await (const eventData of moderator.runDebate()) {
      // Determine event type based on data
      if (eventData.token) {
        sendEvent('token', eventData);
      } else if (eventData.fullResponse) {
        sendEvent('agent_complete', eventData);
      } else if (eventData.transcript) {
        // Save debate to history before sending complete event
        try {
          saveDebate(eventData.transcript);
        } catch (err) {
          console.error('Failed to save debate:', err);
        }
        sendEvent('debate_complete', eventData);
      } else if (eventData.message?.includes('Round')) {
        sendEvent('round_complete', eventData);
      } else if (eventData.agentId && !eventData.token) {
        sendEvent('agent_start', eventData);
      } else if (eventData.message?.includes('Error')) {
        sendEvent('error', eventData);
      }
    }

    res.end();
  } catch (error) {
    console.error('Debate error:', error);
    sendEvent('error', {
      message: error instanceof Error ? error.message : 'Unknown error during debate',
    });
    res.end();
  }
});

// Get available agents
app.get('/api/agents', (_req: Request, res: Response) => {
  const { AGENTS } = require('./config/agents');
  res.json(AGENTS);
});

// Get debate history
app.get('/api/history', (_req: Request, res: Response) => {
  try {
    const history = loadHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// Get single debate by ID
app.get('/api/history/:id', (req: Request, res: Response) => {
  try {
    const debate = getDebateById(req.params.id);
    if (!debate) {
      return res.status(404).json({ error: 'Debate not found' });
    }
    res.json(debate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load debate' });
  }
});

// Delete a debate
app.delete('/api/history/:id', (req: Request, res: Response) => {
  try {
    const success = deleteDebate(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Debate not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete debate' });
  }
});

// Clear all history
app.delete('/api/history', (_req: Request, res: Response) => {
  try {
    clearHistory();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// Serve React app for all other routes
app.get('*', (_req: Request, res: Response) => {
  res.sendFile('index.html', { root: 'client/dist' });
});

app.listen(PORT, () => {
  console.log(`🚀 LLM Round Table server running on http://localhost:${PORT}`);
  console.log(`📡 SSE endpoint: POST /api/debate`);
  console.log(`🏥 Health check: GET /api/health`);
});