import React, { useState, useEffect } from 'react';

interface Message {
  role: string;
  content: string;
  agentId?: string;
  agentName?: string;
  timestamp: string;
}

interface SavedDebate {
  id: string;
  query: string;
  rounds: number;
  messages: Message[];
  finalArtifact: string;
  createdAt: string;
  completedAt: string;
}

interface HistoryPanelProps {
  onClose: () => void;
}

// Parse response to extract thinking and main content (case-insensitive)
function parseResponse(response: string): { thinking: string | null; content: string } {
  const completeMatch = response.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if (completeMatch) {
    const thinking = completeMatch[1].trim();
    const content = response.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim();
    return { thinking, content };
  }
  return { thinking: null, content: response };
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ onClose }) => {
  const [history, setHistory] = useState<SavedDebate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDebate, setExpandedDebate] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/history');
      if (!response.ok) throw new Error('Failed to load history');
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this debate?')) return;
    
    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
      setHistory(history.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear all history? This cannot be undone.')) return;
    
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear:', err);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.panel}>
          <div style={styles.loading}>Loading history...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>Chat History</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {history.length === 0 ? (
          <div style={styles.empty}>No debates saved yet</div>
        ) : (
          <>
            <div style={styles.actions}>
              <button onClick={handleClearAll} style={styles.clearButton}>
                Clear All History
              </button>
            </div>

            <div style={styles.list}>
              {history.map((debate) => (
                <div key={debate.id} style={styles.debateItem}>
                  <div 
                    style={styles.debateHeader}
                    onClick={() => setExpandedDebate(
                      expandedDebate === debate.id ? null : debate.id
                    )}
                  >
                    <div style={styles.debateInfo}>
                      <div style={styles.debateQuery}>
                        {debate.query.length > 80 
                          ? debate.query.substring(0, 80) + '...' 
                          : debate.query}
                      </div>
                      <div style={styles.debateMeta}>
                        {formatDate(debate.createdAt)} • {debate.messages.length} responses
                      </div>
                    </div>
                    <div style={styles.debateActions}>
                      <button
                        onClick={(e) => handleDelete(debate.id, e)}
                        style={styles.deleteButton}
                      >
                        Delete
                      </button>
                      <span style={styles.expandIcon}>
                        {expandedDebate === debate.id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {expandedDebate === debate.id && (
                    <div style={styles.debateContent}>
                      <div style={styles.querySection}>
                        <strong>Query:</strong>
                        <p style={styles.queryText}>{debate.query}</p>
                      </div>

                      {debate.finalArtifact && (
                        <div style={styles.artifactSection}>
                          <div style={styles.artifactHeader}>
                            <strong>📄 Final Document</strong>
                            <button
                              onClick={() => copyToClipboard(debate.finalArtifact)}
                              style={styles.copyButton}
                            >
                              Copy Document
                            </button>
                          </div>
                          <pre style={styles.artifactText}>{debate.finalArtifact}</pre>
                        </div>
                      )}

                      {debate.messages.map((msg, idx) => {
                        const { thinking, content } = parseResponse(msg.content);
                        return (
                          <div key={idx} style={styles.messageItem}>
                            <div style={styles.messageHeader}>
                              <span style={styles.agentName}>{msg.agentName}</span>
                              <button
                                onClick={() => copyToClipboard(msg.content)}
                                style={styles.copyButton}
                              >
                                Copy
                              </button>
                            </div>
                            {thinking && (
                              <details style={styles.thinkingDetails}>
                                <summary style={styles.thinkingSummary}>
                                  Thought Process
                                </summary>
                                <pre style={styles.thinkingText}>{thinking}</pre>
                              </details>
                            )}
                            <pre style={styles.messageContent}>{content}</pre>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  panel: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid var(--border-color)',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
  },
  error: {
    padding: '12px',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    color: 'var(--error)',
    margin: '16px',
    borderRadius: '8px',
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
  },
  actions: {
    padding: '8px 16px',
    borderBottom: '1px solid var(--border-color)',
  },
  clearButton: {
    padding: '8px 16px',
    backgroundColor: 'var(--error)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  debateItem: {
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '8px',
    marginBottom: '8px',
    overflow: 'hidden',
  },
  debateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    cursor: 'pointer',
  },
  debateInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  debateQuery: {
    fontWeight: 500,
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  debateMeta: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  debateActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  deleteButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    color: 'var(--error)',
    border: '1px solid var(--error)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  expandIcon: {
    color: 'var(--text-secondary)',
    fontSize: '12px',
  },
  debateContent: {
    padding: '12px',
    borderTop: '1px solid var(--border-color)',
  },
  querySection: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
  },
  queryText: {
    margin: '8px 0 0 0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  messageItem: {
    marginBottom: '12px',
    padding: '12px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  agentName: {
    fontWeight: 600,
    color: 'var(--accent-phi)',
  },
  copyButton: {
    padding: '4px 8px',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
  },
  thinkingDetails: {
    marginBottom: '8px',
  },
  thinkingSummary: {
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    fontSize: '12px',
  },
  thinkingText: {
    margin: '8px 0 0 0',
    padding: '8px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  messageContent: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  artifactSection: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    borderLeft: '3px solid var(--accent-phi)',
  },
  artifactHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  artifactText: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '14px',
    lineHeight: '1.6',
    maxHeight: '300px',
    overflowY: 'auto',
    paddingRight: '8px',
  },
};
