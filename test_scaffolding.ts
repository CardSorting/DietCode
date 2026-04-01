import { AttachmentResolver } from './src/core/AttachmentResolver';
import { ContextService } from './src/core/ContextService';
import { PromptService } from './src/core/PromptService';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { TerminalDisplay } from './src/infrastructure/TerminalDisplay';
import { EventBus } from './src/core/EventBus';
import { ExecutionService } from './src/core/ExecutionService';
import { SnapshotService } from './src/core/SnapshotService';
import { TypeScriptValidator } from './src/infrastructure/TypeScriptValidator';
import { ValidationService } from './src/core/ValidationService';
import { FuzzySearchRepository } from './src/infrastructure/FuzzySearchRepository';
import { SearchService } from './src/core/SearchService';
import { SkillLoader } from './src/core/SkillLoader';
import { EventType } from './src/domain/Event';
import type { ProjectContext } from './src/domain/ProjectContext';
import type { Snapshot, SnapshotRepository } from './src/domain/Snapshot';
import * as fs from 'fs';
import * as path from 'path';

// Mock Snapshot Repository
class MockSnapshotRepo implements SnapshotRepository {
  private snapshots: Snapshot[] = [];
  async saveSnapshot(s: Snapshot) { this.snapshots.push(s); }
  async getLatestSnapshot(p: string) { return this.snapshots.filter(s => s.path === p).pop() || null; }
  async getSnapshotById(id: string) { return this.snapshots.find(s => s.id === id) || null; }
  async cleanup() {}
}

async function test() {
  const fileSystem = new FileSystemAdapter();
  const display = new TerminalDisplay();
  const eventBus = new EventBus();
  
  const snapshotService = new SnapshotService(new MockSnapshotRepo(), fileSystem);
  const executionService = new ExecutionService(eventBus, snapshotService);
  const validator = new TypeScriptValidator();
  const validationService = new ValidationService(validator, eventBus);
  const searchRepo = new FuzzySearchRepository(fileSystem);
  const searchService = new SearchService(searchRepo);
  const skillLoader = new SkillLoader(fileSystem);

  const project: ProjectContext = {
    workspace: { id: 'test', path: process.cwd(), name: 'DietCode' },
    repository: { id: 'test-repo', workspaceId: 'test', name: 'DietCode', path: process.cwd(), defaultBranch: 'main' }
  };

  // Wire up Error Events
  eventBus.subscribe(EventType.ERROR, (e) => {
    display.status(`${e.payload.message}`, 'error');
    if (e.payload.errors) {
       e.payload.errors.forEach((err: any) => {
         display.status(`  Line ${err.line}: ${err.message}`, 'warn');
       });
    }
  });

  display.alert('Phase V Test', 'Initializing cognitive and robust discovery verification.');

  // --- 1. FUZZY SEARCH TEST ---
  display.thought('Testing fuzzy path resolution...');
  const query = 'package.js'; // Imprecise
  const resolved = await searchService.resolveImprecisePath(query, project.repository.path);
  display.status(`Query: "${query}" -> Resolved: "${resolved}"`, resolved?.endsWith('package.json') ? 'success' : 'error');

  // --- 2. VALIDATION TEST ---
  display.thought('Testing cognitive validation (TSC)...');
  
  display.status('Validating correct code...', 'info');
  const validResult = await validationService.validate('test.ts', 'const x: number = 10;');
  display.status(`Result: ${validResult.isValid ? 'VALID' : 'INVALID'}`, validResult.isValid ? 'success' : 'error');

  display.status('Validating broken code...', 'info');
  const invalidResult = await validationService.validate('test.ts', 'const x: number = "not a number";');
  display.status(`Result: ${invalidResult.isValid ? 'VALID' : 'INVALID'}`, !invalidResult.isValid ? 'success' : 'error');

  // --- 3. RICH SKILL TEST ---
  display.thought('Testing YAML skill parsing...');
  const skillDir = path.join(project.repository.path, '.dietcode', 'skills');
  const skillFile = path.join(skillDir, 'test-skill.md');
  if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true });
  
  fs.writeFileSync(skillFile, `---
name: "Sovereign Architect"
description: "Handles high-level architectural decisions"
version: "1.0.0"
---
# Architect Prompt
Focus on JoyZoning principles.`);

  const skills = await skillLoader.load(project);
  const architect = skills.find(s => s.name === 'Sovereign Architect');
  
  if (architect) {
    display.status(`Loaded Skill: ${architect.name} (v${architect.metadata?.version})`, 'success');
    display.status(`Description: ${architect.description}`, 'info');
  } else {
    display.status('Failed to load skill with YAML metadata.', 'error');
  }

  display.status('Phase V Verification Complete.', 'success');
  
  // Cleanup
  if (fs.existsSync(skillFile)) fs.unlinkSync(skillFile);
}

test().catch(console.error);
