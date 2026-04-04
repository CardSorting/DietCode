import { PatternAnalysisService } from '../../core/capabilities/PatternAnalysisService';
import type { FileReuseDecision } from '../../domain/context/FileReadPattern';
import type { SignatureDatabase } from '../../domain/context/FileSignatureService';

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

  constructor(signatureDatabase: SignatureDatabase, config?: any) {
    this.signatureDatabase = signatureDatabase;
    this.patternAnalyzer = new PatternAnalysisService(config);
  }

  async optimizeContext(
    targetFilePaths: string[],
    existingContext: Map<string, string>,
  ): Promise<{
    reuseDecisions: FileReuseDecision[];
    reusedContext: Map<string, string>;
    discardedContext: Map<string, string>;
    optimizationReport: string;
  }> {
    // signatures should be a Map<string, FileSignature> for the analyzer
    const signatureList = this.signatureDatabase.listSignatures();
    const signatureMap = new Map(
      signatureList.map((s) => [
        s.filePath,
        {
          filePath: s.filePath,
          hash: s.hash,
          sizeBytes: s.sizeBytes,
          timestamp: s.timestamp || Date.now(),
          isOutdated: (_size?: number) => false, // Default implementation
        },
      ]),
    );

    const decisions = this.patternAnalyzer.analyzePatternAvailability(
      targetFilePaths,
      signatureMap as any,
    );
    const optimizedDecisions = this.patternAnalyzer.optimizeSession(decisions, this.sessionStats);

    const reusedContext = new Map<string, string>();
    const discardedContext = new Map<string, string>();

    for (const decision of optimizedDecisions) {
      if (decision.shouldReuse && existingContext.has(decision.filePath)) {
        reusedContext.set(decision.filePath, existingContext.get(decision.filePath)!);
      } else {
        discardedContext.set(decision.filePath, existingContext.get(decision.filePath) || '');
      }
    }

    const updatedStats = this.patternAnalyzer.updateStatistics(
      optimizedDecisions,
      this.sessionStats,
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
    const hash = `hash-${Date.now()}`; // Mock hash for now or use real one
    const size = Buffer.byteLength(content, 'utf8');
    this.signatureDatabase.recordSignature(filePath, {
      filePath,
      hash,
      sizeBytes: size,
      timestamp: Date.now(),
      content: content,
      source: 'context_optimization',
      originalLength: size,
      optimizedLength: size,
      wasOptimized: false,
    });
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
