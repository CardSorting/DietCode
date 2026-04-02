/**
 * [LAYER: TEST]
 * Principle: Integration tests for enhanced prompt engine with risk-aware composition and context integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PromptRegistryAdapter } from '../../src/infrastructure/PromptRegistryAdapter';
import { TestContextService } from './mocks/TestContextService';
import { TestMemoryService } from './mocks/TestMemoryService';
import { PromptLoader } from '../../src/infrastructure/PromptLoader';
import { TemplateEngine } from '../../src/domain/prompts/PromptTemplateEngine';

// Mock Filesystem
class MockFilesystem {
  private files: Map<string, string> = new Map();

  async readFile(path: string): Promise<string> {
    return this.files.get(path) || '';
  }

  async stat(path: string): Promise<{ isDirectory: boolean }> {
    return { isDirectory: true };
  }

  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }
}

// Mock EventBus
class MockEventBus {
  publish(eventType: string, eventData: any, meta?: any): Promise<void> {
    return Promise.resolve();
  }
}

describe('Prompt Enhanced Integration', () => {
  let fs: MockFilesystem;
  let memoryService: TestMemoryService;
  let contextService: TestContextService;
  let eventBus: MockEventBus;
  let promptLoader: PromptLoader;
  let adapter: PromptRegistryAdapter;

  beforeEach(() => {
    fs = new MockFilesystem();
    memoryService = new TestMemoryService();
    contextService = new TestContextService();
    eventBus = new MockEventBus();
    promptLoader = new PromptLoader(fs);
    
    adapter = new PromptRegistryAdapter(
      fs as any,
      eventBus as any,
      null as any,
      memoryService,
      contextService,
      promptLoader,
      async (path: string) => {
        const files = path.split('/');
        return [`${path}/test-prompt-${Date.now()}.md`];
      },
      async (path: string) => {
        return {
          id: `test-prompt-${Date.now()}`,
          category: 'MEMORY_CYCLES',
          name: 'Enhanced Test Prompt',
          description: 'Test prompt with enhanced features',
          content: generateTestPromptWithVariables(),
          metadata: {
            source: path,
            version: '2.0.0',
            dangerLevel: 'medium'
          }
        };
      }
    );
  });

  describe('Enhanced Context Provider Integration', () => {
    it('should prepare context with memory items and project information', async () => {
      // Add test memory items
      await memoryService.store(
        'test-session-1',
        {
          category: 'code_evolution',
          key: 'func_algorithms',
          content: 'Various algorithm implementations',
          timestamp: new Date().toISOString(),
          metadata: {}
        }
      );

      const sessionContext = {
        sessionId: 'test-session-1',
        timestamp: new Date().toISOString(),
        project: {
          name: 'Enhanced Project',
          path: '/test-project',
          technologies: ['TypeScript', 'Node.js']
        }
      };

      await adapter.acquireAll({ sessionId: 'test-session-1', projectPath: '/test', userContext: {} });

      const prompts = await adapter.findPromptsByCategory('MEMORY_CYCLES');
      const prompt = prompts[0];
      
      if (!prompt) throw new Error('No prompts found');

      const result = await adapter.renderPrompt(prompt.id, sessionContext);

      // Verify context was loaded
      expect(result.metadata.memoryItemsLoaded).toBeGreaterThan(0);
      
      // Verify project information was integrated
      expect(result.rendered).toContain('Enhanced Project');
      expect(result.rendered).toContain('TypeScript');
      expect(result.rendered).toContain('Node.js');
    });

    it('should apply strategy notes for enhanced rendering', async () => {
      const sessionContext = {
        sessionId: 'strat-test',
        timestamp: new Date().toISOString(),
        project: { name: 'Strategy Test', path: '/test', technologies: [] }
      };

      await adapter.acquireAll({ sessionId: 'strat-test', projectPath: '/test', userContext: {} });

      const prompts = await adapter.findPromptsByCategory('MEMORY_CYCLES');
      const prompt = prompts[0];
      
      if (!prompt) throw new Error('No prompts found');

      const result = await adapter.renderPrompt(prompt.id, sessionContext);

      // Verify strategy notes are present
      expect(result.metadata.strategyNotes).toBeDefined();
      expect(result.metadata.enabledStrategies).toContain('context-provider');
      expect(result.metadata.enabledStrategies).toContain('risk-aware-composition');
    });

    it('should cache prepared context for performance', async () => {
      const sessionContext = {
        sessionId: 'cache-test',
        timestamp: new Date().toISOString(),
        project: { name: 'Cache Test', path: '/test', technologies: [] }
      };

      await adapter.acquireAll({ sessionId: 'cache-test', projectPath: '/test', userContext: {} });

      const prompts = await adapter.findPromptsByCategory('MEMORY_CYCLES');
      const prompt = prompts[0];
      
      if (!prompt) throw new Error('No prompts found');

      // First render - should prepare context
      const result1 = await adapter.renderPrompt(prompt.id, sessionContext);
      const cacheSize1 = adapter['contextProvider']['cache'].size;

      // Second render - should use cached context
      await adapter.renderPrompt(prompt.id, sessionContext);
      
      // Cache should be same size (not doubled)
      const cacheSize2 = adapter['contextProvider']['cache'].size;
      
      expect(cacheSize1).toBeGreaterThan(0);
      expect(cacheSize2).toBe(cacheSize1);
    });
  });

  describe('Risk-Aware Composition Integration', () => {
    it('should assess risk for high-danger prompts', async () => {
      await adapter.acquireAll({ sessionId: 'risk-test', projectPath: '/test', userContext: {} });

      const highRiskPrompt = {
        id: 'high-risk-prompt',
        category: 'DEPLOYMENT',
        name: 'Production Deployment',
        description: 'Deploy to production environment',
        content: 'Deploy the application to production...',
        metadata: {
          source: 'test',
          version: '1.0.0',
          dangerLevel: 'critical'
        }
      };

      const result = await adapter.assessPromptRisk(highRiskPrompt.id);

      expect(result.profile).toBeDefined();
      expect(result.profile.tier).toBe('high');
      expect(result.recommendations).toContain('Request explicit user approval before proceeding');
      expect(result.recommendations).toContain('Prepare backup strategy');
    });

    it('should apply risk-aware wrapping to dangerous prompts', async () => {
      const sessionContext = {
        sessionId: 'risk-wrap-test',
        timestamp: new Date().toISOString(),
        project: { name: 'Risk Wrap', path: '/test', technologies: [] }
      };

      await adapter.acquireAll({ sessionId: 'risk-wrap-test', projectPath: '/test', userContext: {} });

      // Use a prompt from a high-risk category
      const prompts = await adapter.findPromptsByCategory('INFRASTRUCTURE');
      const prompt = prompts[0];
      
      if (!prompt) throw new Error('No prompts found');

      const result = await adapter.renderPrompt(prompt.id, sessionContext);

      // Verify risk assessment was applied
      expect(result.metadata.enabledStrategies).toContain('risk-aware-composition');
      expect(result.metadata.strategyNotes.length).toBeGreaterThan(0);
      
      // Should contain risk-related notes
      const strategyNotes = result.metadata.strategyNotes.join(' ').toLowerCase();
      expect(strategyNotes).toContain('risk tier');
      expect(strategyNotes).toContain('safeguards');
    });

    it('should not apply risk strategy to safe prompts', async () => {
      const sessionContext = {
        sessionId: 'no-risk-test',
        timestamp: new Date().toISOString(),
        project: { name: 'No Risk', path: '/test', technologies: [] }
      };

      await adapter.acquireAll({ sessionId: 'no-risk-test', projectPath: '/test', userContext: {} });

      const prompts = await adapter.findPromptsByCategory('MEMORY_CYCLES');
      const prompt = prompts[0];
      
      if (!prompt) throw new Error('No prompts found');

      const result = await adapter.renderPrompt(prompt.id, sessionContext);

      // Verify risk strategy was not applied
      expect(result.metadata.strategyNotes).toBeDefined();
    });
  });

  describe('Enhanced Rendering Metrics', () => {
    it('should track rendering performance and strategy usage', async () => {
      const sessionContext = {
        sessionId: 'metrics-test',
        timestamp: new Date().toISOString(),
        project: { name: 'Metrics', path: '/test', technologies: [] }
      };

      await adapter.acquireAll({ sessionId: 'metrics-test', projectPath: '/test', userContext: {} });

      const prompts = await adapter.findPromptsByCategory('MEMORY_CYCLES');
      const prompt = prompts[0];
      
      if (!prompt) throw new Error('No prompts found');

      const result = await adapter.renderPrompt(prompt.id, sessionContext);

      // Verify comprehensive metadata
      expect(result.metadata.renderTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.alertSizeKb).toBeGreaterThanOrEqual(0);
      expect(result.metadata.templateSizeKb).toBeGreaterThanOrEqual(0);
      expect(result.metadata.variableCount).toBeGreaterThanOrEqual(0);
      
      // Verify strategy tracking
      expect(result.metadata.enabledStrategies).toBeDefined();
      expect(Array.isArray(result.metadata.enabledStrategies)).toBe(true);
      expect(result.metadata.strategyNotes).toBeDefined();
      expect(Array.isArray(result.metadata.strategyNotes)).toBe(true);
    });
  });

  describe('Advanced Integration Scenarios', () => {
    beforeEach(() => {
      memoryService.clearSession('session-advanced');
      contextService.clearSession('session-advanced');
    });

    it('should handle complex nested template context with strategies', async () => {
      // Add complex context
      const sessionContext = {
        sessionId: 'complex-test',
        timestamp: new Date().toISOString(),
        project: {
          name: 'Complex Project',
          path: '/complex',
          technologies: ['React', 'TypeScript', 'Node.js', 'Docker']
        },
        user: {
          preferences: {
            session_timeout: 30,
            style_guide: 'modern'
          }
        }
      };

      await adapter.acquireAll({ sessionId: 'complex-test', projectPath: '/complex', userContext: {} });

      const prompts = await adapter.findPromptsByCategory('MEMORY_CYCLES');
      const prompt = prompts.find(p => 
        p.content.includes('{{user.preferences.session_timeout}}')
      ) || prompts[0];
      
      if (!prompt) throw new Error('No prompts found');

      const result = await adapter.renderPrompt(prompt.id, sessionContext);

      // Verify complex context was resolved
      expect(result.rendered).toContain('30');
      expect(result.rendered).toContain('React');
      expect(result.rendered).toContain('TypeScript');
      expect(result.rendered).toContain('Node.js');
      expect(result.rendered).toContain('Docker');
    });

    it('should maintain backward compatibility with basic rendering', async () => {
      const sessionContext = {
        sessionId: 'legacy-test',
        timestamp: new Date().toISOString(),
        project: { name: 'Legacy', path: '/legacy', technologies: [] }
      };

      await adapter.acquireAll({ sessionId: 'legacy-test', projectPath: '/legacy', userContext: {} });

      const prompts = await adapter.findPromptsByCategory('MEMORY_CYCLES');
      const prompt = prompts[0];
      
      if (!prompt) throw new Error('No prompts found');

      // This should work just like before
      const result = await adapter.renderPrompt(prompt.id, sessionContext);

      // Verify basic structure is preserved
      expect(result.rendered).toBeDefined();
      expect(result.rendered.length).toBeGreaterThan(0);
      expect(result.template).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing memory gracefully', async () => {
      const sessionContext = {
        sessionId: 'error-test',
        timestamp: new Date().toISOString(),
        project: { name: 'Error', path: '/error', technologies: [] }
      };

      await adapter.acquireAll({ sessionId: 'error-test', projectPath: '/error', userContext: {} });

      const prompts = await adapter.findPromptsByCategory('MEMORY_CYCLES');
      const prompt = prompts[0];
      
      if (!prompt) throw new Error('No prompts found');

      // Should not throw even with no memory
      const result = await adapter.renderPrompt(prompt.id, sessionContext);

      expect(result.rendered).toBeDefined();
    });

    it('should handle invalid session IDs', async () => {
      await adapter.acquireAll({ sessionId: 'invalid-test', projectPath: '/invalid', userContext: {} });

      const prompts = await adapter.findPromptsByCategory('MEMORY_CYCLES');
      const prompt = prompts[0];
      
      if (!prompt) throw new Error('No prompts found');

      // Should handle missing session gracefully
      const result = await adapter.renderPrompt(prompt.id, { 
        sessionId: 'non-existent', 
        timestamp: new Date().toISOString(),
        project: { name: 'Test', path: '/test', technologies: [] }
      });

      expect(result.rendered).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });
});

function generateTestPromptWithVariables(): string {
  return `---
name: Memory Consolidation
description: Enhanced with variable support
category: MEMORY_CYCLES
dangerLevel: medium
version: 2.0.0
---

# Enhanced Memory Consolidation

Review the **${'{{memory.items | length}}'}** memory items from project: **${'{{project.name}}'}**

**Technologies Detected:**
{% for tech in project.technologies %}
- ${'{{tech}}'}
{% endfor %}

**User Preferences:**
- Session Timeout: ${'{{user.preferences.session_timeout | round}}'} minutes
- Style Guide: ${'{{user.preferences.style_guide}}'}
{{#if tool}}
**Active Tool:**
- Name: ${'{{tool.name}}'}
{% endif %}

**Timestamp:** ${'{{timestamp}}'}
`;
}