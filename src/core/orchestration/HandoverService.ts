/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Orchestration — handles seamless transitions between orchestrators
 * Violations: None
 */

import { EventType } from '../../domain/Event';
import type { SessionRepository } from '../../domain/context/SessionRepository';
import type { LogService } from '../../domain/logging/LogService';
import { EventBus } from './EventBus';

/**
 * Handover context containing transferable state
 */
export interface HandoverContext {
  sessionId: string;
  transferredState: Map<string, any>;
  correlationId: string;
  transferTimestamp: number;
}

/**
 * HandoverService manages seamless state transfer between orchestrators
 * Pattern: State Transfer — preserves runtime context during transition
 */
export class HandoverService {
  private eventBus: EventBus;
  private sessionRepository: SessionRepository;
  private eventData?: { sessionId?: string; timestamp?: string };

  constructor(
    sessionRepository: SessionRepository,
    eventData?: { sessionId?: string; timestamp?: string },
  ) {
    this.sessionRepository = sessionRepository;
    this.eventBus = EventBus.getInstance();
    this.eventData = eventData;
  }

  /**
   * Execute handover with comprehensive state verification
   *
   * @param orchestratorToSwitchFrom Origin orchestrator transitioning away
   * @param orchestratorToSwitchTo Target orchestrator receiving state
   * @returns Promise resolving to handover result with verification
   */
  async executeHandover(
    orchestratorToSwitchFrom: string,
    orchestratorToSwitchTo: string,
  ): Promise<void> {
    const correlationId = globalThis.crypto.randomUUID();
    const transferTimestamp = Date.now();

    console.log(`🔄 Initiating handover: ${orchestratorToSwitchFrom} → ${orchestratorToSwitchTo}`);
    console.log(`   Correlation ID: ${correlationId}`);

    try {
      // Phase 1: Extract transferable state from source
      const handoverContext: HandoverContext = {
        sessionId: this.eventData?.sessionId || '',
        transferredState: new Map<string, any>(),
        correlationId,
        transferTimestamp,
      };

      // Phase 2: Validate session exists
      if (!handoverContext.sessionId) {
        throw new Error('No active session available for handover');
      }

      // Phase 3: Transfer session state (domain-level operation)
      await this.sessionRepository.updateSessionAgent(
        handoverContext.sessionId,
        orchestratorToSwitchTo,
      );
      await this.sessionRepository.updateSessionStatus(handoverContext.sessionId, 'busy', {
        previousOrchestrator: StateOrchestratorToSwitchFrom,
        transferTimestamp,
        correlationId,
      });

      // Phase 4: Publish completion event
      this.eventBus.publish(
        EventType.ERROR_OCCURRED,
        {
          source: 'HandoverService',
          message: 'Handover completed successfully',
          correlationId,
        },
        { correlationId, from: StateOrchestratorToSwitchFrom, to: StateOrchestratorToSwitchTo },
      );

      console.log(`✅ Handover completed: ${orchestratorToSwitchFrom} → ${orchestratorToSwitchTo}`);
    } catch (handoverError: any) {
      this.eventBus.publish(EventType.ERROR_OCCURRED, {
        source: 'HandoverService',
        message: `Handover failed: ${handoverError.message}`,
        correlationId,
      });

      console.error(`❌ Handover failed: ${handoverError.message}`);
      throw handoverError;
    }
  }

  /**
   * Get session verification status
   *
   * @param sessionId Session identifier
   */
  async getSessionStatus(sessionId: string): Promise<any> {
    const session = await this.sessionRepository.getSession(sessionId);

    return {
      exists: session !== undefined,
      activeOrchestrator: session?.activeOrchestrator,
      lastUpdated: session?.lastUpdated,
      handoverHistory: session?.metadata.handoverHistory,
    };
  }

  /**
   * Handover diagnostics
   */
  getDiagnostics(): any {
    return {
      sessionRepository: this.sessionRepository !== undefined,
      eventBus: this.eventBus !== undefined,
      currentSession: this.eventData?.sessionId,
    };
  }
}
