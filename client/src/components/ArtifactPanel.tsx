import React, { useMemo, useRef, useEffect } from 'react';

export interface ArtifactPanelProps {
  artifact: string;
  isStreaming: boolean;
  currentAgentName: string | null;
}

// Parse response to extract thinking and main content (case-insensitive)
function parseArtifact(content: string): { thinking: string | null; mainContent: string } {
  const completeMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if (completeMatch) {
    const thinking = completeMatch[1].trim();
    const mainContent = content.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim();
    return { thinking, mainContent };
  }
  
  // Check for active thinking (opening tag but no closing tag)
  const activeMatch = content.match(/<thinking>([\s\S]*)/i);
  if (activeMatch) {
    const thinking = activeMatch[1];
    const beforeThinking = content.split(/<thinking>/i)[0].trim();
    return { thinking, mainContent: beforeThinking };
  }
  
  return { thinking: null, mainContent: content };
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  artifact,
  isStreaming,
  currentAgentName,
}) => {
  const { thinking, mainContent } = useMemo(() => parseArtifact(artifact), [artifact]);
  const hasThinking = thinking !== null && thinking.length > 0;
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll artifact when streaming or when content updates
  useEffect(() => {
    if (!contentRef.current) return;
    // scroll to bottom so latest edits are visible
    contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }, [artifact, isStreaming]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📄 Shared Document</h2>
        {isStreaming && currentAgentName && (
          <div style={styles.streamingBadge}>
            <span style={styles.pulse}>●</span>
            <span>{currentAgentName} is editing...</span>
          </div>
        )}
      </div>

      {artifact.length === 0 && !isStreaming ? (
        <div style={styles.placeholder}>
          Document will appear here as agents collaborate...
        </div>
      ) : (
        <div style={styles.content} ref={contentRef}>
          {/* Show thinking in collapsible section */}
          {hasThinking && (
            <details style={styles.thinkingDetails}>
              <summary style={styles.thinkingSummary}>
                🧠 Agent Reasoning (click to expand)
              </summary>
              <pre style={styles.thinkingText}>{thinking}</pre>
            </details>
          )}

          {/* Main document content */}
          <pre style={styles.documentText}>{mainContent}</pre>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    marginBottom: '16px',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-tertiary)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
    color: 'var(--text-primary)',
  },
  streamingBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: 'var(--accent-phi)',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#000',
  },
  pulse: {
    animation: 'pulse 1s infinite',
  },
  placeholder: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  content: {
    padding: '16px',
    overflowY: 'auto',
    flex: 1,
    boxSizing: 'border-box',
    paddingRight: '8px',
  },
  thinkingDetails: {
    marginBottom: '16px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '8px',
    padding: '8px 12px',
  },
  thinkingSummary: {
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  thinkingText: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '6px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    borderLeft: '3px solid var(--accent-phi)',
    display: 'block',
    maxHeight: '160px',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  documentText: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'inherit',
    fontSize: '14px',
    lineHeight: '1.7',
    margin: 0,
    color: 'var(--text-primary)',
    display: 'block',
    maxHeight: '60vh',
    overflowY: 'auto',
    boxSizing: 'border-box',
    paddingRight: '8px',
  },
};