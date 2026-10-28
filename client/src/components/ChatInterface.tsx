import React, { useState, useCallback, useEffect } from 'react';
import { useSSE } from '../hooks/useSSE';
import { AgentPanel } from './AgentPanel';
import { HistoryPanel } from './HistoryPanel';
import { ArtifactPanel } from './ArtifactPanel';

interface Agent {
  id: string;
  name: string;
  model: string;
  order: number;
  available?: boolean;
}

interface AgentResponse {
  agentId: string;
  agentName: string;
  response: string;
  round: number;
  isActive: boolean;
}

export const ChatInterface: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [isDebating, setIsDebating] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [agentResponses, setAgentResponses] = useState<AgentResponse[]>([]);
  const [_activeAgent, setActiveAgent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [artifact, setArtifact] = useState<string>('');
  const [activeAgentName, setActiveAgentName] = useState<string | null>(null);

  // Fetch available agents on mount
  useEffect(() => {
    fetch('/api/agents')
      .then((res) => res.json())
      .then((data: Agent[]) => {
        setAgents(data);
        // Pre-select all available agents
        const availableAgents = data.filter((a) => a.available !== false);
        setSelectedAgents(new Set(availableAgents.map((a) => a.id)));
      })
      .catch((err) => console.error('Failed to fetch agents:', err));
  }, []);

  const toggleAgent = (agentId: string) => {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  };

  const initializeResponses = useCallback(() => {
    const selected = agents.filter((a) => selectedAgents.has(a.id));
    return selected.map((agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      response: '',
      round: 1,
      isActive: false,
    }));
  }, [agents, selectedAgents]);

  const handleAgentStart = useCallback((agentId: string, agentName: string, round: number) => {
    setActiveAgent(agentId);
    setActiveAgentName(agentName);
    setAgentResponses((prev) => {
      const existing = prev.find((a) => a.agentId === agentId && a.round === round);
      if (existing) {
        return prev.map((a) =>
          a.agentId === agentId && a.round === round
            ? { ...a, isActive: true }
            : a
        );
      }
      return [
        ...prev.map((a) => ({ ...a, isActive: false })),
        { agentId, agentName, response: '', round, isActive: true },
      ];
    });
  }, []);

  const handleToken = useCallback((agentId: string, token: string) => {
    setAgentResponses((prev) =>
      prev.map((a) =>
        a.agentId === agentId && a.isActive
          ? { ...a, response: a.response + token }
          : a
      )
    );
    // Update artifact in real-time as the active agent generates content
    setArtifact((prev) => {
      // Find the active agent's current response
      const activeResponse = agentResponses.find((a) => a.agentId === agentId && a.isActive);
      if (activeResponse) {
        return activeResponse.response + token;
      }
      return prev + token;
    });
  }, [agentResponses]);

  const handleAgentComplete = useCallback((agentId: string, fullResponse: string) => {
    setAgentResponses((prev) =>
      prev.map((a) =>
        a.agentId === agentId ? { ...a, isActive: false } : a
      )
    );
    // Update artifact with the complete response
    setArtifact(fullResponse);
    setActiveAgent(null);
    setActiveAgentName(null);
  }, []);

  const handleRoundComplete = useCallback((round: number) => {
    setCurrentRound(round);
  }, []);

  const handleDebateComplete = useCallback(() => {
    setIsDebating(false);
    setActiveAgent(null);
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
    setIsDebating(false);
    setActiveAgent(null);
  }, []);

  const { connect } = useSSE({
    onAgentStart: handleAgentStart,
    onToken: handleToken,
    onAgentComplete: handleAgentComplete,
    onRoundComplete: handleRoundComplete,
    onDebateComplete: handleDebateComplete,
    onError: handleError,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isDebating || selectedAgents.size === 0) return;

    setError(null);
    setIsDebating(true);
    setCurrentRound(1);
    setAgentResponses(initializeResponses());
    connect(query.trim(), 2, Array.from(selectedAgents));
  };

  const handleClear = () => {
    setQuery('');
    setAgentResponses([]);
    setCurrentRound(0);
    setError(null);
    setArtifact('');
    setActiveAgentName(null);
  };

  const availableAgents = agents.filter((a) => a.available !== false);
  const selectedCount = selectedAgents.size;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>🪑 LLM Round Table</h1>
          <button
            onClick={() => setShowHistory(true)}
            style={styles.historyButton}
            title="View History"
          >
            📋 History
          </button>
        </div>
        <p style={styles.subtitle}>
          Multi-Agent Debate System • 2 Rounds • {selectedCount} Model{selectedCount !== 1 ? 's' : ''} Selected
        </p>
      </header>

      {showHistory && (
        <HistoryPanel
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Agent Selection */}
      <div style={styles.agentSelection}>
        <h3 style={styles.selectionTitle}>Select Agents:</h3>
        <div style={styles.agentToggles}>
          {availableAgents.map((agent) => (
            <label
              key={agent.id}
              style={{
                ...styles.agentToggle,
                ...(selectedAgents.has(agent.id) ? styles.agentToggleActive : {}),
              }}
            >
              <input
                type="checkbox"
                checked={selectedAgents.has(agent.id)}
                onChange={() => toggleAgent(agent.id)}
                disabled={isDebating}
                style={styles.checkbox}
              />
              <span style={styles.agentToggleName}>{agent.name}</span>
            </label>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query for the round table..."
          style={styles.textarea}
          disabled={isDebating}
          rows={4}
        />
        <div style={styles.buttonGroup}>
          <button
            type="submit"
            disabled={!query.trim() || isDebating || selectedAgents.size === 0}
            style={{
              ...styles.button,
              ...styles.primaryButton,
              opacity: !query.trim() || isDebating || selectedAgents.size === 0 ? 0.5 : 1,
            }}
          >
            {isDebating ? 'Debating...' : 'Start Debate'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            style={{ ...styles.button, ...styles.secondaryButton }}
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div style={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {currentRound > 0 && (
        <div style={styles.roundIndicator}>
          <span style={styles.roundLabel}>Current Round:</span>
          <span style={styles.roundNumber}>{currentRound} / 2</span>
        </div>
      )}

      {/* Split Layout: Discussion Left | Artifact Right */}
      <div style={styles.splitContainer}>
        {/* Left: Agent Discussion */}
        <div style={styles.discussionColumn}>
          <h3 style={styles.columnTitle}>💬 Agent Discussion</h3>
          <div style={styles.agentsContainer}>
            {agentResponses.map((agent) => (
              <AgentPanel
                key={`${agent.agentId}-${agent.round}`}
                agentId={agent.agentId}
                agentName={agent.agentName}
                isActive={agent.isActive}
                response={agent.response}
                round={agent.round}
              />
            ))}
          </div>
        </div>

        {/* Right: Shared Document Artifact */}
        <div style={styles.artifactColumn}>
          <ArtifactPanel
            artifact={artifact}
            isStreaming={isDebating}
            currentAgentName={activeAgentName}
          />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1750px',
    margin: '0 auto',
    padding: '24px',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '8px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    margin: 0,
    color: 'var(--text-primary)',
  },
  historyButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  agentSelection: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid var(--border-color)',
  },
  selectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px',
    color: 'var(--text-secondary)',
  },
  agentToggles: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  agentToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '1px solid var(--border-color)',
    transition: 'all 0.2s ease',
  },
  agentToggleActive: {
    backgroundColor: 'var(--accent-phi)',
    borderColor: 'var(--accent-phi)',
  },
  agentToggleName: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  form: {
    marginBottom: '24px',
  },
  textarea: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    resize: 'vertical',
    fontFamily: 'inherit',
    marginBottom: '12px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
  },
  button: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  primaryButton: {
    backgroundColor: 'var(--accent-phi)',
    color: '#000',
  },
  secondaryButton: {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  },
  error: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    border: '1px solid var(--error)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    color: 'var(--error)',
  },
  roundIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
  },
  roundLabel: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  roundNumber: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  splitContainer: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
  },
  discussionColumn: {
    flex: '1 1 55%',
    minWidth: '0',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '70vh',
    overflow: 'hidden',
  },
  columnTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '12px',
    color: 'var(--text-secondary)',
  },
  artifactColumn: {
    flex: '1 1 45%',
    minWidth: '0',
    position: 'sticky',
    top: '24px',
    maxHeight: '70vh',
    overflow: 'hidden',
  },
  agentsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: '1 1 auto',
    maxHeight: '100%',
    overflowY: 'auto',
    paddingRight: '8px',
  },
};
