/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for prompt usage tracking and optimization recommendations.
 */

import { PromptDefinition } from './PromptCategory';

export interface PromptMetrics {
  promptId: string;
  category: string;
  firstUsed: string;
  lastUsed: string;
  usageCount: number;
  successRate: number; // Percentage of successful executions
  averageRenderTimeMs: number;
  totalRenderTimeMs: number;
  totalExecutionTimeMs: number;
  avgExecutionTimeMs: number;
  dangerLevel: 'low' | 'medium' | 'high' | 'critical';
  averageSizeKb: number;
  featureMapping: string[]; // DietCode features mapped (MEMORY_CHECKPOINT, etc.)
}

export interface PromptPerformanceProfile {
  id: string;
  promptId: string;
  category: string;
  benchmarks: {
    initialRenderTimeMs: number;
    cachedRenderTimeMs: number;
    templateParsingTimeMs: number;
    variableResolutionTimeMs: number;
  };
  concurrency: {
    averageRequestsPerSecond: number;
    peakRequestsPerSecond: number;
    avgTimeInQueueMs: number;
  };
  errorRate: {
    totalErrors: number;
    missingVariableErrors: number;
    syntaxErrors: number;
    otherErrors: number;
  };
  heatmap: PromptHeatmapEntry[];
}

export interface PromptHeatmapEntry {
  phase: 'pre_execution' | 'during_execution' | 'post_execution';
  eventsPerPhase: number;
  avgLatencyPhase: number;
  dependencies: string[];
}

export interface PromptRecommendation {
  id: string;
  promptId: string;
  type: 'PERFORMANCE_IMPROVEMENT' | 'SAFETY_WARNING' | 'USAGE_OPTIMIZATION' | 'WARNING';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  metrics: {
    current: number;
    target: number;
    gap: number;
  };
  suggestedAction: string;
  impactedPhases: string[];
  estimatedImpact: string;
  metadata?: {
    confidence: number;
    timeframe: string;
    alternative?: string;
  };
}

export interface PromptSearchCriteria {
  category?: string;
  featured?: boolean;
  minUsage?: number;
  maxUsage?: number;
  dangerLevel?: string;
  featureMappings?: string[];
  sortBy?: 'usage' | 'successRate' | 'renderTime' | 'dangerLevel';
  order?: 'asc' | 'desc';
  limit?: number;
}

export class PromptAnalyticsEngine {
  private metrics: Map<string, PromptMetrics> = new Map();
  private performanceProfiles: Map<string, PromptPerformanceProfile> = new Map();
  private executionEvents: PromptEvent[] = [];

  /**
   * Records a prompt execution event
   */
  recordExecutionEvent(
    promptId: string,
    context: {
      success: boolean;
      renderTimeMs: number;
      executionTimeMs: number;
      renderSizeKb: number;
      renderCount: number;
      templateSizeKb: number;
      variableCount: number;
    }
  ): void {
    // Initialize metrics if not exists
    if (!this.metrics.has(promptId)) {
      this.metrics.set(promptId, {
        promptId,
        category: 'unknown',
        firstUsed: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        usageCount: 0,
        successRate: 0,
        averageRenderTimeMs: 0,
        totalRenderTimeMs: 0,
        totalExecutionTimeMs: 0,
        avgExecutionTimeMs: 0,
        dangerLevel: 'medium',
        averageSizeKb: 0,
        featureMapping: []
      });
    }

    const metrics = this.metrics.get(promptId)!;

    // Update usage metrics
    metrics.usageCount++;
    metrics.lastUsed = new Date().toISOString();

    // Update timing metrics
    metrics.totalRenderTimeMs += context.renderTimeMs;
    metrics.averageRenderTimeMs = metrics.totalRenderTimeMs / metrics.usageCount;

    metrics.totalExecutionTimeMs += context.executionTimeMs;
    metrics.avgExecutionTimeMs = metrics.totalExecutionTimeMs / metrics.usageCount;

    // Update success rate
    const totalExecutions = metrics.usageCount;
    const successCount = this.getExecutionCountBySuccess(promptId, true);
    metrics.successRate = (successCount / totalExecutions) * 100;

    // Update size metrics
    const prevSizeKb = metrics.averageSizeKb * (metrics.usageCount - 1);
    metrics.averageSizeKb = (prevSizeKb + context.totalRenderSizeKb) / metrics.usageCount;

    // Track execution event
    this.executionEvents.push({
      timestamp: new Date().toISOString(),
      promptId,
      success: context.success,
      renderTimeMs: context.renderTimeMs,
      executionTimeMs: context.executionTimeMs
    });

    // Keep only last 1000 events for performance
    if (this.executionEvents.length > 1000) {
      this.executionEvents.shift();
    }
  }

