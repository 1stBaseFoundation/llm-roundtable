import { useCallback, useRef } from 'react';

export interface SSEMessage {
  type: 'agent_start' | 'token' | 'agent_complete' | 'round_complete' | 'debate_complete' | 'error';
  data: {
    agentId?: string;
    agentName?: string;
    round?: number;
    token?: string;
    message?: string;
    fullResponse?: string;
    transcript?: unknown;
  };
}

export interface UseSSEOptions {
  onAgentStart?: (agentId: string, agentName: string, round: number) => void;
  onToken?: (agentId: string, token: string) => void;
  onAgentComplete?: (agentId: string, fullResponse: string) => void;
  onRoundComplete?: (round: number) => void;
  onDebateComplete?: (transcript: unknown) => void;
  onError?: (message: string) => void;
}

export function useSSE(options: UseSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback((query: string, rounds: number = 2, selectedAgents?: string[]) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create POST request body
    fetch('/api/debate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, rounds, selectedAgents }),
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processLine = (line: string) => {
        if (line.startsWith('event: ')) {
          return; // Event type line, skip for now
        }
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed: SSEMessage['data'] = JSON.parse(data);
            
            // Determine event type and call appropriate handler
            if (parsed.token && parsed.agentId) {
              options.onToken?.(parsed.agentId, parsed.token);
            } else if (parsed.fullResponse && parsed.agentId) {
              options.onAgentComplete?.(parsed.agentId, parsed.fullResponse);
            } else if (parsed.transcript) {
              options.onDebateComplete?.(parsed.transcript);
            } else if (parsed.message?.includes('Round') && parsed.round) {
              options.onRoundComplete?.(parsed.round);
            } else if (parsed.agentId && parsed.agentName && parsed.round) {
              options.onAgentStart?.(parsed.agentId, parsed.agentName, parsed.round);
            } else if (parsed.message?.includes('Error')) {
              options.onError?.(parsed.message);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      };

      const readChunk = (): Promise<void> | void => {
        if (!reader) return;
        
        return reader.read().then(({ done, value }) => {
          if (done) return;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          lines.forEach(processLine);

          return readChunk();
        });
      };

      return readChunk();
    }).catch((error) => {
      options.onError?.(error.message);
    });
  }, [options]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  return { connect, disconnect };
}