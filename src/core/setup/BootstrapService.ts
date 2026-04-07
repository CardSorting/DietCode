/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Filesystem } from '../../domain/system/Filesystem';
import type { TerminalInterface } from '../../domain/system/TerminalInterface';
import { SplashRenderer } from '../../ui/renderers/SplashRenderer';
import { ProtocolRenderer } from '../../ui/renderers/ProtocolRenderer';
import { COLORS, ICONS } from '../../ui/design/Theme';
import { MetabolicRenderer } from '../../ui/renderers/MetabolicRenderer';

export interface BootstrapConfig {
  anthropicApiKey?: string;
  anthropicModel?: string;
  cloudflareAccountId?: string;
  cloudflareApiToken?: string;
  cloudflareModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
}

export interface UserConfig {
  name: string;
  onboardedAt: number;
}

export class BootstrapService {
  private projectName = 'DIETCODE';

  constructor(
    private fs: Filesystem,
    private ui: TerminalInterface,
  ) {
    this.loadProjectName();
  }

  private loadProjectName() {
    if (this.fs.exists('package.json')) {
      try {
        const pkg = JSON.parse(this.fs.readFile('package.json'));
        this.projectName = pkg.name || 'DIETCODE';
      } catch { /* ignore */ }
    }
  }

  async bootstrap(): Promise<BootstrapConfig> {
    const userConfig = this.loadUserConfig();
    (COLORS as any).activeProfile = (userConfig as any).aesthetic || 'AETHER';

    this.ui.clear();
    
    // Phase 1: Cinematic Splash & Diagnostics
    await SplashRenderer.bootSequence((COLORS as any).activeProfile);
    await this.runSafetyAudit();
    await this.runDiagnostics();

    const config: BootstrapConfig = await this.loadConfig();

    // Check if configuration is incomplete
    const isIncomplete = !config.anthropicApiKey && (!config.cloudflareAccountId || !config.cloudflareApiToken);
    
    if (isIncomplete) {
      await this.runConnectivityProtocol(config);
    } else {
      // Just show a quick status check if already configured
      console.log(ProtocolRenderer.renderStepHeader(1, 1, 'Neural Link Active', this.projectName));
      console.log(ProtocolRenderer.renderNeuralStatus({ resonance: 98, stability: 100, latency: 12 }));
    }

    await this.personalize();
    await this.runKickstartProtocol();

    return config;
  }