  /**
   * Calculates performance profile for a prompt
   */
  derivePerformanceProfile(promptId: string): PromptPerformanceProfile | null {
    const metrics = this.metrics.get(promptId);
    if (!metrics) return null;

    const events = this.executionEvents.filter(e => e.promptId === promptId);

    if (events.length === 0) return null;

    // Calculate benchmarks
    const benchmarks = {
      initialRenderTimeMs: Math.min(...events.map(e => e.renderTimeMs)),
      cachedRenderTimeMs: this.calculateAvg(events.map(e => e.renderTimeMs)),
      templateParsingTimeMs: metrics.averageRenderTimeMs * 0.3,
      variableResolutionTimeMs: metrics.averageRenderTimeMs * 0.6
    };

    // Calculate concurrency
    const timeWindowStart = new Date(Date.now() - 60000).toISOString();
    const recentEvents = events.filter(e => e.timestamp >= timeWindowStart);
    const requestsPerSecond = recentEvents.length / 60;

    // Calculate error rate
    const errorRate = {
      totalErrors: events.length - this.getExecutionCountBySuccess(promptId, true),
      missingVariableErrors: 0, // Would need detailed error tracking
      syntaxErrors: 0, // Would need detailed error tracking
      otherErrors: 0
    };

    // Calculate heatmap
    const heatmap = this.generateHeatmap(events);

    return {
      id: `profile-${promptId}`,
      promptId,
      category: metrics.category,
      benchmarks,
      concurrency: {
        averageRequestsPerSecond: this.calculateAvg(events.map(e => e.timestamp).map(t => {
          return Math.round(1 / 100); // Simplified
        })),
        peakRequestsPerSecond: Math.max(...events.map(e => 10)), // Placeholder
        avgTimeInQueueMs: 0
      },
      errorRate,
      heatmap
    };
  }

