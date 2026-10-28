import { Agent, Transcript, Message, SSEEventData, CONTEXT_LIMITS } from '../types';
import { AGENTS, SYSTEM_PROMPT, ROUND_PROMPTS, ARTIFACT_PROMPTS, OLLAMA_CONFIG } from '../config/agents';
import { saveDebate } from './storage';
import ollama from 'ollama';

export class Moderator {
  private transcript: Transcript;
  private abortController: AbortController | null = null;
  private selectedAgents: Agent[];

  constructor(query: string, rounds: number = 2, selectedAgentIds?: string[]) {
    this.transcript = {
      id: this.generateId(),
      query,
      rounds,
      currentRound: 1,
      currentAgentIndex: 0,
      messages: [],
      artifact: '', // Initialize empty artifact - shared document
      createdAt: new Date(),
      status: 'pending',
    };
    
    // Filter agents based on selection, or use all available agents
    if (selectedAgentIds && selectedAgentIds.length > 0) {
      this.selectedAgents = AGENTS.filter(
        (agent) => selectedAgentIds.includes(agent.id) && agent.available !== false
      ).sort((a, b) => a.order - b.order);
    } else {
      this.selectedAgents = AGENTS.filter(
        (agent) => agent.available !== false
      ).sort((a, b) => a.order - b.order);
    }
  }

