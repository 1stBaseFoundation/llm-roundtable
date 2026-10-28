// TypeScript type definitions for the LLM Round Table system

export interface Agent {
  id: string;
  name: string;
  model: string;
  order: number;
  available?: boolean; // Whether the model is available for selection
}

export interface DebateRequest {
  query: string;
  rounds?: number; // Default: 2
  selectedAgents?: string[]; // Agent IDs to include in debate
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  agentName?: string;
  timestamp: Date;
}

export interface Transcript {
  id: string;
  query: string;
  rounds: number;
  currentRound: number;
  currentAgentIndex: number;
  messages: Message[];
  artifact: string; // The shared document being collaboratively edited
  createdAt: Date;
  status: 'pending' | 'streaming' | 'complete' | 'error';
}

// Context management constants
export const CONTEXT_LIMITS = {
  MAX_ARTIFACT_LENGTH: 8000, // Characters - keeps context manageable
  MAX_RESPONSE_LENGTH: 4000, // Characters per LLM response
  TRUNCATION_WARNING: '... [truncated for context limits]',
};

export interface SSEEvent {
  type: 'agent_start' | 'token' | 'agent_complete' | 'round_complete' | 'debate_complete' | 'error';
  data: SSEEventData;
}

export interface SSEEventData {
  agentId?: string;
  agentName?: string;
  round?: number;
  token?: string;
  message?: string;
  fullResponse?: string;
  transcript?: Transcript;
}

export interface GenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
}

export interface OllamaStreamChunk {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}