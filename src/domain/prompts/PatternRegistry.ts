/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic and registry definitions — testable in isolation
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [CONSOLIDATE] PatternRegistry accuracy tracking for Prework protocol
 */

import type { PatternMapping, StringMapping } from './SplitStrategy';

/**
 * Registry of all pattern mappings extracted from claude-code-prompts
 * Maps prompt patterns to architectural elements
 */
export const PATTERN_REGISTRY: Map<string, PatternMapping> = new Map([
  // SAFETY- FIRST EXECUTION PATTERN
  [
    'SAFETY_FIRST_EXECUTION',
    {
      patternName: 'Safety First Execution',
      extractionStrategy: {
        promptText:
          'Actions that are local and reversible — editing a file, running a test suite can proceed without hesitation. Actions that are difficult to undo or affect shared systems require explicit user confirmation.',
        skipKeyWords: ['can proceed', 'without hesitation'],
        requiredKeywords: ['difficult to undo', 'explicit user confirmation'],
        extractionPattern:
          'local reversible action = SAFE, hard to undo or shared system = requires confirmation',
      },
      domainElement: {
        name: 'RiskLevel Definition',
        interfaceName: 'RiskLevel',
        parameters: [],
        returns: 'SAFE | LOW | MEDIUM | HIGH',
      },
      infrastructureElement: {
        adapterName: 'SafetyEvaluator',
        implementsInterface: 'RiskEvaluator',
        usesDependencies: ['types: ReversibilityCheck', 'types: SystemImpactAnalyzer'],
        behavior:
          'Evaluate reversibility and system impact, determine risk tier (I/O-heavy analysis)',
        implementationStatus: '✅ IMPLEMENTED',
      },
      coreElement: {
        serviceName: 'SafetyGuard',
        orchestrates: ['ApprovalService (pending)', 'RollbackManager'],
        composition: 'Execute with confirmation if MEDIUM/HIGH, execute safe if SAFE',
      },
    },
  ],

  // TOOL SELECTION ROUTER PATTERN
  [
    'TOOL_SELECTION_ROUTER',
    {
      patternName: 'Tool Selection Router',
      extractionStrategy: {
        promptText:
          'When a purpose-built tool exists for an operation, use it instead of invoking an equivalent shell command. Specific rules: Read with file-reading, edit with file-editing, create with file-writing.',
        skipKeyWords: ['instead of'],
        requiredKeywords: ['purpose-built tool', 'specific rules', 'read with file-reading'],
        extractionPattern:
          'Tool routing: read={file-read}, edit={file-edit}, create={file-write}, exec={shell-execution}',
      },
      domainElement: {
        name: 'Tool Action Map',
        interfaceName: 'ToolActionMap',
        parameters: [],
        returns: 'Record<OperationType, ToolName>',
      },
      infrastructureElement: {
        adapterName: 'ToolRouterAdapter',
        implementsInterface: 'ToolRouter',
        usesDependencies: ['types: UserIntention', 'types: ToolDefinition'],
        behavior:
          'Route user intention to appropriate tool, enforce solo-use constraint (IMPLEMENTED)',
        implementationStatus: '✅ IMPLEMENTED',
      },
      coreElement: {
        serviceName: 'ToolManager',
        orchestrates: ['ToolSelectionPolicy (pending)', 'ParallelExecutor (pending)'],
        composition: 'Dispatch priority-based tool selection, parallelize independent calls',
      },
    },
  ],

  // CONTEXT COMPRESSION PATTERN
  [
    'CONTEXT_COMPRESSION',
    {
      patternName: 'Context Compression',
      extractionStrategy: {
        promptText:
          '9-section context compression with no-tools constraint. Summarize: user intent, key decisions, next steps, error triage, patterns, file changes, discrete actions.',
        skipKeyWords: ['with no-tools constraint'],
        requiredKeywords: ['9-section', 'summarize', 'user intent', 'key decisions'],
        extractionPattern:
          '9-section algorithm: intent/decisions/nextSteps/errors/patterns/fileChanges/actions compressed into fixed template',
      },
      domainElement: {
        name: 'Context Compression Strategy',
        interfaceName: 'ContextCompressionStrategy',
        parameters: ['context: SessionContext[]'],
        returns: 'CompressedContext',
      },
      infrastructureElement: {
        adapterName: 'ContextCompressorAdapter',
        implementsInterface: 'ContextCompressionStrategy',
        usesDependencies: [
          'types: SessionContext',
          'Domain: ContextTypes',
          'Domain: ContextCompressionFactory',
        ],
        behavior:
          'Apply 9-section compression algorithm, extract 7 key sections, calculate compression ratio',
        implementationStatus: '✅ IMPLEMENTED',
      },
      coreElement: {
        serviceName: 'ContextSaveService',
        orchestrates: ['ContextService (exists)', 'CompressTrigger (pending)'],
        composition: 'Auto-trigger compression at 70% context usage threshold',
      },
    },
  ],

  // VERIFICATION AGENT PATTERN
  [
    'VERIFICATION_AGENT',
    {
      patternName: 'Verification Agent',
      extractionStrategy: {
        promptText:
          'Adversarial testing with PASS/FAIL/PARTIAL verdicts. Verifier receives under-test code, generates counterexamples, verifies assertions, emits verdict.',
        skipKeyWords: ['receives under-test code'],
        requiredKeywords: ['adversarial testing', 'PASS/FAIL/PARTIAL verdicts', 'counterexamples'],
        extractionPattern:
          'Adversarial test gen={counterexamples} → assertion verif=verifyAssertions → emit verif={PASS|FAIL|PARTIAL}',
      },
      domainElement: {
        name: 'Verification Protocol',
        interfaceName: 'VerificationAgent',
        parameters: ['testCase: TestCase'],
        returns: 'VerificationVerdict',
      },
      infrastructureElement: {
        adapterName: 'VerificationAgentAdapter',
        implementsInterface: 'VerificationAgent',
        usesDependencies: [
          'types: TestCase',
          'types: Assertion',
          'types: CounterexampleGenerator',
          'Domain: VerificationTypes',
        ],
        behavior: 'Execute assertion checks, generate counterexamples, emit comprehensive verdict',
        implementationStatus: '✅ IMPLEMENTED',
      },
      coreElement: {
        serviceName: 'AgentRouter',
        orchestrates: ['VerificationProtocol (pending)', 'ArchitectAgentProtocol'],
        composition:
          'Delegate verification task to VerificationAgent, route architect tasks separately',
      },
    },
  ],
]);

/**
 * Get a pattern by name
 */
export function getPattern(name: string): PatternMapping | undefined {
  return PATTERN_REGISTRY.get(name);
}

/**
 * Get all registered patterns
 */
export function getAllPatterns(): PatternMapping[] {
  return Array.from(PATTERN_REGISTRY.values());
}

/**
 * Get patterns by behavior category
 */
export function getPatternsByCategory(category: string): PatternMapping[] {
  return getAllPatterns().filter((p) =>
    p.patternName.toLowerCase().includes(category.toLowerCase()),
  );
}
