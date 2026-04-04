/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for template rendering and variable substitution.
 */

import type { KnowledgeItem } from '../memory/Knowledge';
import { PromptCategory } from './PromptCategory';
import type { PromptDefinition } from './PromptCategory';

export interface TemplateContext {
  sessionId: string;
  timestamp: string;
  user?: {
    name: string;
    role: string;
    preferences?: Record<string, unknown>;
  };
  project?: {
    name: string;
    path: string;
    technologies: string[];
  };
  event?: {
    type: string;
    data: any;
  };
  memory?: {
    items: KnowledgeItem[];
    summary: string;
  };
  tool?: {
    name: string;
    parameters: Record<string, any>;
  };
}

export interface TemplateVariable {
  name: string;
  value: any;
  source: 'user' | 'project' | 'event' | 'memory' | 'tool' | 'system';
  scope: 'global' | 'local' | 'session';
}

export interface TemplateNode {
  type: 'text' | 'variable' | 'if' | 'for' | 'component' | 'literal';
  content: string;
  children?: TemplateNode[];
  variableName?: string;
  testCondition?: TemplateCondition;
  loopVariable?: string;
  loopItems?: TemplateNode[];
}

export interface TemplateCondition {
  variable: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'matches' | 'in';
  value: any;
}

export interface TemplateRenderOptions {
  strict?: boolean;
  defaultValues?: Record<string, any>;
  context?: Partial<TemplateContext>;
  trace?: boolean;
  visited?: Set<string>;
}

export enum TemplateErrorType {
  MISSING_VARIABLE = 'MISSING_VARIABLE',
  INVALID_CONDITION = 'INVALID_CONDITION',
  MISSING_COMPONENT = 'MISSING_COMPONENT',
  SYNTAX_ERROR = 'SYNTAX_ERROR',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
}

export interface TemplateError {
  type: TemplateErrorType;
  message: string;
  location?: { line: number; column: number };
  variable?: string;
  originalTemplate: string;
}

export class TemplateEngine {
  private variableCache = new Map<string, any>();
  private renderStack = new Set<string>();
  private componentCache = new Map<string, PromptDefinition>();

  /**
   * Renders a prompt with context variable substitution
   */
  render(prompt: string, context: TemplateContext, options: TemplateRenderOptions = {}): string {
    const { strict = true, defaultValues = {}, trace = false } = options;

    if (trace) {
      // Trace logging - allowed in Core layer, but keeping it minimal
    }

    // Parse template into AST
    const ast = this.parseTemplate(prompt);

    // Root context: merge system defaults with provided context
    const fullContext = this.mergeContexts(
      {
        sessionId: context.sessionId,
        timestamp: context.timestamp,
        user: context.user || defaultValues.user,
        project: context.project || defaultValues.project,
        event: context.event || defaultValues.event,
        memory: context.memory || defaultValues.memory,
        tool: context.tool || defaultValues.tool,
      },
      defaultValues,
    );

    // Render AST
    const result = this.renderAST(ast, fullContext, {
      strict,
      trace,
      visited: new Set<string>(),
    });

    // Clean up
    this.variableCache.clear();
    this.renderStack.clear();

    return result;
  }

  /**
   * Parses Tealium Mark template into AST
   */
  private parseTemplate(template: string): TemplateNode {
    // Simple parser - in production would use a proper grammar
    const tokens = this.tokenize(template);
    return this.buildAST(tokens);
  }