  /**
   * Generates usage-based recommendations
   */
  generateRecommendations(
    promptId?: string,
    maxRecommendations: number = 10
  ): PromptRecommendation[] {
    const recommendations: PromptRecommendation[] = [];

    // If promptId is provided, generate single-prompt recommendations
    if (promptId) {
      const metrics = this.metrics.get(promptId);
      if (!metrics) return recommendations;

      // Example: Low success rate = safety warning
      if (metrics.successRate < 50) {
        recommendations.push({
          id: `{$}`,
          promptId,
          type: 'SAFETY_WARNING',
          priority: 'high',
          title: 'Unstable Execution Rate Detected',
          description: 'This prompt has a success rate below 50%, which may indicate template issues or unsafe operations.',
          metrics: {
            current: metrics.successRate,
            target: 80,
            gap: 80 - metrics.successRate
          },
          suggestedAction: 'Review template syntax, validate variable references, and reduce conditional complexity.',
          impactedPhases: ['pre_execution', 'during_execution'],
          estimatedImpact: 'Improve reliability by reducing unexpected failures',
          metadata: {
            confidence: 0.9,
            timeframe: 'Immediate review recommended'
          }
        });
      }

      // Example: High execution time = performance improvement
      if (metrics.averageRenderTimeMs > 100) {
        recommendations.push({
          id: `hh`,
          promptId,
          type: 'PERFORMANCE_IMPROVEMENT',
          priority: 'medium',
          title: 'Render Time Exceeds Optimization Threshold',
          description: 'This prompt takes longer than 100ms to render on average.',
          metrics: {
            current: metrics.averageRenderTimeMs,
            target: 50,
            gap: metrics.averageRenderTimeMs - 50
          },
          suggestedAction: 'Pre-compile template AST and cache variable resolution results.',
          impactedPhases: ['during_execution'],
          estimatedImpact: 'Reduce render time by 50% through AST caching',
          metadata: {
            confidence: 0.85,
            timeframe: 'Next deployment cycle'
          }
        });
      }
    } else {
      // Global recommendations
      const allPrompts = Array.from(this.metrics.values())
        .filter(m => m.usageCount > 10); // Only consider frequently used prompts

      // Find worst performers
      const slowPrompts = allPrompts
        .sort((a, b) => b.averageRenderTimeMs - a.averageRenderTimeMs)
        .slice(0, 3);

      slowPrompts.forEach((prompt, index) => {
        recommendations.push({
          id: `ss`,
          promptId: prompt.promptId,
          type: 'PERFORMANCE_IMPROVEMENT',
          priority: index === 0 ? 'high' : 'low',
          title: `${index + 1}. Top Performance Bottleneck`,
          description: `This prompt has the highest average render time at ${prompt.averageRenderTimeMs.toFixed(2)}ms.`,
          metrics: {
            current: prompt.averageRenderTimeMs,
            target: 50,
            gap: prompt.averageRenderTimeMs - 50
          },
          suggestedAction: 'Pre-compile template AST and reduce variable resolution overhead.',
          impactedPhases: ['during_execution'],
          estimatedImpact: `Reduce render time by ${((prompt.averageRenderTimeMs - 50) / prompt.averageRenderTimeMs * 100).toFixed(0)}%`,
          metadata: {
            confidence: 0.9,
            timeframe: 'Next deployment cycle'
          }
        });
      });
    }

    return recommendations.slice(0, maxRecommendations);
  }

  /**
   * Search for prompts based on criteria
   */
  searchPrompts(
    criteria: PromptSearchCriteria
  ): PromptDefinition[] {
    const allMetrics = Array.from(this.metrics.values());

    let results = allMetrics.filter(metrics => {
      // Category filter
      if (criteria.category && metrics.category !== criteria.category) return false;

      // Usage filter
      if (criteria.minUsage && metrics.usageCount < criteria.minUsage) return false;
      if (criteria.maxUsage && metrics.usageCount > criteria.maxUsage) return false;

      // Danger level filter
      if (criteria.dangerLevel && metrics.dangerLevel !== criteria.dangerLevel) return false;

      // Feature mapping filter
      if (criteria.featureMappings && criteria.featureMappings.length > 0) {
        const hasFeature = criteria.featureMappings.some(f => metrics.featureMapping.includes(f));
        if (!hasFeature) return false;
      }

      // Featured filter
      if (criteria.featured && !metrics.featureMapping.includes('featured')) return false;

      return true;
    });

    // Sorting
    if (criteria.sortBy) {
      results.sort((a, b) => {
        let valueA = 0;
        let valueB = 0;

        switch (criteria.sortBy) {
          case 'usage': valueA = a.usageCount; valueB = b.usageCount; break;
          case 'successRate': valueA = a.successRate; valueB = b.successRate; break;
          case 'renderTime': valueA = a.averageRenderTimeMs; valueB = b.averageRenderTimeMs; break;
          case 'dangerLevel': valueA = this.getDangerLevelScore(a.dangerLevel); valueB = this.getDangerLevelScore(b.dangerLevel); break;
        }

        return criteria.order === 'desc' ? (valueB - valueA) : (valueA - valueB);
      });
    }

    return results.slice(0, criteria.limit || 50);
  }

