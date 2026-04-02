/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Template loading with variable injection and caching
 * Prework Status: Not applicable (new file)
 * 
 * Loads custom prompt templates from files, injects variables, and caches results.
 * Supports prebuilt prompt sets and dynamic template composition.
 */

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
  /**
   * Base directory for template sets
   */
  basePath: string;

  /**
   * Name/ID of the prompt set
   */
  setName: string;

  /**
   * Whether to support hot-reloading (auto-reload on file change)
   */
  hotReload?: boolean;

  /**
   /** Interval for hot-reload checks in ms
   */
  reloadInterval?: number;
}

/**
 * Prompt template loader result
 */
export interface PromptTemplateLoadResult {
  /**
   * The loaded template
   */
  template: PromptTemplate;

  /**
   * Whether the template is new (not cached)
   */
  isFresh: boolean;

  /**
   * Duration of load in ms
   */
  loadDuration: number;
}

/**
 * Prompt template loader
 * 
 * Loads and caches prompt templates from file system.
 * Supports variable interpolation and template composition.
 * 
 * Key responsibilities:
 * - Load templates from files
 * - Validate template structure
 * - Inject variables into templates
 * - Cache templates for performance
 * - Support template composition (meta-templates)
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

  /**
   * Get singleton instance
   */
  static getInstance(config?: PromptTemplateSetConfig): PromptTemplateLoader {
    if (!PromptTemplateLoader.instance && config) {
      PromptTemplateLoader.instance = new PromptTemplateLoader(config);
    }
    return PromptTemplateLoader.instance!;
  }

  /**
   * Load a template by name
   */
  async loadTemplate(
    name: string,
    config?: Partial<PromptTemplateConfig>
  ): Promise<PromptTemplateLoadResult> {
    const startTime = Date.now();
    const cacheKey = this.cacheKey(name);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        template: cached.template,
        isFresh: false,
        loadDuration: 0,
      };
    }

    // Load from file
    const templateContent = await fs.readFile(
      this.templatePath(name),
      'utf-8'
    );

    // Parse and validate template
    const template = this.parseTemplate(templateContent, name);

    // Apply config
    if (config) {
      this.applyConfig(template, config);
    }

    // Cache the template
    this.cache.set(cacheKey, {
      template,
      timestamp: Date.now(),
    });

    const duration = Date.now() - startTime;

    console.log(`✅ Prompt template loaded: ${name} (${duration}ms)`);

    return {
      template,
      isFresh: true,
      loadDuration: duration,
    };
  }

  /**
   * Load a template with variables injected
   */
  async renderTemplate(
    name: string,
    variables?: PromptVariables,
    config?: Partial<PromptTemplateConfig>
  ): Promise<string> {
    const result = await this.loadTemplate(name, config);

    return this.render(
      result.template,
      variables || {}
    );
  }

  /**
   * Render a template with variables
   */
  render(
    template: PromptTemplate,
    variables: PromptVariables
  ): string {
    if (!template.content) {
      throw new Error(`Template ${template.name} has no content`);
    }

    let rendered = template.content;

    // Replace variable placeholders (e.g., {{variableName}})
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      const stringValue = value instanceof Function ? value() : String(value);
      rendered = rendered.replace(regex, stringValue);
    }

    // Replace environment variables (e.g., $VAR_NAME)
    for (const [key, value] of Object.entries(process.env || {})) {
      const regex = new RegExp(`\\$\\{?${key}\\}?`, 'g');
      rendered = rendered.replace(regex, value || '');
    }

    return rendered;
  }

  /**
   * Parse template from file content
   */
  private parseTemplate(content: string, name: string): PromptTemplate {
    // Simple parser: assumes lines starting with # are metadata
    const lines = content.split('\n');
    let contentLines: string[] = [];
    let metadata: Record<string, string> = {};

    for (const line of lines) {
      if (line.trim().startsWith('#')) {
        const [key, ...valueParts] = line.slice(1).trim().split(':');
        const value = valueParts.join(':').trim();
        metadata[key.trim()] = value;
      } else {
        contentLines.push(line);
      }
    }

    const template: PromptTemplate = {
      name,
      description: metadata.description || name,
      version: metadata.version || '1.0.0',
      tags: metadata.tags?.split(',')?.map(t => t.trim()) || [],
      systemPrompt: metadata.systemPrompt || '',
      userPrompt: metadata.userPrompt || '',
      content: contentLines.join('\n'),
      variables: metadata.variables?.split(',')?.map(v => v.trim()) || [],
      enabled: metadata.enabled !== 'false',
    };

    return template;
  }

  /**
   * Apply configuration to template
   */
  private applyConfig(template: PromptTemplate, config: Partial<PromptTemplateConfig>): void {
    // Apply custom system prompt if provided
    if (config.systemPrompt !== undefined) {
      template.systemPrompt = config.systemPrompt;
    }

    // Apply custom user prompt if provided
    if (config.userPrompt !== undefined) {
      template.userPrompt = config.userPrompt;
    }
  }

  /**
   * Hot reload trigger (can be called externally)
   */
  triggerHotReload(): void {
    if (this.config.hotReload) {
      console.log('🔄 Hot reload triggered externally');
      this.hotReload();
    }
  }

  /**
   * Get template file path
   */
  private templatePath(name: string): string {
    return path.join(this.config.basePath, `${name}.txt`);
  }

  /**
   * Get cache key for template
   */
  private cacheKey(name: string): string {
    return `${this.config.setName}:${name}`;
  }

  /**
   * Validate template structure
   */
  private validateTemplate(template: PromptTemplate): boolean {
    if (!template.content || template.content.trim().length === 0) {
      console.error(`❌ Invalid template: ${template.name} has no content`);
      return false;
    }

    if (template.version && /^[0-9]+\.[0-9]+\.[0-9]+$/.test(template.version)) {
      console.error(`⚠️  Malformed version: ${template.version}`);
      return false;
    }

    return true;
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log(`🗑️  Prompt template cache cleared`);
  }

  /**
   * Get cached templates
   */
  getCachedTemplates(): PromptTemplate[] {
    return Array.from(this.cache.values())
      .map(entry => entry.template)
      .filter(t => this.validateTemplate(t));
  }

  /**
   * Get template from cache
   */
  getCachedTemplate(name: string): PromptTemplate | undefined {
    return this.cache.get(this.cacheKey(name))?.template;
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache(ttlMs: number = 5 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > ttlMs) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired template entries`);
    }

    return cleaned;
  }

  /**
   * Check if template exists
   */
  async templateExists(name: string): Promise<boolean> {
    try {
      await fs.access(this.templatePath(name));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all available templates
   */
  async listTemplates(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.basePath);
      return files
        .filter(file => file.endsWith('.txt'))
        .map(file => file.replace('.txt', ''))
        .filter(name => this.cache.has(this.cacheKey(name)));
    } catch (error: any) {
      console.error(`❌ Failed to list templates:`, error);
      return [];
    }
  }

  /**
   * Hot reload (for development)
   */
  async hotReload(): Promise<void> {
    if (!this.config.hotReload) {
      return;
    }

    console.log(`🔄 Hot reloading prompt templates...`);

    const templatesToReload = await this.listTemplates();
    let reloadedCount = 0;

    for (const name of templatesToReload) {
      try {
        await this.loadTemplate(name);
        reloadedCount++;
      } catch (error: any) {
        console.error(`❌ Failed to reload template ${name}:`, error);
      }
    }

    console.log(`✅ Hot reload complete: ${reloadedCount} templates reloaded`);
  }

  /**
   * Update template in place
   */
  async updateTemplate(
    name: string,
    content: string,
    metadata: Partial<Record<string, string>> = {}
  ): Promise<void> {
    const filePath = this.templatePath(name);

    // Build template content
    let fullContent = '';

    // Write metadata
    for (const [key, value] of Object.entries(metadata)) {
      fullContent += `#${key}:${value}\n`;
    }

    // Write content
    fullContent += content;

    // Write file
    await fs.writeFile(filePath, fullContent, 'utf-8');

    // Reload from cache
    this.cache.delete(this.cacheKey(name));

    console.log(`✅ Template updated: ${name}`);
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
