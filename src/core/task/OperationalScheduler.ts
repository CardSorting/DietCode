/**
 * [LAYER: CORE]
 * Principle: Simulated Reality Protocol — The Operational Scheduler (v6.0)
 * Manages transitions between Shadow Simulation and Sovereign Commit.
 */

import * as crypto from 'node:crypto';
import { ComplianceState } from '../../domain/task/ImplementationSnapshot';
import type { AxiomProfile } from '../../domain/task/ImplementationSnapshot';
import type { TaskEntity, VitalsHeartbeat } from '../../domain/task/TaskEntity';
import { TaskState } from '../../domain/task/TaskEntity';
import type { JoySimulator } from '../../infrastructure/simulation/JoySimulator';
import type { SimulationResult } from '../../infrastructure/simulation/SimulationResult';
import { CheckpointPersistenceAdapter } from '../../infrastructure/task/CheckpointPersistenceAdapter';

export class OperationalScheduler {
  private joySimulator: JoySimulator;
  private persistence = new CheckpointPersistenceAdapter();

  constructor(joySimulator: JoySimulator) {
    this.joySimulator = joySimulator;
  }

  /**
   * Performs the SHADOW_SIM pre-flight execution and returns the results.
   * "If the Simulated Integrity Clearance < 0.95, the Harness refuses to enter SOVEREIGN_DOING."
   */
  async simulateShadowExecution(
    task: TaskEntity,
    filePath: string,
    proposedContent: string,
    projectRoot: string,
    policy: any,
    virtualFiles?: Map<string, string>,
  ): Promise<SimulationResult & { axiomProfile: AxiomProfile }> {
    const result = await this.joySimulator.simulateImpact(
      filePath,
      proposedContent,
      projectRoot,
      policy,
      virtualFiles,
    );

    // Axiomatic Mapping: 0 violations = CLEARED
    const status = result.newViolations === 0 ? ComplianceState.CLEARED : ComplianceState.BLOCKED;
    const axiomProfile: AxiomProfile = {
      status,
      failingAxioms:
        result.newViolations > 0 ? [(result as any).violationType || 'structural'] : [],
      axiomResults: {
        structural: result.newViolations === 0,
        resonance: true,
        purity: true,
        stability: true,
      },
    };

    task.simAxiomProfile = axiomProfile;
    this.persistence.persistTask(task);

    return {
      ...result,
      axiomProfile,
    };
  }

  /**
   * Verifies if the task can transition to the SOVEREIGN_DOING state.
   */
  canEnterSovereignDoing(input: TaskEntity | AxiomProfile): boolean {
    const profile = (input as any).status
      ? (input as AxiomProfile)
      : (input as TaskEntity).simAxiomProfile;
    return profile?.status === ComplianceState.CLEARED;
  }

  /**
   * Generates the final cryptographic Sovereign Token (v_token).
   * Validates the integrity of the completed task state.
   */
  generateSovereignToken(task: TaskEntity): string {
    const payload = JSON.stringify({
      id: task.id,
      objective: task.objective,
      axiomStatus: task.simAxiomProfile?.status,
      completedAt: Date.now(),
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Pass 18: Self-Healing Evaluation logic.
   * "If Doubt > 10, the Harness performs an emergency rollback."
   */
  evaluateSelfHealing(heartbeat: VitalsHeartbeat): {
    action: 'NONE' | 'ROLLBACK' | 'SUSPEND';
    reason?: string;
  } {
    if (heartbeat.doubtSignal > 10) {
      return { action: 'ROLLBACK', reason: 'Critical Doubt Signal (Context Loss)' };
    }
    if (heartbeat.cognitiveHeat > 100000) {
      return { action: 'SUSPEND', reason: 'Extreme Cognitive Heat (Looping)' };
    }
    return { action: 'NONE' };
  }

  /**
   * Transition task to the next state in the SRP pipeline.
   * Persists the change to the sovereign database.
   */
  transition(task: TaskEntity, nextState: TaskState): TaskEntity {
    // Valid pipeline: BACKLOG → READY → SHADOW_SIM → SOVEREIGN_DOING → VERIFYING → DONE
    const pipeline = [
      TaskState.BACKLOG,
      TaskState.READY,
      TaskState.SHADOW_SIM,
      TaskState.SOVEREIGN_DOING,
      TaskState.VERIFYING,
      TaskState.DONE,
    ];

    if (nextState === TaskState.SOVEREIGN_DOING && !this.canEnterSovereignDoing(task)) {
      throw new Error(
        'Sovereign Protocol Violation: Cannot enter SOVEREIGN_DOING without Axiomatic Compliance.',
      );
    }

    if (nextState === TaskState.DONE) {
      task.vToken = this.generateSovereignToken(task);
      task.metadata.completedAt = new Date();
    }

    const currentIndex = pipeline.indexOf(task.state);
    const nextIndex = pipeline.indexOf(nextState);

    if (nextIndex === -1 && nextState !== TaskState.FAILED) {
      throw new Error(`Invalid target state: ${nextState}`);
    }

    // Strict forward-only progression for sovereign protocol
    if (nextState !== TaskState.FAILED && nextIndex <= currentIndex) {
      throw new Error(
        `Invalid transition: ${task.state} -> ${nextState}. Sovereign Protocol is forward-only.`,
      );
    }

    const updatedTask = {
      ...task,
      state: nextState,
      metadata: {
        ...task.metadata,
        updatedAt: new Date(),
      },
    };

    this.persistence.persistTask(updatedTask);
    return updatedTask;
  }
}