  /**
   * Tokenizes template string
   */
  private tokenize(template: string): TemplateToken[] {
    const tokens: TemplateToken[] = [];
    let currentToken = '';
    let inVariable = false;
    let inBlock = false;
    let blockType: string | null = null;

    for (let i = 0; i < template.length; i++) {
      const char = template[i];
      const nextChar = template[i + 1];

      if (!inVariable && !inBlock) {
        if (char === '{' && nextChar === '{') {
          inVariable = true;
          continue;
        }

        if (char === '{' && nextChar === '%') {
          inBlock = true;
          blockType = 'control';
          currentToken += char;
          continue;
        }

        if (char === '{' && nextChar === '#') {
          inBlock = true;
          blockType = 'component';
          currentToken += char;
          continue;
        }

        // Text token
        if (char === '\n') {
          if (currentToken.trim()) {
            tokens.push({ type: 'text', content: currentToken });
          }
          tokens.push({ type: 'newline' });
          currentToken = '';
        } else {
          currentToken += char;
        }
      } else if (inVariable) {
        if (char === '}' && nextChar === '}') {
          tokens.push({ type: 'variable', name: currentToken });
          currentToken = '';
          inVariable = false;
        } else {
          currentToken += char;
        }
      } else if (inBlock) {
        if (char === '}' && nextChar === '%') {
          tokens.push({ type: 'control', content: currentToken });
          currentToken = '';
          inBlock = false;
          blockType = null;
        } else if (char === '}' && nextChar === '#') {
          tokens.push({ type: 'component', content: currentToken });
          currentToken = '';
          inBlock = false;
          blockType = null;
        } else {
          currentToken += char;
        }
      }
    }

    // Handle pending tokens
    if (currentToken.trim()) {
      if (inVariable) {
        tokens.push({ type: 'variable', name: currentToken });
      } else if (inBlock) {
        tokens.push({ type: 'control', content: currentToken });
      } else {
        tokens.push({ type: 'text', content: currentToken });
      }
    }

    return tokens;
  }

  /**
   * Builds AST from tokens
   */
  private buildAST(tokens: TemplateToken[]): TemplateNode {
    const root: TemplateNode = { type: 'literal', content: '' };
    const stack: TemplateNode[] = [root];
    let deepest = root;

    for (const token of tokens) {
      if (token.type === 'newline') {
        if (deepest.content) {
          deepest.content += '\n';
        }
        continue;
      }

      if (token.type === 'text') {
        const textNode: TemplateNode = {
          type: 'text',
          content: token.content || '',
          children: [],
        };
        const parent = stack[stack.length - 1];
        if (parent?.children) {
          parent.children.push(textNode);
          deepest = textNode;
        }
      } else if (token.type === 'variable') {
        const variableNode: TemplateNode = {
          type: 'variable',
          variableName: token.name || '',
          content: '',
          children: [],
        };
        const parent = stack[stack.length - 1];
        if (parent?.children) {
          parent.children.push(variableNode);
          deepest = variableNode;
        }
      } else if (token.type === 'control') {
        const command = (token.content || '').trim().split(/\s+/)[0];

        const normalizedCommand = command as 'if' | 'for';

        if (normalizedCommand === 'if' || normalizedCommand === 'for') {
          const args = (token.content || '').trim().split(/\s+/).slice(1).join(' ');
          const newNode: TemplateNode = {
            type: normalizedCommand,
            content: '',
            children: [],
            testCondition: this.parseCondition(args) ?? undefined,
          };
          const parent = stack[stack.length - 1];
          if (parent?.children) {
            parent.children.push(newNode);
            stack.push(newNode);
            deepest = newNode;
          }
        }
      }
    }

    return root;
  }

  /**
   * Parses condition string like "var == value" or "var in items"
   */
  private parseCondition(condition: string): TemplateCondition | null {
    const inMatch = condition.match(/(\w+)\s+in\s+(.+)/);
    if (inMatch?.[1] && inMatch[2]) {
      return {
        variable: inMatch[1].trim(),
        operator: 'in',
        value: inMatch[2].trim(),
      };
    }

    const match = condition.match(/(\w+)\s*(==|!=|>=|>|<=|<)\s*(.+)/);
    if (match?.[1] && match[2] && match[3]) {
      return {
        variable: match[1].trim(),
        operator: match[2] as 'eq' | 'ne' | 'gt' | 'lt',
        value: this.parseValue(match[3].trim()),
      };
    }

    return null;
  }

