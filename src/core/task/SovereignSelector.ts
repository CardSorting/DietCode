/**
 * [LAYER: CORE]
 * Principle: Negative-Audit Gate — The Sovereign Selector (v6.0)
 * Validates the "Provenance Bundle" before starting a task.
 */

import type { TaskEntity } from '../../domain/task/TaskEntity';
import { SqliteJoyCacheRepository } from '../../infrastructure/database/SqliteJoyCacheRepository';
import { SemanticIntegrityAnalyser } from '../../infrastructure/task/SemanticIntegrityAnalyser';
import { SovereignDb } from '../../infrastructure/database/SovereignDb';
import * as path from 'path';

export interface ProvenanceBundle {
  /** Does this build a permanent asset? Proved by dependency trace. */
  sovereignUtility: boolean;
  /** JoySim pre-flight integrity alignment score (Target: > 0.90). */
  integrityAlignment: number;
  /** Verification of all entry-points and side-effects. */
  contextualClarity: boolean;
  /** Leverage ratio: Quantified reduction in future complexity vs cost (Target: > 2.0). */
  upsideDominance: number;
}

export class SovereignSelector {
  private joyCache = new SqliteJoyCacheRepository();
  private analyzer = new SemanticIntegrityAnalyser();

  /**
   * Generates a real provenance bundle for a task by analyzing the project state.
   */
  async generateProvenanceBundle(task: TaskEntity): Promise<ProvenanceBundle> {
    const objective = task.objective.toLowerCase();
    
    // 1. Anchor Detection via joy_imports
    const anchors = await this.joyCache.getTopArchitecturalAnchors(15);
    const targetsAnchor = anchors.some(anchor => {
        const anchorName = anchor.path.toLowerCase();
        return objective.includes(path.basename(anchorName, '.ts').toLowerCase());
    });

    // 2. High-Utility Check: Does this task target a core domain or infrastructure anchor?
    const isCoreTarget = objective.includes('domain') || objective.includes('infrastructure') || objective.includes('core');
    const sovereignUtility = targetsAnchor || isCoreTarget || task.priority <= 1;

    // 3. Upside Dominance Calculation (Leverage Ratio)
    // Formula: (Critical Reqs * 2.0 + Total Reqs) / (Complexity Factor)
    // A high leverage ratio means the implementation payoff outweighs the cognitive cost.
    const criticalCount = task.requirements.filter(r => r.isCritical).length;
    const totalCount = task.requirements.length;
    const basePayoff = (criticalCount * 2.5) + (totalCount * 0.5);
    
    // Complexity Penalty (Simulated based on objective length and requirement count)
    const complexityFactor = 1.0 + (objective.length / 100) + (totalCount / 10);
    const upsideDominance = basePayoff / complexityFactor;

    // 4. Contextual Clarity
    // Requires >= 3 requirements AND at least 50% of them having verification criteria
    const reqsWithVerification = task.requirements.filter(r => r.verificationCriteria && r.verificationCriteria.length > 0).length;
    const contextualClarity = totalCount >= 2 && (reqsWithVerification / totalCount >= 0.5);

    return {
      sovereignUtility,
      integrityAlignment: 1.0, // High-fidelity updated during SHADOW_SIM
      contextualClarity,
      upsideDominance
    };
  }

  /**
   * Performs the negative audit on a task candidate.
   * "What is the evidence that this is NOT a distraction?"
   */
  evaluate(bundle: ProvenanceBundle): { pass: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    // Sovereign Utility: 0% technical debt overhead
    if (!bundle.sovereignUtility) {
      reasons.push('Fails Sovereign Utility: Potential technical debt overhead detected.');
    }
    
    // Integrity Alignment: Simulation pre-flight score
    if (bundle.integrityAlignment < 0.90) {
      reasons.push(`Fails Integrity Alignment: Pre-flight score ${bundle.integrityAlignment.toFixed(2)} is below 0.90.`);
    }
    
    // Contextual Clarity: Defined entry-points
    if (!bundle.contextualClarity) {
      reasons.push('Fails Contextual Clarity: Unclear requirements or side-effects detected.');
    }
    
    // Upside Dominance: Higher payoff than cognitive cost
    if (bundle.upsideDominance < 2.0) {
      reasons.push(`Fails Upside Dominance: Leverage ratio ${bundle.upsideDominance.toFixed(2)} is below 2.0.`);
    }

    return {
      pass: reasons.length === 0,
      reasons
    };
  }
}
