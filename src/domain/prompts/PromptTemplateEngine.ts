/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for template rendering and variable substitution.
 */

import { PromptDefinition, PromptCategory } from './PromptCategory';

export interface TemplateContext {
  sessionId: string;
  timestamp: string;
  user?: {
    name: string;
    role: string;
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
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'matches';
  value: any;
}

export interface TemplateRenderOptions {
  strict?: boolean;
  defaultValues?: Record<string, any>;
  context?: Partial<TemplateContext>;
  trace?: boolean;
}

export enum TemplateErrorType {
  MISSING_VARIABLE = 'MISSING_VARIABLE',
  INVALID_CONDITION = 'INVALID_CONDITION',
  MISSING_COMPONENT = 'MISSING_COMPONENT',
  SYNTAX_ERROR = 'SYNTAX_ERROR',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  TYPE_MISMATCH = 'TYPE_MISMATCH'
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
  render(
    prompt: string,
    context: TemplateContext,
    options: TemplateRenderOptions = {}
  ): string {
    const { strict = true, defaultValues = {}, trace = false } = options;
    
    if (trace) console.log('[TemplateEngine] Rendering:', prompt.substring(0, 100) + '...');

    // Parse template into AST
    const ast = this.parseTemplate(prompt);
    
    // Root context: merge system defaults with provided context
    const fullContext = this.mergeContexts({
      sessionId: context.sessionId,
      timestamp: context.timestamp,
      user: context.user || defaultValues.user,
      project: context.project || defaultValues.project,
      event: context.event || defaultValues.event,
      memory: context.memory || defaultValues.memory,
      tool: context.tool || defaultValues.tool
    }, defaultValues);

    // Render AST
    const result = this.renderAST(ast, fullContext, {
      strict,
      trace,
      visited: new Set<string>()
    });

    if (trace) console.log('[TemplateEngine] Rendered to:', result.substring(0, 100) + '...');

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
      } 
      else if (inVariable) {
        if (char === '}' && nextChar === '}') {
          tokens.push({ type: 'variable', name: currentToken });
          currentToken = '';
          inVariable = false;
          continue;
        } else {
          currentToken += char;
        }
      }
      else if (inBlock) {
        if (char === '}' && nextChar === '%') {
          tokens.push({ type: 'control', content: currentToken });
          currentToken = '';
          inBlock = false;
          blockType = null;
          continue;
        } else if (char === '}' && nextChar === '#') {
          tokens.push({ type: 'component', content: currentToken });
          currentToken = '';
          inBlock = false;
          blockType = null;
          continue;
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
        deepest.content += '\n';
        continue;
      }

      if (token.type === 'text') {
        deepest = {
          type: 'text',
          content: token.content,
          children: []
        };
        stack[stack.length - 1].children!.push(deepest);
        deepest = deepest;
      }
      else if (token.type === 'variable') {
        const variableNode: TemplateNode = {
          type: 'variable',
          variableName: token.name,
          children: []
        };
        stack[stack.length - 1].children!.push(variableNode);
        deepest = variableNode;
      }
      else if (token.type === 'control') {
        const [command, ...args] = token.content.trim().split(/\s+/);
        
        if (command === 'if' || command === 'for') {
          const condition = args.join(' ');
          const newNode: TemplateNode = {
            type: command,
            testCondition: this.parseCondition(condition),
            children: []
          };
          stack[stack.length - 1].children!.push(newNode);
          stack.push(newNode);
          deepest = newNode;
        }
      }
    }

    return root;
  }

  /**
   * Parses condition string like "var == value"
   */
  private parseCondition(condition: string): TemplateCondition {
    const match = condition.match(/(\w+)\s*(==|!=|>=|>|<=|<)\s*(.+)/);
    if (match) {
      return {
        variable: match[1].trim(),
        operator: match[2] as any,
        value: this.parseValue(match[3].trim())
      };
    }
    throw new Error(`Invalid condition: ${condition}`);
  }

