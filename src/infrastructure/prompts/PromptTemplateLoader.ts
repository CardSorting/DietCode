import { promises as fs } from 'fs';
import path from 'path';
import type {
  PromptTemplate,
  PromptTemplateConfig,
  PromptVariables,
} from '../../domain/prompts/PromptTemplate';

/**
 * Prompt template set configuration
 */
export interface PromptTemplateSetConfig {
  basePath: string;
  setName: string;
  hotReload?: boolean;
  reloadInterval?: number;
}

/**
 * Prompt template loader result
 */
export interface PromptTemplateLoadResult {
  template: PromptTemplate;
  isFresh: boolean;
  loadDuration: number;
}

/**
 * Prompt template loader
 */
export class PromptTemplateLoader {
  private static instance: PromptTemplateLoader | null = null;
  private config: Required<PromptTemplateSetConfig>;
  private cache = new Map<string, { template: PromptTemplate; timestamp: number }>();

  private constructor(config: PromptTemplateSetConfig) {
    this.config = {
      basePath: config.basePath,
      setName: config.setName,
      hotReload: config.hotReload ?? false,
      reloadInterval: config.reloadInterval ?? 5000,
    };
  }

  static getInstance(config?: PromptTemplateSetConfig): PromptTemplateLoader {
    if (!PromptTemplateLoader.instance && config) {
      PromptTemplateLoader.instance = new PromptTemplateLoader(config);
    }
    return PromptTemplateLoader.instance!;
  }

  async loadTemplate(
    name: string,
    config?: Partial<PromptTemplateConfig>
  ): Promise<PromptTemplateLoadResult> {
    const startTime = Date.now();
    const cacheKey = this.cacheKey(name);

    const cached = this.cache.get(cacheKey);
    if (cached && !this.config.hotReload) {
      return {
        template: cached.template,
        isFresh: false,
        loadDuration: 0,
      };
    }

    const templateContent = await fs.readFile(
      this.templatePath(name),
      'utf-8'
    );

    const template = this.parseTemplate(templateContent, name);

    if (config) {
      this.applyConfig(template, config);
    }

    this.cache.set(cacheKey, {
      template,
      timestamp: Date.now(),
    });

    return {
      template,
      isFresh: true,
      loadDuration: Date.now() - startTime,
    };
  }

  async renderTemplate(
    name: string,
    variables?: PromptVariables,
    config?: Partial<PromptTemplateConfig>
  ): Promise<string> {
    const result = await this.loadTemplate(name, config);
    return this.render(result.template, variables || {});
  }

  render(
    template: PromptTemplate,
    variables: PromptVariables
  ): string {
    let rendered = template.content;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      const stringValue = typeof value === 'function' ? value() : String(value);
      rendered = rendered.replace(regex, stringValue);
    }

    return rendered;
  }

  private parseTemplate(content: string, name: string): PromptTemplate {
    const lines = content.split('\n');
    let contentLines: string[] = [];
    let metadata: Record<string, string> = {};

    for (const line of lines) {
      if (line.trim().startsWith('#')) {
        const parts = line.slice(1).trim().split(':');
        const key = parts[0]?.trim();
        const value = parts.slice(1).join(':').trim();
        if (key) metadata[key] = value;
      } else {
        contentLines.push(line);
      }
    }

    return {
      name,
      description: metadata.description || name,
      version: metadata.version || '1.0.0',
      tags: metadata.tags?.split(',').map(t => t.trim()) || [],
      systemPrompt: metadata.systemPrompt || '',
      userPrompt: metadata.userPrompt || '',
      content: contentLines.join('\n'),
      variables: metadata.variables?.split(',').map(v => v.trim()) || [],
      enabled: metadata.enabled !== 'false',
    };
  }

  private applyConfig(template: PromptTemplate, config: Partial<PromptTemplateConfig>): void {
    if (config.systemPrompt !== undefined) {
      template.systemPrompt = config.systemPrompt;
    }
    if (config.userPrompt !== undefined) {
      template.userPrompt = config.userPrompt;
    }
  }

  private templatePath(name: string): string {
    return path.join(this.config.basePath, `${name}.txt`);
  }

  private cacheKey(name: string): string {
    return `${this.config.setName}:${name}`;
  }

  async hotReload(): Promise<void> {
    if (!this.config.hotReload) return;
    const files = await fs.readdir(this.config.basePath);
    for (const file of files) {
      if (file.endsWith('.txt')) {
        await this.loadTemplate(file.replace('.txt', ''));
      }
    }
  }
}

/**
 * Create a lazy prompt template loader (singleton pattern with instantiation delay)
 */
export function createLazyPromptTemplateLoader(
  basePath: string,
  setName: string
): PromptTemplateLoader {
  let loader: PromptTemplateLoader | null = null;

  return new Proxy({} as PromptTemplateLoader, {
    get(target, prop: string) {
      if (prop.startsWith('get')) {
        return () => loader!.loadTemplate((prop as string).replace('get', ''));
      }
      if (prop.startsWith('render')) {
        return (name: string, vars?: PromptVariables) => loader!.renderTemplate(name, vars);
      }
      if (prop === 'refresh') {
        return () => loader!.hotReload();
      }
      if (loader) {
        return (loader as any)[prop];
      }
      // Lazy instantiation
      loader = PromptTemplateLoader.getInstance({
        basePath,
        setName,
        hotReload: true,
      });
      return (loader as any)[prop];
    }
  });
}