  private generateId(): string {
    return `debate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Truncate artifact to fit context limits - preserve beginning and end
  private truncateArtifact(artifact: string): string {
    if (artifact.length <= CONTEXT_LIMITS.MAX_ARTIFACT_LENGTH) {
      return artifact;
    }
    // Keep beginning and end to preserve context and recent changes
    const half = Math.floor(CONTEXT_LIMITS.MAX_ARTIFACT_LENGTH / 2);
    const beginning = artifact.slice(0, half);
    const end = artifact.slice(-half);
    return beginning + ARTIFACT_PROMPTS.truncate + end;
  }

  // Build the prompt for an agent based on round and current artifact state
  private buildPrompt(agent: Agent, isFirstAgent: boolean): string {
    const roundPrompt = ROUND_PROMPTS[this.transcript.currentRound as keyof typeof ROUND_PROMPTS];
    
    let prompt = `${SYSTEM_PROMPT}\n\n`;
    prompt += `${roundPrompt.prefix}\n\n`;
    prompt += `USER QUERY:\n${this.transcript.query}\n\n`;

    // If there's an existing artifact, show it for editing
    if (this.transcript.artifact && !isFirstAgent) {
      const truncatedArtifact = this.truncateArtifact(this.transcript.artifact);
      prompt += ARTIFACT_PROMPTS.edit.replace('{artifact}', truncatedArtifact);
      prompt += '\n\n';
    } else if (isFirstAgent && this.transcript.currentRound === 1) {
      prompt += ARTIFACT_PROMPTS.initial;
      prompt += '\n\n';
    } else if (this.transcript.artifact) {
      // Round 2 - always show the artifact for refinement
      const truncatedArtifact = this.truncateArtifact(this.transcript.artifact);
      prompt += ARTIFACT_PROMPTS.edit.replace('{artifact}', truncatedArtifact);
      prompt += '\n\n';
    }

    prompt += `${roundPrompt.suffix}\n\n`;
    prompt += `Output ONLY the document content (no explanations):`;

    return prompt;
  }

  // Clean streaming tokens from think tags and reasoning output
  private cleanStreamingToken(token: string, inThinkingBlock: boolean): { cleanToken: string, inThinking: boolean } {
    let cleanToken = token;
    let newInThinking = inThinkingBlock;

    // Detect opening think tag
    if (cleanToken.includes('<think>')) {
      cleanToken = cleanToken.split('<think>')[0];
      newInThinking = true;
    }

    // Detect closing think tag
    if (newInThinking && cleanToken.includes('</think>')) {
      cleanToken = cleanToken.split('</think>')[1] || '';
      newInThinking = false;
    }

    // If inside thinking block, suppress output
    if (newInThinking) {
      cleanToken = '';
    }

    return { cleanToken, inThinking: newInThinking };
  }

  // Stream response from Ollama
  async *streamResponse(
    agent: Agent,
    isFirstAgent: boolean,
    onToken?: (token: string) => void
  ): AsyncGenerator<string, void, unknown> {
    const prompt = this.buildPrompt(agent, isFirstAgent);
    let fullResponse = '';
    let inThinkingBlock = false;

    try {
      const stream = await ollama.generate({
        model: agent.model,
        prompt: prompt,
        stream: true,
        options: OLLAMA_CONFIG.defaultOptions,
      });

      for await (const chunk of stream) {
        if (this.abortController?.signal.aborted) {
          break;
        }

        const token = chunk.response;
        if (token) {
          const { cleanToken, inThinking } = this.cleanStreamingToken(token, inThinkingBlock);
          inThinkingBlock = inThinking;
          
          if (cleanToken) {
            fullResponse += cleanToken;
            if (onToken) {
              onToken(cleanToken);
            }
            yield cleanToken;
          }
        }
      }
    } catch (error) {
      console.error(`Error streaming from ${agent.name}:`, error);
      throw error;
    }

    // Store the complete message
    const message: Message = {
      role: 'assistant',
      content: fullResponse,
      agentId: agent.id,
      agentName: agent.name,
      timestamp: new Date(),
    };
    this.transcript.messages.push(message);
  }

  // Run the full debate
  async *runDebate(): AsyncGenerator<SSEEventData, void, unknown> {
    const orderedAgents = this.selectedAgents;

    for (let round = 1; round <= this.transcript.rounds; round++) {
      this.transcript.currentRound = round;

      for (let i = 0; i < orderedAgents.length; i++) {
        const agent = orderedAgents[i];
        this.transcript.currentAgentIndex = i;
        this.transcript.status = 'streaming';

        // Emit agent start
        const startData: SSEEventData = {
          agentId: agent.id,
          agentName: agent.name,
          round: round,
        };
        yield startData;

        // Collect tokens
        let fullResponse = '';

        try {
          const isFirstAgent = i === 0;
          for await (const token of this.streamResponse(agent, isFirstAgent)) {
            fullResponse += token;
            const tokenData: SSEEventData = {
              agentId: agent.id,
              agentName: agent.name,
              round: round,
              token: token,
            };
            yield tokenData;
          }

          // Update the shared artifact with the agent's response
          this.transcript.artifact = this.truncateArtifact(fullResponse);

          // Emit agent complete
          const completeData: SSEEventData = {
            agentId: agent.id,
            agentName: agent.name,
            round: round,
            fullResponse: fullResponse,
          };
          yield completeData;
        } catch (error) {
          const errorData: SSEEventData = {
            agentId: agent.id,
            agentName: agent.name,
            round: round,
            message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
          yield errorData;
          throw error;
        }
      }

      // Emit round complete
      const roundCompleteData: SSEEventData = {
        round: round,
        message: `Round ${round} complete`,
      };
      yield roundCompleteData;
    }

    // Emit debate complete
    this.transcript.status = 'complete';
    const debateCompleteData: SSEEventData = {
      transcript: this.transcript,
      message: 'Debate complete',
    };
    yield debateCompleteData;
  }

  // Abort current debate
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  // Get current transcript state
  getTranscript(): Transcript {
    return this.transcript;
  }
}

// Store active debates in memory
const activeDebates = new Map<string, Moderator>();

export function createDebate(query: string, rounds?: number, selectedAgentIds?: string[]): Moderator {
  const moderator = new Moderator(query, rounds, selectedAgentIds);
  activeDebates.set(moderator.getTranscript().id, moderator);
  return moderator;
}

export function getDebate(id: string): Moderator | undefined {
  return activeDebates.get(id);
}

export function removeDebate(id: string): void {
  activeDebates.delete(id);
}