  /**
   * Get comprehensive analytics for a prompt
   */
  getAnalytics(promptId: string) {
    const metrics = this.metrics.get(promptId);
    const profile = this.derivePerformanceProfile(promptId);
    const recommendations = this.generateRecommendations(promptId, 3);

    return {
      promptId,
      category: metrics?.category || 'unknown',
      summary: {
        totalExecutions: metrics?.usageCount || 0,
        successRate: metrics?.successRate?.toFixed(2) || '0.00',
        avgRenderTimeMs: metrics?.averageRenderTimeMs?.toFixed(2) || '0.00',
        avgExecutionTimeMs: metrics?.avgExecutionTimeMs?.toFixed(2) || '0.00',
        dangerLevel: metrics?.dangerLevel || 'unknown',
        averageSizeKb: metrics?.averageSizeKb?.toFixed(2) || '0.00'
      },
      performance: profile,
      recommendations,
      timeline: this.executionEvents.filter(e => e.promptId === promptId).slice(-10)
    };
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrend(
    promptId: string,
    hours: number = 24
  ): { timestamp: string; renderTimeMs: number; success: boolean }[] {
    const now = Date.now();
    const cutoff = now - (hours * 60 * 60 * 1000);

    return this.executionEvents
      .filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        return e.promptId === promptId && eventTime >= cutoff;
      })
      .map(e => ({
        timestamp: e.timestamp,
        renderTimeMs: e.renderTimeMs,
        success: e.success
      }));
  }

  /**
   * Initiates a model composition re-weighing
   */
  reweighPrompts() {
    const highPriorityPrompts = Array.from(this.metrics.values())
      .filter(m => m.successRate > 80 && m.usageCount > 20)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10);

    console.log(`[PromptAnalytics] Reinforcing ${highPriorityPrompts.length} high-performing prompts`);

    highPriorityPrompts.forEach(prompt => {
      const existing = this.metrics.get(prompt.promptId);
      if (existing) {
        existing.featureMapping.push('reinforced');
      }
    });
  }

  // Private helper methods

  private getExecutionCountBySuccess(
    promptId: string,
    success: boolean
  ): number {
    return this.executionEvents
      .filter(e => e.promptId === promptId && e.success === success)
      .length;
  }

  private calculateAvg(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private generateHeatmap(events: Array<{ renderTimeMs: number; timestamp: string }>): PromptHeatmapEntry[] {
    // Simplified heatmap - in production would analyze event phases
    return [
      {
        phase: 'pre_execution',
        eventsPerPhase: events.length * 0.25, // Approximate
        avgLatencyPhase: 50,
        dependencies: ['validation', 'context']
      },
      {
        phase: 'during_execution',
        eventsPerPhase: events.length * 0.5,
        avgLatencyPhase: 100,
        dependencies: ['template', 'variables', 'tools']
      },
      {
        phase: 'post_execution',
        eventsPerPhase: events.length * 0.25, // Approximate
        avgLatencyPhase: 30,
        dependencies: ['logging', 'analytics']
      }
    ];
  }

  private getDangerLevelScore(level: string): number {
    switch (level) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * Aggregates metrics across all prompts
   */
  getSystemMetrics() {
    return {
      totalPrompts: this.metrics.size,
      totalExecutions: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.usageCount, 0),
      averageSuccessRate: Array.from(this.metrics.values())
        .reduce((sum, m) => sum + m.successRate, 0) / this.metrics.size,
      averageRenderTimeMs: Array.from(this.metrics.values())
        .reduce((sum, m) => sum + m.averageRenderTimeMs, 0) / this.metrics.size,
      topDangertPrompts: this.getTopDangertPrompts(5)
    };
  }

  private getTopDangertPrompts(limit: number = 5) {
    return Array.from(this.metrics.values())
      .sort((a, b) => this.getDangerLevelScore(b.dangerLevel) - this.getDangerLevelScore(a.dangerLevel))
      .slice(0, limit);
  }
}

interface PromptEvent {
  timestamp: string;
  promptId: string;
  success: boolean;
  renderTimeMs: number;
  executionTimeMs: number;
}

export class ImmutablePromptAnalytics {
  constructor(private readonly engine: PromptAnalyticsEngine) {}

  getMetrics(promptId: string) {
    return this.engine.metrics.get(promptId) || null;
  }

  getSystemMetrics() {
    return this.engine.getSystemMetrics();
  }

  getPerformanceTrend(promptId: string, hours: number = 24) {
    return this.engine.getPerformanceTrend(promptId, hours);
  }

  search(criteria: PromptSearchCriteria) {
    return this.engine.searchPrompts(criteria);
  }
}