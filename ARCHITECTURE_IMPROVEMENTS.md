# LLM Round Table - Architectural Improvements for Better Collaboration

## Problem Statement
The current implementation has a critical flaw in how agents collaborate on the shared artifact:
- Each agent completely overwrites the artifact instead of editing it
- Agents don't see the cumulative improvements from all previous agents
- Context is lost between agents in the same round

## Planned Improvements

### 1. Fix Artifact Collaboration Mechanism
**File:** `src/services/moderator.ts`

**Current Issue:**
```typescript
// PROBLEM: This overwrites the artifact each time
this.transcript.artifact = this.truncateArtifact(fullResponse);
```

**Solution:**
- Modify the streamResponse method to return the complete edited artifact
- Have each agent receive the current artifact as context for editing
- Store the agent's edited version as the new shared artifact

### 2. Enhance Collaboration Prompts
**File:** `src/config/agents.ts`

**Improvements:**
- Strengthen round prompts to explicitly require preserving good content
- Add examples of what constitutes good collaborative editing
- Emphasize targeted improvements over complete rewrites

### 3. Improve Context Management
**Files:** `src/services/moderator.ts` and `src/config/agents.ts`

**Changes:**
- Ensure each agent receives the full accumulated artifact
- Add truncation strategy that preserves beginning and end of document
- Consider adding section-based preservation for longer documents

### 4. Add Collaboration Tracking (Optional)
**File:** `src/services/moderator.ts`

**Metrics to Track:**
- Percentage of content preserved from previous agents
- New insights added by each agent
- Modifications made to existing content

## Implementation Plan

### Phase 1: Core Collaboration Fix
1. Modify `moderator.ts` to pass current artifact to each agent
2. Update artifact handling to accumulate improvements
3. Test with simple queries to verify collaboration works

### Phase 2: Prompt Enhancement
1. Update `agents.ts` with stronger collaboration instructions
2. Add examples of good vs. bad collaborative editing
3. Refine round-specific prompts for better context utilization

### Phase 3: Validation & Testing
1. Run test debates to verify improved cohesion
2. Check that agents build upon rather than replace each other's work
3. Measure improvement in artifact quality over rounds

## Expected Outcomes
- Agents will truly collaborate on a shared document
- Each round will show progressive improvement
- Final artifact will reflect contributions from all participants
- Reduced redundancy and better overall coherence

## Files to Modify
1. `src/services/moderator.ts` - Core collaboration logic
2. `src/config/agents.ts` - Enhanced collaboration prompts
3. (Optional) `src/types/index.ts` - If adding collaboration metrics

## Testing Approach
1. Create test queries that benefit from multiple perspectives
2. Run debates with 2 rounds and 4 agents
3. Verify that:
   - Early contributions are preserved in later rounds
   - New insights are added appropriately
   - Document structure improves over time
   - No important information is lost between agents