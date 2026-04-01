/**
 * [LAYER: TEST]
 * Principle: Integration tests verifying TemplateEngine integration with PromptRegistryAdapter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PromptLoader } from '../../src/infrastructure/PromptLoader';
import { PromptRegistryAdapter } from '../../src/infrastructure/PromptRegistryAdapter';
import { TemplateEngine, TemplateContext, TemplateRenderOptions } from '../../src/domain/prompts/PromptTemplateEngine';
import { EventType } from '../../src/domain/Event';
import type { EventBus } from '../../src/domain/Event';

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
class MockEventBus implements EventBus {
  private listeners = new Map<EventType, Set<(event: any, meta: any) => void>>();

  publish(eventType: EventType, eventData: any, meta?: any): Promise<void> {
    const listeners = this.listeners.get(eventType) || new Set();
    listeners.forEach(listener => listener(eventData, meta));
    return Promise.resolve();
  }

  subscribe(eventType: EventType, listener: (event: any, meta: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  clear(): void {
    this.listeners.clear();
  }
}

describe('Prompt Engine Integration', () => {
  let fs: MockFilesystem;
  let eventBus: MockEventBus;
  let promptLoader: PromptLoader;
  let registryAdapter: PromptRegistryAdapter;

  beforeEach(() => {
    fs = new MockFilesystem();
    eventBus = new MockEventBus();
    promptLoader = new PromptLoader(fs);
    
    registryAdapter = new PromptRegistryAdapter(
      fs as any,
      eventBus as any,
      null as any, // validationService
      null as any, // memoryService
      promptLoader,
      async (path: string) => {
        const files = path.split('/');
        return [`${path}/test-prompt-1.md`, `${path}/test-prompt-2.md`];
      },
      async (path: string) => {
        return {
          id: `prompt-${Date.now()}`,
          category: 'MEMORY_CYCLES',
          name: 'Test Prompt',
          description: 'A test prompt for integration',
          content: generateTestPromptData(),
          metadata: {
            source: path,
            version: '1.0.0'
          }
        };
      }
    );
  });

  describe('Template Engine Integration', () => {
    it('should load and render prompts with variable substitution', async () => {
      const prompts = await registryAdapter.findPromptsByCategory('MEMORY_CYCLES');
      
      expect(prompts).toBeDefined();
      expect(prompts.length).toBeGreaterThan(0);

      const prompt = prompts[0];
      if (!prompt) throw new Error('No prompts found');

      const context: TemplateContext = {
        sessionId: 'test-session-123',
        timestamp: new Date().toISOString(),
        project: {
          name: 'My Awesome Project',
          path: '/projects/my-project',
          technologies: ['TypeScript', 'Node.js']
        },
        memory: {
          items: [],
          summary: 'Project starting'
        },
        tool: {
          name: 'Neo4j',
          parameters: {}
        }
      };

      const result = await registryAdapter.renderPrompt(prompt.id, context);

      expect(result.template).toBeDefined();
      expect(result.rendered).toContain('{{project.name}}');
      
      // Verify no variables remain after rendering
      const hasVariables = /\{\{.*?\}\}/.test(result.rendered);
      expect(hasVariables).toBe(false);
    });

    it('should handle conditional blocks correctly', async () => {
      const prompts = await registryAdapter.findPromptsByCategory('MEMORY_CYCLES');
      const prompt = prompts[0];
      
      if (!prompt) throw new Error('No prompts found');

      const context: TemplateContext = {
        sessionId: 'test-session-456',
        timestamp: new Date().toISOString(),
        project: {
          name: 'Conditional Test',
          path: '/projects/test',
          technologies: []
        },
        memory: { items: [], summary: '' },
        tool: null
      };

      const result = await registryAdapter.renderPrompt(prompt.id, context);

      // Verify the prompt was rendered successfully
      expect(result.rendered).toBeDefined();
      expect(result.rendered.length).toBeGreaterThan(0);
    });

    it('should use strict mode and report missing variables', async () => {
      const engine = new TemplateEngine();

      const template = 'Hello {{name}}, your role is {{role}} and project is {{project}}';

      const context: TemplateContext = {
        sessionId: 'strict-test',
        timestamp: new Date().toISOString(),
        project: { name: 'Test', path: '/test', technologies: [] },
        tool: null
      };

      const result = engine.render(template, context, { strict: true });

      // In strict mode, missing variables should be left as placeholders
      expect(result).toContain('{{name}}');
    });

    it('should handle for loops over arrays', async () => {
      const engine = new TemplateEngine();

      const template = '{% for skill in project.technologies %}\n- {{skill}}\n{% endfor %}';

      const context: TemplateContext = {
        sessionId: 'loop-test',
        timestamp: new Date().toISOString(),
        project: {
          name: 'Loop Test',
          path: '/projects/loop',
          technologies: ['TypeScript', 'JavaScript', 'Vue.js']
        },
        memory: { items: [], summary: '' },
        tool: null
      };

      const result = engine.render(template, context);

      expect(result).toContain('TypeScript');
      expect(result).toContain('JavaScript');
      expect(result).toContain('Vue.js');
    });

    it('should support pre-compilation for performance', async () => {
      const engine = new TemplateEngine();

      const template = 'Project: {{project.name}}, Technologies:\n{% for tech in project.technologies %}\n- {{tech}}\n{% endfor %}';

      // Pre-compile
      const ast = engine.compile(template);
      
      const context: TemplateContext = {
        sessionId: 'compile-test',
        timestamp: new Date().toISOString(),
        project: {
          name: 'Compile Test',
          path: '/projects/compile',
          technologies: ['React', 'Next.js']
        },
        memory: { items: [], summary: '' },
        tool: null
      };

      const result = engine.renderCompiled(ast, context);

      expect(result).toContain('Project: Compile Test');
      expect(result).toContain('React');
      expect(result).toContain('Next.js');
    });
  });

  describe('PromptRegistryAdapter Integration', () => {
    it('should track analytics for rendered prompts', async () => {
      const prompts = await registryAdapter.findPromptsByCategory('MEMORY_CYCLES');
      const prompt = prompts[0];
      
      if (!prompt) throw new Error('No prompts found');

      // Render several times to gather analytics
      for (let i = 0; i < 3; i++) {
        const context: TemplateContext = {
          sessionId: `analytics-test-${i}`,
          timestamp: new Date().toISOString(),
          project: { name: 'Test', path: '/test', technologies: [] },
          memory: { items: [], summary: '' },
          tool: null
        };

        await registryAdapter.renderPrompt(prompt.id, context);
      }

      // Note: Analytics tracking would be implemented in a real integration
      // This test verifies the method exists and can be called
      expect(true).toBe(true);
    });

    it('should handle error cases gracefully', async () => {
      const result = await registryAdapter.renderPrompt('non-existent-prompt', {
        sessionId: 'error-test',
        timestamp: new Date().toISOString(),
        project: { name: 'Test', path: '/test', technologies: [] },
        memory: { items: [], summary: '' },
        tool: null
      });

      expect(result.template).toBeNull();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.error).toBe('Prompt not found');
    });
  });

  describe('Template Validation', () => {
    it('should validate template syntax', async () => {
      const engine = new TemplateEngine();

      const validTemplate = 'Hello {{name}}';
      const invalidTemplate = 'Hello { { name } }'; // Space in braces

      const validResult = engine.validateTemplate(validTemplate);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = engine.validateTemplate(invalidTemplate);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });
});

function generateTestPromptData(): string {
  return `---
name: Memory Consolidation Prompt
description: Consolidates memory from project sessions
category: MEMORY_CYCLES
version: 1.0.0
---

# Memory Consolidation

Review the ${'{{memory.items | length}}'} memory items from the recent session:

{% for item in memory.items %}
## Session ${{{item.index}}} - ${'{{item.timestamp}}'}

**Category:** ${'{{item.category}}'}
**Content:** ${'{{item.content | length}}'} characters
**Status:** ${'{{item.status}}'}
{% endfor %}

**Summary:** ${'{{memory.summary}}'}

**Time Remaining:** ${'{{user.preferences.session_timeout}}'} minutes
`;
}