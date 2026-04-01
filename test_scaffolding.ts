import { AttachmentResolver } from './src/core/AttachmentResolver';
import { ContextService } from './src/core/ContextService';
import { PromptService } from './src/core/PromptService';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { TerminalDisplay } from './src/infrastructure/TerminalDisplay';
import { EventBus } from './src/core/EventBus';
import { ExecutionService } from './src/core/ExecutionService';
import { SnapshotService } from './src/core/SnapshotService';
import { EventType } from './src/domain/Event';
import type { ProjectContext } from './src/domain/ProjectContext';
import type { Snapshot, SnapshotRepository } from './src/domain/Snapshot';

// Mock Snapshot Repository
class MockSnapshotRepo implements SnapshotRepository {
  private snapshots: Snapshot[] = [];
  async saveSnapshot(s: Snapshot) { this.snapshots.push(s); }
  async getLatestSnapshot(p: string) { return this.snapshots.filter(s => s.path === p).pop() || null; }
  async getSnapshotById(id: string) { return this.snapshots.find(s => s.id === id) || null; }
  async cleanup() {}
}

async function test() {
  const fs = new FileSystemAdapter();
  const display = new TerminalDisplay();
  const eventBus = new EventBus();
  
  const snapshotService = new SnapshotService(new MockSnapshotRepo(), fs);
  const executionService = new ExecutionService(eventBus, snapshotService);
  const resolver = new AttachmentResolver(fs, eventBus);
  const contextService = new ContextService(fs);
  const promptService = new PromptService();

  const project: ProjectContext = {
    workspace: { id: 'test', path: process.cwd(), name: 'DietCode' },
    repository: { id: 'test-repo', workspaceId: 'test', name: 'DietCode', path: process.cwd(), defaultBranch: 'main' }
  };

  // --- WIRE UP EVENTS TO DISPLAY ---
  eventBus.subscribe(EventType.TOOL_CALL_START, (e) => {
    display.status(`Executing tool: ${e.payload.toolName}...`, 'info');
  });
  eventBus.subscribe(EventType.TOOL_CALL_SUCCESS, (e) => {
    display.status(`Tool ${e.payload.toolName} succeeded.`, 'success');
  });
  eventBus.subscribe(EventType.ATTACHMENT_RESOLVED, (e) => {
    display.status(`Resolved attachment: ${e.payload.path} (${e.payload.type})`, 'info');
  });

  display.alert('Phase IV Test', 'Initializing visual and event-driven verification.');

  display.thought('I am now gathering context and resolving attachments...');
  
  const systemContext = await contextService.gather(project);
  const attachments = await resolver.resolve('Check @[package.json:1-5]', project);

  const prompt = promptService.assemble(systemContext, [], attachments);
  display.code(prompt.slice(0, 300) + '...', 'markdown');

  // --- TEST EXECUTION SERVICE ---
  await executionService.execute(
    'test_tool',
    { foo: 'bar' },
    async (args) => {
       display.progress(1, 3, 'Processing step 1');
       await new Promise(r => setTimeout(r, 200));
       display.progress(2, 3, 'Processing step 2');
       await new Promise(r => setTimeout(r, 200));
       display.progress(3, 3, 'Finalizing');
       return { status: 'ok', data: args };
    },
    'package.json'
  );

  display.status('Phase IV Verification Complete.', 'success');
}

test().catch(console.error);
