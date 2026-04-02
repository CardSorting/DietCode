/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Deep Strategic Audit — uses the TypeScript Compiler API for AST-based analysis.
 * Pass 12: Strategic Boundary Alignment — implements the new Plumbing-centric architecture.
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { IntegrityScanner } from '../domain/integrity/IntegrityScanner';
import { IntegrityPolicy } from '../domain/memory/IntegrityPolicy';
import { 
  type IntegrityViolation, 
  type IntegrityReport, 
  ViolationType 
} from '../domain/memory/Integrity';

/**
 * ARCHITECTURAL RULE MATRIX (Pass 12)
 * Source Layer -> Allowed Target Layers
 */
const ALLOWED_IMPORTS: Record<string, string[]> = {
    'DOMAIN': [], // Independent
    'CORE': ['DOMAIN', 'INFRASTRUCTURE', 'PLUMBING'], // Orchestrator
    'INFRASTRUCTURE': ['DOMAIN', 'PLUMBING'], // Adapter
    'UI': ['DOMAIN', 'PLUMBING'], // Delivery (No Infrastructure!)
    'PLUMBING': [], // Truly Independent
    'UNKNOWN': ['PLUMBING', 'DOMAIN'] // External access guard
};

export function analyzeDependencies(
    absPath: string, 
    projectRoot: string, 
    policy: IntegrityPolicy, 
    sourceCode?: string,
    virtualFiles?: Map<string, string>
): { imports: string[], violations: IntegrityViolation[] } {
    const relPath = path.relative(projectRoot, absPath);
    const violations: IntegrityViolation[] = [];
    const importedFiles: string[] = [];

    // Prioritize virtualFiles, then sourceCode, then disk
    let code: string | null = virtualFiles?.get(absPath) ?? null;
    if (code === null && sourceCode !== undefined) code = sourceCode;
    if (code === null) code = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf8') : null;
    
    if (code === null) return { imports: [], violations: [] };

    const sourceFile = ts.createSourceFile(absPath, code, ts.ScriptTarget.Latest, true);
    const fileDir = path.dirname(absPath);

    const visit = (node: ts.Node) => {
      // 1. Static Imports/Exports
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          if (importPath.startsWith('.')) {
            const absImported = path.resolve(fileDir, importPath);
            const relImported = path.relative(projectRoot, absImported);
            importedFiles.push(relImported);
            
            // Pass 18: Multi-File Shadow Check
            // We use the virtual content if it exists in the registry
            checkBoundaryPure(relPath, relImported, violations);
          }
        }
      }
      
      // 2. Dynamic Imports
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          const arg = node.arguments[0];
          if (arg && ts.isStringLiteral(arg)) {
            const importPath = arg.text;
            if (importPath.startsWith('.')) {
                const absImported = path.resolve(fileDir, importPath);
                const relImported = path.relative(projectRoot, absImported);
                importedFiles.push(relImported);
                checkBoundaryPure(relPath, relImported, violations);
            }
          }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Header Rule Check
    const header = code.slice(0, 2000);
    const layerMatch = header.match(/\[LAYER:?\s*([A-Z]+)\]/);
    if (!layerMatch) {
        violations.push(createViolationPure(
            ViolationType.MISSING_TAG,
            relPath,
            `File is missing a [LAYER: TYPE] tag in the header.`,
            'error'
        ));
    }

    return { imports: importedFiles, violations };
}

