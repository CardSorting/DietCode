/**
 * [LAYER: CORE]
 * Principle: Simulated Reality Protocol — The Operational Scheduler (v6.0)
 * Manages transitions between Shadow Simulation and Sovereign Commit.
 */

import type { TaskEntity } from '../../domain/task/TaskEntity';
import { TaskState } from '../../domain/task/TaskEntity';
import { JoySimulator } from '../../infrastructure/simulation/JoySimulator';
import type { SimulationResult } from '../../infrastructure/simulation/SimulationResult';

export class OperationalScheduler {
  private joySimulator: JoySimulator;

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
    // 0 violations = 1.0 integrity, each violation reduces score.
    const integrity = Math.max(0.0, 1.0 - (result.newViolations * 0.1));
    
    return {
      ...result,
      integrity
    };
  }

  /**
   * Verifies if the task can transition to the SOVEREIGN_DOING state.
   */
  canEnterSovereignDoing(integrity: number): boolean {
    return integrity >= 0.95;
  }

  /**
   * Transition task to the next state in the SRP pipeline.
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

    const currentIndex = pipeline.indexOf(task.state);
    const nextIndex = pipeline.indexOf(nextState);

    if (nextIndex === -1 && nextState !== TaskState.FAILED) {
      throw new Error(`Invalid target state: ${nextState}`);
    }

    // Strict forward-only progression for sovereign protocol
    if (nextState !== TaskState.FAILED && nextIndex <= currentIndex) {
      throw new Error(`Invalid transition: ${task.state} -> ${nextState}. Sovereign Protocol is forward-only.`);
    }

    return {
      ...task,
      state: nextState,
      metadata: {
        ...task.metadata,
        updatedAt: new Date()
      }
    };
  }
}
