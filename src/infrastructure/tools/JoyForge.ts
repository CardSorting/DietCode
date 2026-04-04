/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Architectural Forge — autonomous decoupling via interface extraction.
 * Pass 15: JoyForge — derives Domain abstractions from concrete implementations.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

export interface ForgeResult {
  interfacePath: string;
  interfaceContent: string;
  rationale: string;
}

export class JoyForge {
  /**
   * Extracts a Domain interface from a concrete implementation class.
   */
  async extractInterface(filePath: string, projectRoot: string): Promise<ForgeResult> {
    const absPath = path.resolve(projectRoot, filePath);
    const sourceCode = fs.readFileSync(absPath, 'utf8');
    const sourceFile = ts.createSourceFile(absPath, sourceCode, ts.ScriptTarget.Latest, true);

    const methodSignatures: string[] = [];
    let className = 'IUnknown';

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        className = node.name.text;
      }

      if (ts.isMethodDeclaration(node) && node.name) {
        // Only extract public methods
        const isPrivate = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword);
        const isProtected = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ProtectedKeyword);

        if (!isPrivate && !isProtected) {
          const methodName = node.name.getText(sourceFile);
          const parameters = node.parameters.map((p) => p.getText(sourceFile)).join(', ');
          const returnType = node.type ? node.type.getText(sourceFile) : 'any';

          methodSignatures.push(
            `  ${methodName}(${parameters}): Promise<${returnType}> | ${returnType};`,
          );
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    const interfaceName =
      className.startsWith('Sqlite') || className.startsWith('FileSystem')
        ? className.replace(/Sqlite|FileSystem/, '')
        : `I${className}`;

    const interfaceContent = `/**
 * [LAYER: DOMAIN]
 * Automated Extraction by JoyForge.
 */

export interface ${interfaceName} {
${methodSignatures.join('\n')}
}
`;

    const interfaceDir = path.join(projectRoot, 'src/domain/contracts');
    if (!fs.existsSync(interfaceDir)) {
      fs.mkdirSync(interfaceDir, { recursive: true });
    }

    const interfacePath = path.join(interfaceDir, `${interfaceName}.ts`);

    return {
      interfacePath: path.relative(projectRoot, interfacePath),
      interfaceContent,
      rationale: `Architectural Forge: Extracted ${interfaceName} from ${path.basename(filePath)} to enable Domain-layer decoupling.`,
    };
  }
}