function checkBoundaryPure(source: string, target: string, violations: IntegrityViolation[]): void {
    const sourceLayer = getLayerFromPath(source);
    const targetLayer = getLayerFromPath(target);

    // Skip self-layer and unknown targets (external library checks handled by other policies)
    if (sourceLayer === targetLayer || targetLayer === 'UNKNOWN') return;

    const allowed = ALLOWED_IMPORTS[sourceLayer] || [];

    if (!allowed.includes(targetLayer)) {
        let message = `Architectural Breach: ${sourceLayer} is illegally importing ${targetLayer} (${target}).`;
        
        // High-precision feedback for new Pass 12 rules
        if (sourceLayer === 'UI' && targetLayer === 'INFRASTRUCTURE') {
            message = `Delivery Leak: UI cannot direct-import INFRASTRUCTURE. Use Domain models or Plumbing utilities instead.`;
        } else if (sourceLayer === 'PLUMBING') {
            message = `Plumbing Violation: Plumbing must remain fully independent. Detected import of ${targetLayer}.`;
        } else if (sourceLayer === 'DOMAIN') {
            message = `Domain Violation: Domain must remain independent. Detected import of ${targetLayer}.`;
        }

        violations.push(createViolationPure(
            ViolationType.LAYER_VIOLATION,
            source,
            message,
            'error'
        ));
    }
}

function getLayerFromPath(pathName: string): string {
    if (pathName.includes('src/domain')) return 'DOMAIN';
    if (pathName.includes('src/core')) return 'CORE';
    if (pathName.includes('src/infrastructure')) return 'INFRASTRUCTURE';
    if (pathName.includes('src/ui')) return 'UI';
    if (pathName.includes('src/plumbing') || pathName.includes('src/utils')) return 'PLUMBING';
    return 'UNKNOWN';
}

function createViolationPure(type: ViolationType, file: string, message: string, severity: 'warn' | 'error'): IntegrityViolation {
    return {
      id: crypto.randomUUID(),
      type,
      file,
      message,
      severity,
      timestamp: new Date().toISOString()
    };
}

export class SemanticIntegrityAdapter implements IntegrityScanner {
  private policy: IntegrityPolicy;
  private readonly MAX_CYCLE_DEPTH = 20;

  constructor(policy: IntegrityPolicy) {
    this.policy = policy;
  }

  async scan(projectRoot: string): Promise<IntegrityReport> {
    const files = this.getAllTsFiles(path.join(projectRoot, 'src'));
    const allViolations: IntegrityViolation[] = [];
    const dependencyGraph = new Map<string, string[]>();

    for (const file of files) {
      const { imports, violations } = analyzeDependencies(file, projectRoot, this.policy);
      allViolations.push(...violations);
      dependencyGraph.set(path.relative(projectRoot, file), imports);
    }

    const circularViolations = this.detectCircularDependencies(dependencyGraph);
    allViolations.push(...circularViolations);

    const score = Math.max(0, 100 - (allViolations.length * 3));

    return {
      score,
      violations: allViolations,
      scannedAt: new Date().toISOString(),
      fileCount: files.length
    };
  }

  async scanFile(filePath: string, projectRoot: string): Promise<IntegrityReport> {
    const absPath = path.resolve(projectRoot, filePath);
    const { violations } = analyzeDependencies(absPath, projectRoot, this.policy);
    
    return {
        score: Math.max(0, 100 - (violations.length * 10)),
        violations,
        scannedAt: new Date().toISOString()
    };
  }

  private detectCircularDependencies(graph: Map<string, string[]>): IntegrityViolation[] {
    const violations: IntegrityViolation[] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycleCache = new Set<string>();

    const check = (node: string, pathNames: string[], depth: number) => {
      if (depth > this.MAX_CYCLE_DEPTH) return;

      if (recStack.has(node)) {
        violations.push(createViolationPure(
          ViolationType.CIRCULAR_DEPENDENCY,
          node,
          `Circular Dependency detected: ${pathNames.join(' -> ')} -> ${node}`,
          'warn'
        ));
        return;
      }

      if (visited.has(node) || cycleCache.has(node)) return;

      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        check(neighbor, [...pathNames, node], depth + 1);
      }

      recStack.delete(node);
      cycleCache.add(node);
    };

    for (const node of graph.keys()) {
      check(node, [], 0);
    }

    return violations;
  }

  private getAllTsFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const name = path.join(dir, file);
      if (fs.statSync(name).isDirectory()) {
         if (!name.includes('node_modules') && !name.includes('.git')) {
            this.getAllTsFiles(name, fileList);
         }
      } else if (name.endsWith('.ts')) {
        fileList.push(name);
      }
    }
    return fileList;
  }
}