  private parseValue(value: string): any {
    value = value.trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      return value.slice(1, -1);
    }
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (!isNaN(Number(value))) return Number(value);
    return value;
  }

  /**
   * Renders AST with context
   */
  private renderAST(
    node: TemplateNode,
    context: TemplateContext,
    options: TemplateRenderOptions & { visited: Set<string> }
  ): string {
    switch (node.type) {
      case 'text':
        return node.content;

      case 'variable':
        return this.resolveVariable(node.variableName!, context, options);

      case 'if':
        return this.renderIf(node, context, options);

      case 'for':
        return this.renderFor(node, context, options);

      case 'literal':
        return node.content;

      default:
        return '';
    }
  }

  /**
   * Resolves a variable by name
   */
  private resolveVariable(
    name: string,
    context: TemplateContext,
    options: TemplateRenderOptions
  ): string {
    const [parent, ...keys] = name.split('.');

    // Circular reference guard
    if (options.visited.has(name)) {
      throw new Error(`Circular reference detected: ${name}`);
    }
    options.visited.add(name);

    let value: any = context[parent];

    // Walk nested properties
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return options.strict ? 
          `{{${name}}}` : 
          options.defaultValues?.[name] || '';
      }
    }

    // Clean up from circular reference guard
    options.visited.delete(name);

    // Convert to string
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }

    return String(value || '');
  }

  /**
   * Renders conditional block ({% if condition %})
   */
  private renderIf(
    node: TemplateNode,
    context: TemplateContext,
    options: TemplateRenderOptions
  ): string {
    if (!node.testCondition) return '';

    const result = this.testCondition(node.testCondition, context);
    
    if (result) {
      return node.children?.map(child => 
        this.renderAST(child, context, options)
      ).join('') || '';
    }

    return '';
  }

  /**
   * Tests a condition against context
   */
  private testCondition(condition: TemplateCondition, context: TemplateContext): boolean {
    const { variable, operator, value } = condition;

    // Navigate to variable
    const [parent, ...keys] = variable.split('.');
    let varValue: any = context[parent];

    for (const key of keys) {
      if (varValue && typeof varValue === 'object' && key in varValue) {
        varValue = varValue[key];
      } else {
        return false;
      }
    }

    switch (operator) {
      case 'eq': return varValue == value;
      case 'ne': return varValue != value;
      case 'gt': return Number(varValue) > Number(value);
      case 'lt': return Number(varValue) < Number(value);
      default: return false;
    }
  }

  /**
   * Renders for loop ({% for item in variable %})
   */
  private renderFor(
    node: TemplateNode,
    context: TemplateContext,
    options: TemplateRenderOptions
  ): string {
    // Extract loop variable from node.testCondition (e.g., "var in items")
    if (!node.testCondition) return '';

    const [targetVar, sourceVar] = node.testCondition.variable.split(' in ');
    
    // Navigate to source array
    const [parent, ...keys] = sourceVar.split('.');
    let items: any[] = context[parent];

    for (const key of keys) {
      if (items && typeof items === 'object' && key in items) {
        items = items[key];
      }
    }

    if (!Array.isArray(items)) {
      console.warn(`[TemplateEngine] Iteration target is not an array: ${sourceVar}`);
      return '';
    }

    // Render each item
    return items.map((item, index) => {
      // Create partial context for this iteration
      const partialContext = { ...context };
      
      // Convert array item to object format (preserve order)
      partialContext[targetVar] = {
        value: item,
        index,
        isFirst: index === 0,
        isLast: index === items.length - 1,
        first: index === 0,
        last: index === items.length - 1
      };

      // Create context with dot notation for variable access
      const visited = new Set<string>(
        options.visited || []
      );
      const contextWithItem = {
        ...context,
        [sourceVar]: items
      };

      return node.children?.map(child => 
        this.renderAST(child, contextWithItem, { ...options, visited })
      ).join('\n') || '';
    }).join('\n');
  }

  /**
   * Validates a template for syntax errors
   */
  validateTemplate(template: string): { valid: boolean; errors: TemplateError[] } {
    const errors: TemplateError[] = [];
    
    try {
      const ast = this.parseTemplate(template);
      this.validateAST(ast, template, errors, 0);
    } catch (error) {
      errors.push({
        type: TemplateErrorType.SYNTAX_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
        originalTemplate: template
      });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Recursively validates AST
   */
  private validateAST(
    node: TemplateNode,
    template: string,
    errors: TemplateError[],
    line: number
  ): void {
    // Validate if blocks
    if (node.testCondition) {
      // Simple validation - ensure variable exists
      if (!node.testCondition.variable) {
        errors.push({
          type: TemplateErrorType.INVALID_CONDITION,
          message: 'Empty if condition',
          location: { line, column: this.getColumn(template, line) },
          originalTemplate: template
        });
      }
    }

    // Validate children
    if (node.children) {
      for (const child of node.children) {
        this.validateAST(child, template, errors, line);
      }
    }
  }

  /**
   * Simple line/column finder (simplified implementation)
   */
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

  /**
   * Pre-compiles a template for performance
   */
  compile(template: string): TemplateNode {
    return this.parseTemplate(template);
  }

  /**
   * Renders a pre-compiled template
   */
  renderCompiled(
    ast: TemplateNode,
    context: TemplateContext,
    options: TemplateRenderOptions = {}
  ): string {
    return this.renderAST(ast, context, {
      ...options,
      visited: new Set<string>()
    });
  }

  /**
   * Merges context layers
   */
  private mergeContexts(
    priorityContext: Partial<TemplateContext>,
    defaultValues: Record<string, any>
  ): TemplateContext {
    return {
      sessionId: priorityContext.sessionId || defaultValues.sessionId || 'unknown',
      timestamp: priorityContext.timestamp || new Date().toISOString(),
      user: { ...defaultValues.user, ...priorityContext.user },
      project: { ...defaultValues.project, ...priorityContext.project },
      event: { ...defaultValues.event, ...priorityContext.event },
      memory: defaultValues.memory || priorityContext.memory,
      tool: defaultValues.tool || priorityContext.tool
    };
  }
}

interface TemplateToken {
  type: 'text' | 'variable' | 'control' | 'component' | 'newline';
  content?: string;
  name?: string;
}