  private parseValue(inputValue: string): any {
    const value = inputValue.trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      return value.slice(1, -1);
    }
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (!Number.isNaN(Number(value))) return Number(value);
    return value;
  }

  private renderAST(
    node: TemplateNode,
    context: TemplateContext,
    options: TemplateRenderOptions & { visited: Set<string> },
  ): string {
    switch (node.type) {
      case 'text':
        return node.content;

      case 'variable':
        if (!node.variableName) return '';
        return this.resolveVariable(node.variableName, context, options);

      case 'if': {
        const ifResult = this.renderIf(node, context, options);
        return ifResult;
      }

      case 'for': {
        const forResult = this.renderFor(node, context, options);
        return forResult;
      }

      case 'literal':
        return node.content;

      default:
        return '';
    }
  }

  private resolveVariable(
    name: string,
    context: TemplateContext,
    options: TemplateRenderOptions,
  ): string {
    const [parent, ...keys] = name.split('.');

    const visitedSet = options.visited || new Set<string>();
    if (visitedSet.has(name)) {
      throw new Error(`Circular reference detected: ${name}`);
    }
    visitedSet.add(name);

    let value: any = context[parent as keyof TemplateContext];

    for (const key of keys) {
      if (
        value &&
        typeof value === 'object' &&
        (value as Record<string, any>)[key as string] !== undefined
      ) {
        value = (value as Record<string, any>)[key as string];
      } else {
        visitedSet.delete(name);

        const defaultValuesRecord = options.defaultValues as Record<string, any>;
        return options.strict ? `{{${name}}}` : defaultValuesRecord?.[name] || '';
      }
    }

    visitedSet.delete(name);

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }

    return String(value || '');
  }

  private renderIf(
    node: TemplateNode,
    context: TemplateContext,
    options: TemplateRenderOptions,
  ): string {
    if (!node.testCondition) return '';

    const result = this.testCondition(node.testCondition, context);
    if (!result) return '';

    const childrenArr = node.children;
    if (!childrenArr) return '';

    const safeOptions: TemplateRenderOptions & { visited: Set<string> } = options
      ? { ...options, visited: options.visited || new Set<string>() }
      : { strict: true, visited: new Set<string>(), context: {} };
    const rendered = childrenArr
      .map((child) => this.renderAST(child, context, safeOptions))
      .join('');

    return rendered || '';
  }

  private testCondition(condition: TemplateCondition, context: TemplateContext): boolean {
    if (!condition.variable) return false;

    const { variable, operator, value } = condition;

    const [parent, ...keys] = variable.split('.');
    let varValue: any = context[parent as keyof TemplateContext];

    for (const key of keys) {
      if (
        varValue &&
        typeof varValue === 'object' &&
        (varValue as Record<string, any>)[key as string] !== undefined
      ) {
        varValue = (varValue as Record<string, any>)[key as string];
      } else {
        return false;
      }
    }

    switch (operator) {
      case 'eq':
        return varValue === value;
      case 'ne':
        return varValue !== value;
      case 'gt':
        return Number(varValue) > Number(value);
      case 'lt':
        return Number(varValue) < Number(value);
      default:
        return false;
    }
  }

  private renderFor(
    node: TemplateNode,
    context: TemplateContext,
    options: TemplateRenderOptions,
  ): string {
    if (!node.testCondition || !node.children) return '';

    const { variable, operator } = node.testCondition;

    if (operator !== 'in') return '';

    const parts = variable.split(' in ');
    const targetVar = parts[0]?.trim();
    const sourceVar = parts[1]?.trim();
    if (!targetVar || !sourceVar) return '';

    const keys = sourceVar.split('.');
    const firstKey = keys[0];
    if (!firstKey) return '';

    let items: any = context[firstKey as keyof TemplateContext];
    if (!items) return '';

    for (let i = 1; i < keys.length; i++) {
      if (
        items &&
        typeof items === 'object' &&
        (items as Record<string, any>)[keys[i] as string] !== undefined
      ) {
        items = (items as Record<string, any>)[keys[i] as string];
      }
    }

    if (!Array.isArray(items)) {
      return '';
    }

    return items
      .map((item: any | undefined, index: number) => {
        const visitedSet = options.visited || new Set<string>();
        const contextWithItem: TemplateContext = {
          sessionId: context.sessionId,
          timestamp: context.timestamp,
          user: context.user,
          project: context.project,
          event: context.event,
          memory: context.memory,
          tool: context.tool,
          [sourceVar]: items,
        };

        const childrenArr = node.children;
        if (!childrenArr) return '';

        return childrenArr
          .map((child) =>
            this.renderAST(child, contextWithItem, { ...options, visited: visitedSet }),
          )
          .join('\n');
      })
      .join('\n');
  }

  validateTemplate(template: string): { valid: boolean; errors: TemplateError[] } {
    const errors: TemplateError[] = [];

    try {
      const ast = this.parseTemplate(template);
      this.validateAST(ast, template, errors, 0);
    } catch (error) {
      errors.push({
        type: TemplateErrorType.SYNTAX_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
        originalTemplate: template,
      });
    }

    return { valid: errors.length === 0, errors };
  }

  private validateAST(
    node: TemplateNode,
    template: string,
    errors: TemplateError[],
    line: number,
  ): void {
    if (node.testCondition) {
      if (!node.testCondition.variable) {
        errors.push({
          type: TemplateErrorType.INVALID_CONDITION,
          message: 'Empty if condition',
          location: { line, column: this.getColumn(template, line) },
          originalTemplate: template,
        });
      }
    }

    if (node.children) {
      for (const child of node.children) {
        this.validateAST(child, template, errors, line);
      }
    }
  }

  private getColumn(template: string, line: number): number {
    let currentLine = 1;
    let col = 1;

    for (let i = 0; i < template.length; i++) {
      if (currentLine === line && col === 1) {
        return i + 1;
      }
      if (template[i] === '\n') {
        currentLine++;
        col = 1;
      } else {
        col++;
      }
    }

    return template.length + 1;
  }

  compile(template: string): TemplateNode {
    return this.parseTemplate(template);
  }

  renderCompiled(
    ast: TemplateNode,
    context: TemplateContext,
    options?: Omit<TemplateRenderOptions, 'visited'> & { visited: Set<string> },
  ): string {
    const visitedSet = options?.visited || new Set<string>();
    return this.renderAST(ast, context, {
      strict: options?.strict,
      defaultValues: options?.defaultValues,
      trace: options?.trace,
      visited: visitedSet,
    } as TemplateRenderOptions & { visited: Set<string> });
  }

  private mergeContexts(
    priorityContext: Partial<TemplateContext>,
    defaultValues: Record<string, any>,
  ): TemplateContext {
    const merged: TemplateContext = {
      sessionId: priorityContext.sessionId || defaultValues.sessionId || 'unknown',
      timestamp: priorityContext.timestamp || new Date().toISOString(),
      user: { ...defaultValues.user, ...priorityContext.user },
      project: { ...defaultValues.project, ...priorityContext.project },
      event: { ...defaultValues.event, ...priorityContext.event },
      memory: defaultValues.memory || priorityContext.memory,
      tool: defaultValues.tool || priorityContext.tool,
    };

    return merged;
  }
}

interface TemplateToken {
  type: 'text' | 'variable' | 'control' | 'component' | 'newline';
  content?: string;
  name?: string;
}

export function createTemplateContext(): TemplateContext {
  return {
    sessionId: '',
    timestamp: new Date().toISOString(),
    user: { name: 'unknown', role: 'developer' },
  };
}
