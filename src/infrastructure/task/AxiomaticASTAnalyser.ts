/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: AST-based precision analysis for architectural integrity
 * Provides type-safe validation of imports and global access, ignoring comments/strings.
 */

import * as ts from 'typescript';

export interface ASTViolation {
  lineNumber: number;
  snippet: string;
  message: string;
}

/**
 * High-precision AST analyser for verifying architectural axioms
 */
export class AxiomaticASTAnalyser {
  /**
   * Detects unsafe imports and requires in a given source file
   * Excludes comments and dead code via actual AST traversal.
   */
  detectUnsafeImports(content: string, prohibitedModules: string[]): ASTViolation[] {
    const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);
    const violations: ASTViolation[] = [];

    const visitor = (node: ts.Node) => {
      // 1. Check Import Declarations
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, '');
        if (prohibitedModules.some(pkg => moduleSpecifier === pkg || moduleSpecifier.startsWith(`${pkg}/`))) {
          violations.push(this.createViolation(sourceFile, node, `Prohibited import: '${moduleSpecifier}'`));
        }
      }

      // 2. Check Require calls
      if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === 'require') {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          const moduleSpecifier = arg.text;
          if (prohibitedModules.some(pkg => moduleSpecifier === pkg || moduleSpecifier.startsWith(`${pkg}/`))) {
            violations.push(this.createViolation(sourceFile, node, `Prohibited require: '${moduleSpecifier}'`));
          }
        }
      }

      ts.forEachChild(node, visitor);
    };

    ts.forEachChild(sourceFile, visitor);
    return violations;
  }

  /**
   * Detects prohibited global function calls or property access
   */
  detectUnsafeCalls(content: string, prohibitedGlobals: string[]): ASTViolation[] {
    const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);
    const violations: ASTViolation[] = [];

    const visitor = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const callText = node.expression.getText(sourceFile);
        if (prohibitedGlobals.some(g => callText === g || callText.startsWith(`${g}.`))) {
          violations.push(this.createViolation(sourceFile, node, `Prohibited global call: '${callText}'`));
        }
      }

      ts.forEachChild(node, visitor);
    };

    ts.forEachChild(sourceFile, visitor);
    return violations;
  }

  /**
   * Axiom 3.0: Verifies that a class explicitly implements an interface
   * specifically for infrastructure hardening.
   */
  detectMissingInterfaces(content: string): ASTViolation[] {
    const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);
    const violations: ASTViolation[] = [];

    const visitor = (node: ts.Node) => {
      if (ts.isClassDeclaration(node)) {
        const hasImplements = node.heritageClauses?.some(hc => hc.token === ts.SyntaxKind.ImplementsKeyword);
        if (!hasImplements) {
          const className = node.name?.getText(sourceFile) || 'AnonymousClass';
          violations.push(this.createViolation(sourceFile, node, `Ghost Implementation: Class '${className}' lacks domain interface mapping.`));
        }
      }
      ts.forEachChild(node, visitor);
    };

    ts.forEachChild(sourceFile, visitor);
    return violations;
  }

  /**
   * Axiom 3.0: Calculates Cyclomatic Complexity of functions
   * Flags those exceeding the simplicity threshold.
   */
  detectHighComplexity(content: string, threshold: number = 10): ASTViolation[] {
    const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);
    const violations: ASTViolation[] = [];

    const visitor = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
        let complexity = 1;

        const countBranches = (child: ts.Node) => {
          if (ts.isIfStatement(child) || 
              ts.isBinaryExpression(child) && (child.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken || child.operatorToken.kind === ts.SyntaxKind.BarBarToken) ||
              ts.isConditionalExpression(child) ||
              ts.isCaseClause(child) ||
              ts.isForStatement(child) ||
              ts.isForInStatement(child) ||
              ts.isForOfStatement(child) ||
              ts.isWhileStatement(child) ||
              ts.isDoStatement(child) ||
              ts.isCatchClause(child)) {
            complexity++;
          }
          ts.forEachChild(child, countBranches);
        };

        ts.forEachChild(node, countBranches);

        if (complexity > threshold) {
          const funcName = (node as any).name?.getText(sourceFile) || 'anonymous';
          violations.push(this.createViolation(sourceFile, node, `Gravity Bloat: Function '${funcName}' complexity is ${complexity} (Max: ${threshold}).`));
        }
      }
      ts.forEachChild(node, visitor);
    };

    ts.forEachChild(sourceFile, visitor);
    return violations;
  }

  private createViolation(sourceFile: ts.SourceFile, node: ts.Node, message: string): ASTViolation {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return {
      lineNumber: line + 1,
      snippet: (node.getText(sourceFile).split('\n')[0] || '').trim(),
      message
    };
  }
}
