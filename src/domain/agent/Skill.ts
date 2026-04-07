/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure model for skills (composite tasks or prompt-driven capabilities).
 */

export interface Skill {
  name: string;
  description: string;
  prompt: string;
  metadata?: Record<string, any>;
  resources?: string[];
  path?: string;
}

export interface SkillDefinition {
  name: string;
  type: string;
  description: string;
  version: string;
  cooldownSeconds: number;
  minPrerequisites: number;
  scope: string;
  tags: string[];
}
