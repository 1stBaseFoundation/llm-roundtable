// Test file for thinking tag parsing
// Run with: npx ts-node client/src/utils/parseThinking.test.ts

// Parse response to extract thinking and main content
// Handles: complete blocks, active streaming, case variations
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
    const thinking = activeMatch[1];
    const beforeThinking = response.split(/<thinking>/i)[0].trim();
    return { thinking, content: beforeThinking, isThinkingActive: true };
  }
  
  return { thinking: null, content: response, isThinkingActive: false };
}

// Test cases
const testCases = [
  {
    name: "Complete thinking block",
    input: "<thinking>This is my reasoning</thinking>\n\nHere is my answer.",
    expected: { thinking: "This is my reasoning", content: "Here is my answer.", isThinkingActive: false }
  },
  {
    name: "Active thinking (streaming)",
    input: "<thinking>Let me think about this...",
    expected: { thinking: "Let me think about this...", content: "", isThinkingActive: true }
  },
  {
    name: "No thinking tags",
    input: "Just a regular response without thinking tags.",
    expected: { thinking: null, content: "Just a regular response without thinking tags.", isThinkingActive: false }
  },
  {
    name: "Case insensitive - uppercase",
    input: "<THINKING>Upper case thinking</THINKING>\nFinal answer",
    expected: { thinking: "Upper case thinking", content: "Final answer", isThinkingActive: false }
  },
  {
    name: "Case insensitive - mixed",
    input: "<Thinking>Mixed case thinking</Thinking>\nFinal answer",
    expected: { thinking: "Mixed case thinking", content: "Final answer", isThinkingActive: false }
  },
  {
    name: "Content before thinking",
    input: "Some intro <thinking>hidden reasoning</thinking> The answer",
    expected: { thinking: "hidden reasoning", content: "Some intro  The answer", isThinkingActive: false }
  },
  {
    name: "Multiline thinking",
    input: "<thinking>\nLine 1\nLine 2\nLine 3\n</thinking>\n\nFinal response here.",
    expected: { thinking: "Line 1\nLine 2\nLine 3", content: "Final response here.", isThinkingActive: false }
  },
  {
    name: "Active thinking with content before",
    input: "Intro text\n<thinking>Still thinking...",
    expected: { thinking: "Still thinking...", content: "Intro text", isThinkingActive: true }
  },
  {
    name: "Empty thinking block",
    input: "<thinking></thinking>\nJust the answer",
    expected: { thinking: "", content: "Just the answer", isThinkingActive: false }
  },
  {
    name: "Phi-4 style with reasoning",
    input: "<thinking>\nOkay, let's see. The user is asking about...\n\n1. First point\n2. Second point\n</thinking>\n\n**Final Answer:** Here it is.",
    expected: { thinking: "Okay, let's see. The user is asking about...\n\n1. First point\n2. Second point", content: "**Final Answer:** Here it is.", isThinkingActive: false }
  }
];

// Run tests
console.log("🧪 Testing parseResponse function\n");
console.log("=".repeat(60));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = parseResponse(test.input);
  const thinkingMatch = result.thinking === test.expected.thinking;
  const contentMatch = result.content === test.expected.content;
  const activeMatch = result.isThinkingActive === test.expected.isThinkingActive;
  
  if (thinkingMatch && contentMatch && activeMatch) {
    console.log(`✅ Test ${index + 1}: ${test.name}`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: ${test.name}`);
    if (!thinkingMatch) {
      console.log(`   Thinking: Expected "${test.expected.thinking}" got "${result.thinking}"`);
    }
    if (!contentMatch) {
      console.log(`   Content: Expected "${test.expected.content}" got "${result.content}"`);
    }
    if (!activeMatch) {
      console.log(`   Active: Expected ${test.expected.isThinkingActive} got ${result.isThinkingActive}`);
    }
    failed++;
  }
});

console.log("\n" + "=".repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

// Export for use in components
export { parseResponse };