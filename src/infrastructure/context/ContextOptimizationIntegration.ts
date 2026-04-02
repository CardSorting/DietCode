/**
 * [INFRASTRUCTURE: CONTEXT_OPTIMIZATION_INTEGRATION]
 * Principle: Orchestrates Context Optimization using Domain and Core services
 * Violations: None
 */
import type { FileReuseDecision } from "../../domain/context/FileReadPattern";
import type { SignatureDatabase } from "../../domain/context/FileSignatureService";
import { PatternAnalysisService, DEFAULT_PATTERN_CONFIG } from "../../core/capabilities/PatternAnalysisService";

/**
 * Optimizes context by reusing file content when possible
 */
export class ContextOptimizationService {
  private patternAnalyzer: PatternAnalysisService;
  private signatureDatabase: SignatureDatabase;
  private sessionStats = {
    totalFiles: 0,
    reuseCandidates: 0,
    discardedCandidates: 0,
    averageReuseConfidence: 0,
    totalReuseCount: 0,
  };

  constructor(
    signatureDatabase: SignatureDatabase,
    config?: Parameters<typeof PatternAnalysisService>[0]
  ) {
    this.signatureDatabase = signatureDatabase;
    this.patternAnalyzer = new PatternAnalysisService(config);
  }

  async optimizeContext(
    targetFilePaths: string[],
    existingContext: Map<string, string>
  ): Promise<{
    reuseDecisions: FileReuseDecision[];
    reusedContext: Map<string, string>;
    discardedContext: Map<string, string>;
    optimizationReport: string;
  }> {
    const signatures = this.signatureDatabase.getAll();
    const decisions = this.patternAnalyzer.analyzePatternAvailability(
      targetFilePaths,
      signatures
    );
    const optimizedDecisions = this.patternAnalyzer.optimizeSession(
      decisions,
      this.sessionStats
    );
    
    const reusedContext = new Map<string, string>();
    const discardedContext = new Map<string, string>();
    
    for (const decision of optimizedDecisions) {
      if (decision.shouldReuse && existingContext.has(decision.filePath)) {
        reusedContext.set(decision.filePath, existingContext.get(decision.filePath)!);
      } else {
        discardedContext.set(decision.filePath, existingContext.get(decision.filePath) || "");
      }
    }
    
    const updatedStats = this.patternAnalyzer.updateStatistics(
      optimizedDecisions,
      this.sessionStats
    );
    this.sessionStats = updatedStats;
    
    const report = this.patternAnalyzer.generateReport(optimizedDecisions, updatedStats);
    
    return {
      reuseDecisions: optimizedDecisions,
      reusedContext,
      discardedContext,
      optimizationReport: report,
    };
  }

  recordFileContext(filePath: string, content: string): void {
    const hash = SignatureDatabase.hashContent(content);
    const size = Buffer.byteLength(content, "utf8");
    this.signatureDatabase.record(filePath, hash, size);
  }

  resetSession(): void {
    this.sessionStats = {
      totalFiles: 0,
      reuseCandidates: 0,
      discardedCandidates: 0,
      averageReuseConfidence: 0,
      totalReuseCount: 0,
    };
  }

  getStatistics() {
    return { ...this.sessionStats };
  }
}
