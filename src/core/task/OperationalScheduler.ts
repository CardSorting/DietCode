/**
 * [LAYER: CORE]
 * Principle: Simulated Reality Protocol — The Operational Scheduler (v6.0)
 * Manages transitions between Shadow Simulation and Sovereign Commit.
 */

import type { TaskEntity, VitalsHeartbeat } from '../../domain/task/TaskEntity';
import { TaskState } from '../../domain/task/TaskEntity';
import { JoySimulator } from '../../infrastructure/simulation/JoySimulator';
import type { SimulationResult } from '../../infrastructure/simulation/SimulationResult';
import { CheckpointPersistenceAdapter } from '../../infrastructure/task/CheckpointPersistenceAdapter';
import * as crypto from 'node:crypto';

export class OperationalScheduler {
  private joySimulator: JoySimulator;
  private persistence = new CheckpointPersistenceAdapter();

  constructor(joySimulator: JoySimulator) {
    this.joySimulator = joySimulator;
  }

  /**
   * Performs the SHADOW_SIM pre-flight execution and returns the results.
   * "If the Simulated Verification Score < 0.95, the Harness refuses to enter SOVEREIGN_DOING."
   */
  async simulateShadowExecution(
    task: TaskEntity,
    filePath: string,
    proposedContent: string,
    projectRoot: string,
    policy: any, // IntegrityPolicy
    virtualFiles?: Map<string, string>
  ): Promise<SimulationResult & { integrity: number }> {
    const result = await this.joySimulator.simulateImpact(
        filePath, 
        proposedContent, 
        projectRoot, 
        policy, 
        virtualFiles
    );
    
    // Logic from proto.md: Simulation Score < 0.95 refuses entries.
    // Maps simulation result to 0-1.0 integrity scale.
    // 0 violations = 1.0 integrity, each violation reduces score by 0.05 (Pass 18: Strict Delta).
    const integrity = Math.max(0.0, 1.0 - (result.newViolations * 0.05));
    
    // Update task integrity in memory
    task.simIntegrity = integrity;
    this.persistence.persistTask(task);

    return {
      ...result,
      integrity
    };
  }

  /**
   * Verifies if the task can transition to the SOVEREIGN_DOING state.
   */
  canEnterSovereignDoing(task: TaskEntity): boolean {
    return (task.simIntegrity || 0) >= 0.95;
  }

  /**
   * Generates the final cryptographic Sovereign Token (v_token).
   * Validates the integrity of the completed task state.
   */
  generateSovereignToken(task: TaskEntity): string {
    const payload = JSON.stringify({
        id: task.id,
        objective: task.objective,
        integrity: task.simIntegrity,
        completedAt: Date.now()
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Pass 18: Self-Healing Evaluation logic.
   * "If Doubt > 10, the Harness performs an emergency rollback."
   */
  evaluateSelfHealing(heartbeat: VitalsHeartbeat): { action: 'NONE' | 'ROLLBACK' | 'SUSPEND'; reason?: string } {
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
      TaskState.DONE
    ];

    if (nextState === TaskState.SOVEREIGN_DOING && !this.canEnterSovereignDoing(task)) {
        throw new Error(`Sovereign Protocol Violation: Cannot enter SOVEREIGN_DOING with integrity ${task.simIntegrity}. Min required: 0.95.`);
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
      throw new Error(`Invalid transition: ${task.state} -> ${nextState}. Sovereign Protocol is forward-only.`);
    }

    const updatedTask = {
      ...task,
      state: nextState,
      metadata: {
        ...task.metadata,
        updatedAt: new Date()
      }
    };

    this.persistence.persistTask(updatedTask);
    return updatedTask;
  }
}