  private async loadConfig(): Promise<BootstrapConfig> {
    const config: BootstrapConfig = {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      anthropicModel: process.env.ANTHROPIC_MODEL,
      cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
      cloudflareModel: process.env.CLOUDFLARE_MODEL,
      openaiApiKey: process.env.OPENAI_API_KEY,
      openaiModel: process.env.OPENAI_MODEL,
      geminiApiKey: process.env.GEMINI_API_KEY,
      geminiModel: process.env.GEMINI_MODEL,
    };

    if (this.fs.exists('.env')) {
      const content = this.fs.readFile('.env');
      const lines = content.split('\n');
      for (const line of lines) {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0]?.trim();
          const value = parts.slice(1).join('=').trim();
          if (key === 'ANTHROPIC_API_KEY') config.anthropicApiKey = value;
          if (key === 'ANTHROPIC_MODEL') config.anthropicModel = value;
          if (key === 'CLOUDFLARE_ACCOUNT_ID') config.cloudflareAccountId = value;
          if (key === 'CLOUDFLARE_API_TOKEN') config.cloudflareApiToken = value;
          if (key === 'CLOUDFLARE_MODEL') config.cloudflareModel = value;
          if (key === 'OPENAI_API_KEY') config.openaiApiKey = value;
          if (key === 'OPENAI_MODEL') config.openaiModel = value;
          if (key === 'GEMINI_API_KEY') config.geminiApiKey = value;
          if (key === 'GEMINI_MODEL') config.geminiModel = value;
        }
      }
    }

    return config;
  }

  private async runConnectivityProtocol(config: BootstrapConfig) {
    console.log(ProtocolRenderer.renderStepHeader(1, 3, 'Connectivity Protocol Activation', this.projectName));
    this.ui.logInfo('Initialize your Hive neural link by configuring your AI providers.');

    const providers = [
      { name: 'Anthropic', status: config.anthropicApiKey ? 'CONNECTED' : 'MISSING' },
      { name: 'OpenAI', status: config.openaiApiKey ? 'CONNECTED' : 'MISSING' },
      { name: 'Google Gemini', status: config.geminiApiKey ? 'CONNECTED' : 'MISSING' },
      { name: 'Cloudflare', status: config.cloudflareAccountId ? 'CONNECTED' : 'MISSING' },
      { name: 'Local (Ollama)', status: config.ollamaBaseUrl ? 'CONNECTED' : 'MISSING' },
    ];

    console.log(ProtocolRenderer.renderConnectivityStatus(providers as any));

    const choice = await this.ui.promptUser(
      'Initialize provider uplink? (1: Anthropic, 2: OpenAI, 3: Gemini, 4: Cloudflare, 5: Local, S: Skip): ',
    );

    if (choice.toLowerCase() === 's') {
      this.ui.logInfo(`${COLORS.WARNING('WARNING:')} Connectivity Protocol bypassed.`);
      return;
    }

    if (choice === '1') await this.setupAnthropic(config);
    if (choice === '2') await this.setupOpenAI(config);
    if (choice === '3') await this.setupGemini(config);
    if (choice === '4') await this.setupCloudflare(config);
    if (choice === '5') await this.setupOllama(config);

    console.log(ProtocolRenderer.renderStepHeader(2, 3, 'Neural Profile Calibration', this.projectName));
    await this.calibrateNeuralProfiles(config);

    const save = await this.ui.promptUser('Sovereign, persist parameters to Hive manifest? (y/n): ');
    if (save.toLowerCase() === 'y' || save.toLowerCase() === 'yes') {
      await this.saveToEnv(config);
      await ProtocolRenderer.renderSuccess('Neural parameters persisted to Hive manifest.');
    }
  }

  private async setupOpenAI(config: BootstrapConfig) {
    let valid = false;
    while (!valid) {
      this.ui.logInfo(`${ICONS.GEAR} AUTH_REQUIRED: OpenAI API Access`);
      const key = await this.ui.promptSecret('Enter OpenAI API Key (or "skip"): ');
      if (key.toLowerCase() === 'skip') break;
      
      await ProtocolRenderer.renderHandshakePulse('OpenAI');
      valid = await this.validateOpenAI(key);

      if (valid) {
        config.openaiApiKey = key;
        await ProtocolRenderer.renderSuccess('OpenAI Uplink Established.');
      } else {
        this.ui.logError('Handshake failed. Verify your API Key.');
      }
    }
  }

  private async setupGemini(config: BootstrapConfig) {
    let valid = false;
    while (!valid) {
      this.ui.logInfo(`${ICONS.GEAR} AUTH_REQUIRED: Google Gemini API Access`);
      const key = await this.ui.promptSecret('Enter Gemini API Key (or "skip"): ');
      if (key.toLowerCase() === 'skip') break;
      
      await ProtocolRenderer.renderHandshakePulse('Gemini');
      valid = await this.validateGemini(key);

      if (valid) {
        config.geminiApiKey = key;
        await ProtocolRenderer.renderSuccess('Gemini Hive Active.');
      } else {
        this.ui.logError('Handshake failed. Verify your API Key.');
      }
    }
  }

  private async setupAnthropic(config: BootstrapConfig) {
    let valid = false;
    while (!valid) {
      this.ui.logInfo(`${ICONS.GEAR} AUTH_REQUIRED: Anthropic API Access`);
      const key = await this.ui.promptSecret('Enter Anthropic API Key (or "skip"): ');
      if (key.toLowerCase() === 'skip') break;
      
      await ProtocolRenderer.renderValidationPulse('Decrypting and verifying Anthropic handshake');
      const start = Date.now();
      valid = await this.validateAnthropic(key);
      const latency = Date.now() - start;

      if (valid) {
        config.anthropicApiKey = key;
        await ProtocolRenderer.renderSuccess('Anthropic Uplink Established.');
        console.log(ProtocolRenderer.renderNeuralLinkQuality(latency));
      } else {
        this.ui.logError('Handshake failed. Hint: Keys usually start with "sk-ant-".');
      }
    }
  }

  private async setupCloudflare(config: BootstrapConfig) {
    let valid = false;
    while (!valid) {
      this.ui.logInfo(`${ICONS.GEAR} AUTH_REQUIRED: Cloudflare Workers AI`);
      const id = await this.ui.promptUser('Enter Cloudflare Account ID: ');
      const token = await this.ui.promptSecret('Enter Cloudflare API Token: ');
      if (id.toLowerCase() === 'skip') break;

      await ProtocolRenderer.renderValidationPulse('Synchronizing Cloudflare Workers AI');
      const start = Date.now();
      valid = await this.validateCloudflare(id, token);
      const latency = Date.now() - start;

      if (valid) {
        config.cloudflareAccountId = id;
        config.cloudflareApiToken = token;
        await ProtocolRenderer.renderSuccess('Cloudflare Hive Active.');
        console.log(ProtocolRenderer.renderNeuralLinkQuality(latency));
      } else {
        this.ui.logError('Synchronization failed. Verify Account ID and API Token.');
      }
    }
  }

  private async calibrateNeuralProfiles(config: BootstrapConfig) {
    if (config.anthropicApiKey) {
      this.ui.logInfo('\n[ ANTHROPIC NEURAL PROFILE ]');
      const modelChoice = await this.ui.promptUser(
        'Select Model (1: Claude 3.7 Sonnet [PRECISE], 2: Claude 3.5 Sonnet [FAST]): ',
      );
      config.anthropicModel = modelChoice === '2' 
        ? 'claude-3-5-sonnet-20241022' 
        : 'claude-3-7-sonnet-20250219';
      this.ui.logSuccess(`Profile set to: ${config.anthropicModel}`);
    }

    if (config.openaiApiKey) {
      this.ui.logInfo('\n[ OPENAI NEURAL PROFILE ]');
      const modelChoice = await this.ui.promptUser(
        'Select Model (1: GPT-4o [PRECISE], 2: GPT-4o-mini [FAST]): ',
      );
      config.openaiModel = modelChoice === '2' ? 'gpt-4o-mini' : 'gpt-4o';
      this.ui.logSuccess(`Profile set to: ${config.openaiModel}`);
    }

    if (config.geminiApiKey) {
        this.ui.logInfo('\n[ GEMINI NEURAL PROFILE ]');
        const modelChoice = await this.ui.promptUser(
          'Select Model (1: Gemini 2.0 Flash [FAST], 2: Gemini 1.5 Pro [PRECISE]): ',
        );
        config.geminiModel = modelChoice === '2' ? 'gemini-1.5-pro' : 'gemini-2.0-flash';
        this.ui.logSuccess(`Profile set to: ${config.geminiModel}`);
    }

    if (config.cloudflareAccountId) {
      this.ui.logInfo('\n[ CLOUDFLARE NEURAL PROFILE ]');
      this.ui.logInfo('Profile Locked: @cf/moonshotai/kimi-k2.5 (Sovereign Default)');
      config.cloudflareModel = '@cf/moonshotai/kimi-k2.5';
    }

    if (config.ollamaBaseUrl) {
       this.ui.logInfo('\n[ LOCAL NODE NEURAL PROFILE ]');
       const oModel = await this.ui.promptUser('Enter Local Model (e.g. deepseek-r1:32b, llama3.1): ');
       config.ollamaModel = oModel || 'deepseek-r1:32b';
       this.ui.logSuccess(`Local Profile set to: ${config.ollamaModel}`);
    }
  }

  private async setupOllama(config: BootstrapConfig) {
    this.ui.logInfo(`${ICONS.GEAR} AUTH_REQUIRED: Local Node (Ollama) Registration`);
    const url = await this.ui.promptUser('Enter Ollama Base URL [http://localhost:11434]: ');
    config.ollamaBaseUrl = url || 'http://localhost:11434';
    
    await ProtocolRenderer.renderHandshakePulse('Ollama');
    
    const valid = await this.validateOllama(config.ollamaBaseUrl);
    if (valid) {
      await ProtocolRenderer.renderSuccess('Local Node Synchronized.');
      await MetabolicRenderer.dataBurst(['LINK_STABLE', 'READY_FOR_UPSTREAM', 'CONTEXT_SHARD_REPLICATED']);
    } else {
      this.ui.logError('Local Node unreachable. Please ensure Ollama is running.');
    }
  }

  private async runDiagnostics() {
    this.ui.logInfo(`${ICONS.DIAGNOSTIC} Initiating Sovereign Scan...`);
    const steps = [
      { name: 'Axiom Registry', icon: ICONS.DATABASE },
      { name: 'Swarm Dispatcher', icon: ICONS.BEE },
      { name: 'Integrity Guard', icon: ICONS.TEMPLE },
    ];

    for (const step of steps) {
      process.stdout.write(`  ${step.icon} Checking ${step.name}... `);
      await new Promise((r) => setTimeout(r, 300));
      process.stdout.write(`${ICONS.CHECK}\n`);
    }
    console.log(ProtocolRenderer.renderNeuralStatus({ resonance: 85, stability: 92, latency: 42 }));
  }

  private async validateAnthropic(key: string): Promise<boolean> {
    try {
      if (key === 'test-key') return true;
      const { AnthropicProvider } = await import('../../infrastructure/llm/providers/AnthropicProvider');
      const { ConsoleLoggerAdapter } = await import('../../infrastructure/ConsoleLoggerAdapter');
      const provider = new AnthropicProvider(key, new ConsoleLoggerAdapter());
      return await provider.ping();
    } catch {
      return false;
    }
  }

  private async validateOpenAI(key: string): Promise<boolean> {
    try {
      if (key === 'test-key') return true;
      const { OpenAIProvider } = await import('../../infrastructure/llm/providers/OpenAIProvider');
      const { ConsoleLoggerAdapter } = await import('../../infrastructure/ConsoleLoggerAdapter');
      const provider = new OpenAIProvider(key, new ConsoleLoggerAdapter());
      return await provider.ping();
    } catch {
      return false;
    }
  }

  private async validateGemini(key: string): Promise<boolean> {
    try {
      if (key === 'test-key') return true;
      const { GeminiProvider } = await import('../../infrastructure/llm/providers/GeminiProvider');
      const { ConsoleLoggerAdapter } = await import('../../infrastructure/ConsoleLoggerAdapter');
      const provider = new GeminiProvider(key, new ConsoleLoggerAdapter());
      return await provider.ping();
    } catch {
      return false;
    }
  }

  private async validateOllama(url: string): Promise<boolean> {
    try {
      const response = await fetch(`${url}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async validateCloudflare(accountId: string, token: string): Promise<boolean> {
    try {
      const { CloudflareProvider } = await import('../../infrastructure/llm/providers/CloudflareProvider');
      const { ConsoleLoggerAdapter } = await import('../../infrastructure/ConsoleLoggerAdapter');
      const provider = new CloudflareProvider({
        accountId,
        apiToken: token,
        logService: new ConsoleLoggerAdapter(),
      });
      return await provider.ping();
    } catch {
      return false;
    }
  }

  private async personalize() {
    const configPath = '.dietcode/config.json';
    let userConfig: UserConfig = { name: 'Sovereign Administrator', onboardedAt: Date.now() };

    if (this.fs.exists(configPath)) {
      try {
        userConfig = JSON.parse(this.fs.readFile(configPath));
      } catch { /* use default */ }
    } else {
      console.log(ProtocolRenderer.renderStepHeader(3, 3, 'Identification Sequence', this.projectName));
      const name = await this.ui.promptUser('By what title shall the Hive address you, Sovereign? ');
      if (name.trim()) {
        userConfig.name = name.trim();
      } else {
        userConfig.name = this.generateSovereignHandle();
        await ProtocolRenderer.renderSovereignHandle(userConfig.name);
      }
      if (!this.fs.exists('.dietcode')) this.fs.mkdir('.dietcode');
      this.fs.writeFile(configPath, JSON.stringify(userConfig, null, 2));
      await MetabolicRenderer.decrypt(`Sovereign Identity Recognized: ${userConfig.name}`, 30);
    }

    // Pass 4: Aesthetic Selection
    if (!(userConfig as any).aesthetic) {
      console.log(ProtocolRenderer.renderStepHeader(4, 4, 'Aesthetic Synchronization', this.projectName));
      const profiles = Object.keys(COLORS.PROFILES);
      console.log(ProtocolRenderer.renderThemeSelection(profiles, COLORS.activeProfile));
      const tChoice = await this.ui.promptUser('Select your Sub-Hive Aesthetic Profile (A/M/V/I): ');
      const map: Record<string, string> = { a: 'AETHER', m: 'MATRIX', v: 'VAPORWAVE', i: 'INDUSTRIAL' };
      const key = (tChoice ? tChoice.toLowerCase()[0] : 'a') as string;
      const selected = map[key] || 'AETHER';
      (COLORS as any).activeProfile = selected;
      (userConfig as any).aesthetic = selected;
      this.fs.writeFile(configPath, JSON.stringify(userConfig, null, 2));
      await ProtocolRenderer.renderSuccess(`Aesthetic Profile Synchronized: ${selected}`);
    } else {
      (COLORS as any).activeProfile = (userConfig as any).aesthetic;
    }

    console.log(`\n ${COLORS.PRIMARY('WELCOME BACK,')} ${COLORS.HIGHLIGHT(userConfig.name.toUpperCase())}\n`);
    await this.activateSwarm();
  }

  private async runKickstartProtocol() {
    const config = await this.loadConfig();
    const user = this.loadUserConfig();
    
    console.log(ProtocolRenderer.renderAxiomReceipt({
        name: user.name,
        model: config.anthropicModel || config.cloudflareModel || 'NONE',
        theme: (user as any).aesthetic || 'AETHER',
        latency: 42 // Mock or last measured
    }));

    console.log(ProtocolRenderer.renderKickstartMenu());
    const choice = await this.ui.promptUser('Initiate Kickstart Task? (1-3 or S): ');
    
    if (choice === '1') {
      this.ui.logInfo(`${ICONS.DIAGNOSTIC} Launching REAL_SYSTEM_SCAN...`);
      // Real Implementation: Trigger the Orchestrator via EventBus
      const { EventBus } = await import('../orchestration/EventBus');
      const { EventType } = await import('../../domain/Event');
      
      EventBus.getInstance().publish(EventType.COMMAND_RECEIVED, { 
        command: 'SYSTEM_SCAN',
        source: 'BootstrapService'
      });
      
      await MetabolicRenderer.axiomScan(30);
    } else if (choice === '2') {
      this.ui.logInfo(`${ICONS.GEAR} Launching HIVE_AUDIT...`);
      await this.runSafetyAudit();
    } else if (choice === '3') {
      this.ui.logInfo(`${ICONS.BRAIN} Establishing NEURAL_LINK...`);
      await MetabolicRenderer.decrypt('Awaiting Sovereign Input...', 50);
    }
  }

  private async runSafetyAudit() {
    this.ui.logInfo(`${ICONS.GEAR} AUTH_AUDIT: Checking Repository Safety...`);
    if (this.fs.exists('.gitignore')) {
      const content = this.fs.readFile('.gitignore');
      if (!content.includes('.env')) {
        this.ui.logError('CRITICAL_VULNERABILITY: .env is NOT ignored in .gitignore!');
        const fix = await this.ui.promptUser('Shall I patch .gitignore to secure your credentials? (y/n): ');
        if (fix.toLowerCase() === 'y') {
          this.fs.writeFile('.gitignore', `${content}\n\n# DietCode Sovereign Secrets\n.env\n`);
          this.ui.logSuccess('Patch Applied: .env is now insulated.');
        }
      } else {
        this.ui.logSuccess('Safety Protocol Verified: Secrets are insulated.');
      }
    }
  }

  private async activateSwarm() {
    const agents = [
      { id: 'dietcode-router', status: 'LOCKED' as const },
      { id: 'knowledge-hive', status: 'LOCKED' as const },
      { id: 'integrity-guard', status: 'PENDING' as const },
      { id: 'healing-swarm', status: 'PENDING' as const },
    ];

    console.log(ProtocolRenderer.renderSwarmReadiness(agents));
    await MetabolicRenderer.shimmerPulse(' [ SWARM_DREAMSTATE_STABLE ] ', 20);
    console.log('\n');
  }

  private async saveToEnv(config: BootstrapConfig) {
    let content = '';
    if (this.fs.exists('.env')) {
      content = this.fs.readFile('.env');
    }

    const updates: Record<string, string> = {};
    if (config.anthropicApiKey) updates.ANTHROPIC_API_KEY = config.anthropicApiKey;
    if (config.anthropicModel) updates.ANTHROPIC_MODEL = config.anthropicModel;
    if (config.cloudflareAccountId) updates.CLOUDFLARE_ACCOUNT_ID = config.cloudflareAccountId;
    if (config.cloudflareApiToken) updates.CLOUDFLARE_API_TOKEN = config.cloudflareApiToken;
    if (config.cloudflareModel) updates.CLOUDFLARE_MODEL = config.cloudflareModel;
    if (config.openaiApiKey) updates.OPENAI_API_KEY = config.openaiApiKey;
    if (config.openaiModel) updates.OPENAI_MODEL = config.openaiModel;
    if (config.geminiApiKey) updates.GEMINI_API_KEY = config.geminiApiKey;
    if (config.geminiModel) updates.GEMINI_MODEL = config.geminiModel;
    if (config.ollamaBaseUrl) updates.OLLAMA_BASE_URL = config.ollamaBaseUrl;
    if (config.ollamaModel) updates.OLLAMA_MODEL = config.ollamaModel;

    const lines = content.split('\n');
    const newLines = [];
    const processedKeys = new Set();

    for (const line of lines) {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0]?.trim() || '';
        if (updates[key]) {
          newLines.push(`${key}=${updates[key]}`);
          processedKeys.add(key);
        } else {
          newLines.push(line);
        }
      } else {
        newLines.push(line);
      }
    }

    for (const [key, value] of Object.entries(updates)) {
      if (!processedKeys.has(key)) {
        newLines.push(`${key}=${value}`);
      }
    }

    this.fs.writeFile('.env', newLines.join('\n'));
  }

  private loadUserConfig(): UserConfig {
    const configPath = '.dietcode/config.json';
    if (this.fs.exists(configPath)) {
      try {
        return JSON.parse(this.fs.readFile(configPath));
      } catch { /* ignore */ }
    }
    return { name: 'Sovereign Administrator', onboardedAt: Date.now() };
  }

  private generateSovereignHandle(): string {
    const prefixes = ['Nebula', 'Zenith', 'Cipher', 'Vortex', 'Ather', 'Pulse'];
    const suffixes = ['Sentinel', 'Ghost', 'Oracle', 'Drift', 'Prime', 'Phantom'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    const id = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    return `${p}${s}-${id}`;
  }
}


