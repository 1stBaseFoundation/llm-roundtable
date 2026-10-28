import { Agent } from '../types';

// Model definitions for the round table
// All models support 128k context window
export const AGENTS: Agent[] = [
  {
    id: 'phi4',
    name: 'Phi-4 Mini',
    model: 'phi4-mini-reasoning:3.8b',
    order: 1,
    available: true,
  },
  {
    id: 'qwen',
    name: 'Qwen 3.5',
    model: 'qwen3.5:4b',
    order: 2,
    available: false, // Disabled - model compatibility issues
  },
  {
    id: 'granite',
    name: 'Granite 3.3',
    model: 'granite3.3:8b',
    order: 3,
    available: true,
  },
  {
    id: 'glm4',
    name: 'GLM-4',
    model: 'glm4:9b',
    order: 4,
    available: true,
  },
  {
    id: 'nemotron',
    name: 'Nemotron 3 Nano',
    model: 'nemotron-3-nano:4b',
    order: 5,
    available: true,
  },
  {
    id: 'DeepSeek',
    name: 'DeepSeek R1',
    model: 'deepseek-r1:7b',
    order: 6,
    available: true,
  },
];

// Shared system prompt for all agents - Artifact collaboration mode
export const SYSTEM_PROMPT = `You are a collaborative AI assistant working on a shared document.
Your task is to edit and improve the document, building on the work of previous contributors.

CRITICAL RULES - VIOLATIONS WILL RESULT IN INVALID OUTPUT:
1. DO NOT output any internal monologue, thoughts, or commentary before the document
2. START YOUR RESPONSE DIRECTLY WITH THE DOCUMENT CONTENT
3. Preserve 90%+ of the existing document content - DO NOT rewrite from scratch
4. Add your unique insights ONLY at the END of the document in a dedicated section
5. DO NOT modify or delete existing sections unless they contain factual errors
6. Output ONLY the updated document - no meta-commentary, no notes, no explanations
7. Never use <think> tags or any internal reasoning markers in your output

DOCUMENT FORMAT:
- Use markdown headers (##) for sections
- Use bullet points for lists
- Keep paragraphs focused and brief
- Add new insights as a new section at the END with header "## Additional Perspectives"`;

// Round-specific prompt additions for artifact collaboration
export const ROUND_PROMPTS = {
  1: {
    prefix: 'ROUND 1: COLLABORATIVE DRAFT\n\nYou are contributing to a shared document. The document starts empty - create an initial draft addressing the user query.\n\nCreate a well-structured document with:\n- A clear title\n- Key sections with headers\n- Important points in bullet format\n\nOutput ONLY the document content.',
    suffix: 'Keep it concise. Focus on the most important points.',
  },
  2: {
    prefix: 'ROUND 2: COLLABORATIVE REFINEMENT\n\nYou are reviewing and improving the shared document. You MUST:\n1. Read the ENTIRE current document carefully\n2. Preserve all valuable content from previous contributors\n3. Make targeted improvements to clarity, structure, and completeness\n4. Add missing insights where appropriate\n5. Remove only redundant or incorrect information\n6. Ensure the document flows coherently as a whole\n\nDO NOT rewrite the document from scratch. Your goal is to EDIT and IMPROVE, not replace.\n\nOutput ONLY the updated document.',
    suffix: 'Preserve valuable content. Make targeted improvements. Build upon previous work.',
  },
};

// Artifact-specific prompts
export const ARTIFACT_PROMPTS = {
  initial: `Create a collaborative document addressing this query. Structure it with clear sections and bullet points. Be comprehensive but concise.`,
  
  edit: `Below is the current shared document. Review it and make improvements.

CURRENT DOCUMENT:
---
{artifact}
---

Edit the document to improve it. Output ONLY the updated document.`,

  truncate: `\n\n[Note: Document truncated to fit context limits. Earlier sections preserved.]`,
};

// Helper to get agent by ID
export function getAgentById(id: string): Agent | undefined {
  return AGENTS.find((agent) => agent.id === id);
}

// Helper to get agent by order position
export function getAgentByOrder(order: number): Agent | undefined {
  return AGENTS.find((agent) => agent.order === order);
}

// Get ordered list of agents
export function getOrderedAgents(): Agent[] {
  return [...AGENTS].sort((a, b) => a.order - b.order);
}

// Ollama configuration
export const OLLAMA_CONFIG = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  defaultOptions: {
    temperature: 0.7,
    top_p: 0.9,
    // Let Ollama use its VRAM-based default context (4096 for 8GB GPU)
  },
};
