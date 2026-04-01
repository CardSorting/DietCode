/**
 * [LAYER: DOMAIN]
 * Principle: Pure model for template logic. No external dependencies.
 */

export class PromptTemplate {
  constructor(private readonly template: string) {}

  /**
   * Simple variable substitution for {{variable}} syntax.
   */
  render(context: Record<string, string>): string {
    let result = this.template;
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  get raw(): string {
    return this.template;
  }
}
