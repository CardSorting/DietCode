/**
 * [LAYER: DOMAIN]
 * Principle: Pure model for skills (composite tasks or prompt-driven capabilities).
 */

export interface Skill {
  name: string;
  description: string;
  prompt: string;
  resources?: string[];
  path?: string;
}
