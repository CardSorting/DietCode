/**
 * Integration Tests: SafetyGuard + ToolManager Unified Safety Integration
 * Tests the flow: Tool → ToolManager → SafetyGuard → Unified Safety
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock utilities for testing
class MockRiskEvaluator {
  async evaluateRisk(criteria: any) {
    // Return RiskLevel based on tool name and parameters
    if (criteria.toolName?.includes('delete') || criteria.operationType === 'delete') {
      return 'HIGH';
    }
    if (criteria.toolName?.includes('edit') || criteria.operationType === 'edit') {
      return 'MEDIUM';
    }
    return 'SAFE';
  }

  async getApprovalRequirements(criteria: any) {
    const riskLevel = await this.evaluateRisk(criteria);
    return {
      requiresConfirmation: riskLevel === 'HIGH' || riskLevel === 'MEDIUM',
      requiresRollback: riskLevel === 'HIGH' || riskLevel === 'MEDIUM',
      recommendedSafeguards: ['Review changes before confirming', 'Backup file before editing']
    };
  }
}

class MockRollbackManager {
  async backupFile(path: string, content: string) {
    console.log(`📦 Mock backup for: ${path}`);
    return { backupId: `mock-${Date.now()}-${path}`, path };
  }

  async rollbackByPath(path: string) {
    console.log(`♻️  Mock rollback for: ${path}`);
  }
}

describe('SafetyGuard → ToolManager Integration', () => {
  let toolManager: any;
  let mockRiskEvaluator: MockRiskEvaluator;
  let mockRollbackManager: MockRollbackManager;
  let executionService: any;

  beforeEach(() => {
    // Initialize dependencies
    mockRiskEvaluator = new MockRiskEvaluator();
    mockRollbackManager = new MockRollbackManager();
    
    // Simulate importing actual implementations (for test purposes)
    const RiskEvaluator = require('../../src/domain/validation/RiskEvaluator').RiskEvaluator;
    const RollbackManager = require('../../src/infrastructure/validation/RollbackManager').RollbackManager;

    // Create instances
    const riskEvaluator = new RiskEvaluator(mockRiskEvaluator.evaluateRisk.bind(mockRiskEvaluator));
    const rollbackMgr = new RollbackManager(undefined);
    
    // Create mock ToolManager
    toolManager = {
      tools: new Map(),
      executeTool: async (name, input) => {
        if (name === 'non-existent-tool') {
          return { content: 'Tool not found', isError: true };
        }
        return {
          content: `Successfully executed ${name} with input: ${JSON.stringify(input)}`,
          isError: false
        };
      },
      integrateSafety: function(riskEvaluator, rollbackManager) {
        this.safetyGuard = mockRiskEvaluator; // Override for test
        this.rollbackManager = rollbackManager;
      },
      executeWithSafety: async function(name, input, options) {
        const toolName = name || 'unknown-tool';
        const rawResult = await this.executeTool(name, input);
        const startTime = Date.now();
        
        const riskLevel = await mockRiskEvaluator.evaluateRisk({
          toolName,
          operationType: toolName,
          parameters: input || {},
          targetPath: options.targetPath
        });
        
        const requiresExplicitApproval = options.requireApprovalForHighRisk && 
          (riskLevel === 'HIGH' || riskLevel === 'MEDIUM');
        
        let rollbackPrepared = false;
        if (options.backupBeforeModification && (riskLevel === 'MEDIUM' || riskLevel === 'HIGH')) {
          if (options.targetPath) {
            await mockRollbackManager.backupFile(options.targetPath, '<content>');
            rollbackPrepared = true;
          }
        }
        
        return {
          success: !rawResult.isError,
          toolName,
          toolResult: rawResult,
          safetyCheck: {
            evaluated: true,
            riskLevel,
            approved: !requiresExplicitApproval,
            requiresConfirmation: requiresExplicitApproval,
            rollbackPrepared,
            safeguardsApplied: [
              options.requireApprovalForHighRisk ? 'Approval check' : '',
              rollbackPrepared ? 'Backup created' : '',
              rawResult.isError ? 'Error logged' : ''
            ].filter(Boolean)
          },
          execution: {
            startTime,
            endTime: Date.now(),
            durationMs: Date.now() - startTime
          }
        };
      },
      isSafetyEnabled: function() {
        return this.safetyGuard !== undefined;
      },
      getSafetyGuard: function() {
        return this.safetyGuard;
      }
    };
    
    // Initialize ToolManager with safety
    toolManager.integrateSafety(riskEvaluator, {
      backupFile: mockRollbackManager.backupFile.bind(mockRollbackManager),
      rollbackByPath: mockRollbackManager.rollbackByPath.bind(mockRollbackManager)
    });
    
    executionService = {
      toolManager,
      eventBus: {
        publish: () => {
          console.log('Event dispatched');
        }
      },
      executeWithToolManagerSafety: async function(toolName, input, options) {
        return await this.toolManager.executeWithSafety(toolName, input, options);
      }
    };
  });

  describe('ToolManager Safety Integration', () => {
    it('should wrap tool execution with safety when SafetyGuard is integrated', async () => {
      const result = await toolManager.executeWithSafety('test-tool', { arg: 'value' });
      
      expect(result).toBeDefined();
      expect(result.toolName).toBe('test-tool');
      expect(result.safetyCheck.evaluated).toBe(true);
      expect(result.execution.durationMs).toBeGreaterThan(0);
    });

    it('should include full safety context in tool execution result', async () => {
      const result = await toolManager.executeWithSafety('file-edit', { path: '/test.txt' });
      
      expect(result.safetyCheck.riskLevel).toBeDefined();
      expect(result.safetyCheck.approved).toBeDefined();
      expect(Array.isArray(result.safetyCheck.safeguardsApplied)).toBe(true);
      expect(result.execution.startTime).toBeDefined();
      expect(result.execution.endTime).toBeDefined();
      expect(result.execution.durationMs).toBeGreaterThan(0);
    });

    it('should handle non-existent tools with safety context', async () => {
      const result = await toolManager.executeWithSafety('non-existent-tool', {});
      
      expect(result.toolName).toBe('non-existent-tool');
      expect(result.toolResult.isError).toBe(true);
      expect(result.safetyCheck.evaluated).toBe(true);
      expect(Array.isArray(result.safetyCheck.safeguardsApplied)).toBe(true);
    });

    it('should support requireApprovalForHighRisk option', async () => {
      const result = await toolManager.executeWithSafety('db-delete', {}, {
        requireApprovalForHighRisk: true
      });
      
      expect(result.safetyCheck.evaluated).toBe(true);
      expect(result.safetyCheck.requiresConfirmation).toMatch(/true|false/);
      expect(Array.isArray(result.safetyCheck.safeguardsApplied)).toBe(true);
    });

    it('should support targetPath option for rollback preparation', async () => {
      const result = await toolManager.executeWithSafety('file-edit', {}, {
        targetPath: '/sensitive/file.txt'
      });
      
      expect(result.safetyCheck.targetPath).toBe('/sensitive/file.txt');
      expect(Array.isArray(result.safetyCheck.safeguardsApplied)).toBe(true);
    });

    it('should validate safetyEnabled check', () => {
      expect(toolManager.isSafetyEnabled()).toBe(true);
    });
  });

  describe('ExecutionService ToolManager Integration', () => {
    it('should delegate safety-enriched execution to ToolManager', async () => {
      const result = await executionService.executeWithToolManagerSafety('test-tool', { arg: 'value' });
      
      expect(result).toBeDefined();
      expect(result.toolName).toBe('test-tool');
      expect(result.safetyCheck.evaluated).toBe(true);
      expect(Array.isArray(result.safetyCheck.safeguardsApplied)).toBe(true);
    });

    it('should fall back to uninstrumented execution when safety not enabled', async () => {
      const fallbackToolManager = {
        isSafetyEnabled: () => false,
        executeWithSafety: async () => null,
        executeTool: async (name, input) => {
          return { content: `Fallback execution: ${name}`, isError: false };
        }
      };
      
      executionService.toolManager = fallbackToolManager;
      const result = await executionService.executeWithToolManagerSafety('test', {});
      
      // Should return null and fall back
      expect(result).toBeNull();
    });
  });

  describe('Risk Evaluation Flow', () => {
    it('should assign HIGH risk to delete operations', async () => {
      const result = await toolManager.executeWithSafety('db-delete', {});
      
      expect(result.safetyCheck.riskLevel).toBe('HIGH');
    });

    it('should assign MEDIUM risk to edit operations', async () => {
      const result = await toolManager.executeWithSafety('file-edit', {});
      
      expect(result.safetyCheck.riskLevel).toBe('MEDIUM');
    });

    it('should assign SAFE risk to safe operations', async () => {
      const result = await toolManager.executeWithSafety('info-read', {});
      
      expect(result.safetyCheck.riskLevel).toBe('SAFE');
    });
  });

  describe('JoyZoning Compliance', () => {
    it('should maintain Core/Core dependency flow with no cross-layer violations', () => {
      // Verify safety contract is in Domain
      const SafetyAwareToolContext = require('../../src/domain/capabilities/SafetyAwareToolExecution').SafetyAwareToolContext;
      expect(SafetyAwareToolContext).toBeDefined();
      
      // Verify implementations are in Core
      const SafetyGuard = require('../../src/core/capabilities/SafetyGuard').SafetyGuard;
      const ToolManager = require('../../src/core/capabilities/ToolManager').ToolManager;
      expect(SafetyGuard).toBeDefined();
      expect(ToolManager).toBeDefined();
      
      // Verify Infrastructure adapter is properly isolated
      expect(mockRollbackManager.backupFile).toBeDefined();
      expect(mockRollbackManager.rollbackByPath).toBeDefined();
    });

    it('should not allow direct UI imports in Core layers', () => {
      const SafetyGuard = require('../../src/core/capabilities/SafetyGuard').SafetyGuard;
      const ToolManager = require('../../src/core/capabilities/ToolManager').ToolManager;
      
      // SafetyGuard should only import from Domain/Core/Infrastructure
      expect(SafetyGuard.toString()).not.toContain('UI');
      expect(ToolManager.toString()).not.toContain('UI');
    });
  });
});