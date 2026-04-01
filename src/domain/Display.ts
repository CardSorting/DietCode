/**
 * [LAYER: DOMAIN]
 * Principle: Pure interface for visual communication.
 */

export interface Display {
  /**
   * Displays a status message with an optional spinner.
   */
  status(message: string, type?: 'info' | 'success' | 'warn' | 'error'): void;

  /**
   * Displays a progress bar or step-count.
   */
  progress(current: number, total: number, message: string): void;

  /**
   * Displays a rich code block with syntax highlighting (simulated).
   */
  code(content: string, language: string): void;

  /**
   * Displays a strategic alert or important notification.
   */
  alert(title: string, body: string, level?: 'important' | 'warning' | 'caution'): void;

  /**
   * Displays a thought block (agent reasoning).
   */
  thought(reasoning: string): void;
}
