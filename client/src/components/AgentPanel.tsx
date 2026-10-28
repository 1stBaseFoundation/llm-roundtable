import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';

export interface AgentPanelProps {
  agentId: string;
  agentName: string;
  isActive: boolean;
  response: string;
  round: number;
}

const agentColors: Record<string, string> = {
  phi4: 'var(--accent-phi)',
  qwen: 'var(--accent-qwen)',
  granite: 'var(--accent-granite)',
  glm4: 'var(--accent-glm)',
  nemotron: '#a78bfa', // Purple for Nemotron
};

// Parse response to extract thinking and main content
// Handles streaming: incomplete thinking tags, complete thinking blocks, case variations
function parseResponse(response: string): { 
  thinking: string | null; 
  content: string;
  isThinkingActive: boolean;
} {
  // Case-insensitive regex for complete thinking block
  const completeMatch = response.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if (completeMatch) {
    const thinking = completeMatch[1].trim();
    const content = response.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim();
    return { thinking, content, isThinkingActive: false };
  }
  
  // Case-insensitive regex for active thinking (opening tag but no closing tag yet)
  const activeMatch = response.match(/<thinking>([\s\S]*)/i);
  if (activeMatch) {
    // There's an opening tag but no closing tag - thinking is in progress
    const thinking = activeMatch[1];
    // Content before the thinking tag
    const beforeThinking = response.split(/<thinking>/i)[0].trim();
    return { thinking, content: beforeThinking, isThinkingActive: true };
  }
  
  // No thinking tags at all
  return { thinking: null, content: response, isThinkingActive: false };
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  agentId,
  agentName,
  isActive,
  response,
  round,
}) => {
  const [showThinking, setShowThinking] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const [newContentMarker, setNewContentMarker] = useState(false);
  const accentColor = agentColors[agentId] || 'var(--text-primary)';
  
  const { thinking, content, isThinkingActive } = useMemo(() => parseResponse(response), [response]);
  const hasThinking = thinking !== null && thinking.length > 0;
  const isGenerating = isActive && response.length === 0;
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Intelligent auto-scroll - only scroll if user is already at bottom
  useEffect(() => {
    if (!contentRef.current) return;
    if (!isActive) return;

    const element = contentRef.current;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;

    if (isAtBottom && !userScrolled) {
      element.scrollTop = element.scrollHeight;
      setNewContentMarker(false);
    } else {
      setNewContentMarker(true);
    }
  }, [response, thinking, isActive, userScrolled]);

  // Detect user scroll interaction
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;
    const element = contentRef.current;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    
    if (isAtBottom) {
      setUserScrolled(false);
      setNewContentMarker(false);
    } else {
      setUserScrolled(true);
    }
  }, []);

  const scrollToBottom = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({
        top: contentRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div
      style={{
        ...styles.panel,
        borderColor: isActive ? accentColor : 'var(--border-color)',
        boxShadow: isActive ? `0 0 20px ${accentColor}33` : 'none',
      }}
    >
      <div style={styles.header}>
        <div style={styles.agentInfo}>
          <div
            style={{
              ...styles.indicator,
              backgroundColor: accentColor,
              opacity: isActive ? 1 : 0.5,
            }}
          />
          <span style={styles.agentName}>{agentName}</span>
        </div>
        <div style={styles.roundBadge}>
          Round {round}
        </div>
      </div>
      
      <div style={styles.content} ref={contentRef} onScroll={handleScroll}>
        {/* Thinking indicator with strobing animation */}
        {hasThinking && (
          <div style={styles.thinkingSection}>
            <button
              onClick={() => setShowThinking(!showThinking)}
              style={styles.thinkingToggle}
            >
              <span 
                style={{
                  ...styles.thinkingIcon,
                  transform: showThinking ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              >
                ▶
              </span>
              <span 
                style={{
                  ...styles.thinkingLabel,
                  color: isThinkingActive ? accentColor : 'var(--text-secondary)',
                }}
                className={isThinkingActive ? 'thinking-strobe' : ''}
              >
                {isThinkingActive ? 'Thinking...' : 'Thought Process'}
              </span>
            </button>
            
            {showThinking && (
              <div style={styles.thinkingContent}>
                <pre style={styles.thinkingText}>{thinking}</pre>
              </div>
            )}
          </div>
        )}
        
        {/* Main response content */}
        {content ? (
          <pre style={styles.responseText}>{content}</pre>
        ) : isGenerating && !hasThinking ? (
          <div style={styles.typingIndicator}>
            <span className="typing-indicator">Generating...</span>
          </div>
        ) : !hasThinking ? (
          <div style={styles.placeholder}>Waiting for turn...</div>
        ) : null}
      </div>

      {/* Catch up button - appears when new content arrives while user is reading */}
      {newContentMarker && isActive && (
        <button
          onClick={scrollToBottom}
          style={{
            ...styles.catchUpButton,
            backgroundColor: accentColor,
          }}
        >
          ↓ New content available
        </button>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '12px',
    border: '1px solid',
    padding: '16px',
    marginBottom: '12px',
    transition: 'all 0.3s ease',
    minHeight: '80px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '340px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border-color)',
  },
  agentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  indicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'opacity 0.3s ease',
  },
  agentName: {
    fontWeight: 600,
    fontSize: '14px',
  },
  roundBadge: {
    backgroundColor: 'var(--bg-tertiary)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  content: {
    minHeight: '40px',
    overflowY: 'auto',
    maxHeight: '220px',
    boxSizing: 'border-box',
    paddingRight: '8px',
  },
  thinkingSection: {
    marginBottom: '12px',
  },
  thinkingToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontFamily: 'inherit',
  },
  thinkingIcon: {
    fontSize: '10px',
    transition: 'transform 0.2s ease',
  },
  thinkingLabel: {
    fontWeight: 500,
    transition: 'color 0.3s ease',
  },
  thinkingContent: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '8px',
    borderLeft: `3px solid var(--accent-phi)`,
    maxHeight: '160px',
    overflowY: 'auto',
    boxSizing: 'border-box',
    paddingRight: '8px',
  },
  thinkingText: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'inherit',
    fontSize: '12px',
    lineHeight: '1.5',
    margin: 0,
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    display: 'block',
    maxHeight: '140px',
    overflowY: 'auto',
    boxSizing: 'border-box',
    paddingRight: '8px',
  },
  responseText: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'inherit',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: 0,
    color: 'var(--text-primary)',
    maxHeight: '220px',
    overflowY: 'auto',
    boxSizing: 'border-box',
    paddingRight: '8px',
    display: 'block',
  },
  typingIndicator: {
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  placeholder: {
    color: 'var(--text-secondary)',
    opacity: 0.5,
  },
  catchUpButton: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 16px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    zIndex: 10,
    color: '#000',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    animation: 'pulse 1.5s infinite',
  },
};
