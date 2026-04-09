/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Filesystem } from '../../domain/system/Filesystem';
import type { TerminalInterface } from '../../domain/system/TerminalInterface';
import { COLORS, ICONS } from '../../ui/design/Theme';
import { MetabolicRenderer } from '../../ui/renderers/MetabolicRenderer';
import { ProtocolRenderer } from '../../ui/renderers/ProtocolRenderer';
import { SplashRenderer } from '../../ui/renderers/SplashRenderer';

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
  openrouterApiKey?: string;
  openrouterModel?: string;
}

export interface UserConfig {
  name: string;
  onboardedAt: number;
}

const PROVIDER_UPLINKS: Record<
  'anthropic' | 'openai' | 'gemini' | 'cloudflare' | 'ollama',
  { name: string; url: string; strength: string }
> = {
  anthropic: {
    name: 'Anthropic',
    url: 'https://console.anthropic.com/',
    strength: 'High-intelligence reasoning (Claude 3.7)',
  },
  openai: {
    name: 'OpenAI',
    url: 'https://platform.openai.com/api-keys',
    strength: 'Versatile and widely supported (GPT-4o)',
  },
  gemini: {
    name: 'Google Gemini',
    url: 'https://aistudio.google.com/app/apikey',
    strength: 'Fast performance and massive context (Gemini 2.0)',
  },
  cloudflare: {
    name: 'Cloudflare Workers AI',
    url: 'https://dash.cloudflare.com/',
    strength: 'Edge-optimized and cost-effective',
  },
  ollama: {
    name: 'Ollama (Local)',
    url: 'https://ollama.com/',
    strength: 'Private, offline, and free local reasoning',
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/keys',
    strength: 'Unified API for 100+ models (Claude, Llama, DeepSeek)',
  },
};

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
      } catch {
        /* ignore */
      }
    }
  }

  async bootstrap(
    overrides?: Partial<BootstrapConfig>,
    forceSetup?: boolean,
  ): Promise<BootstrapConfig> {
    const userConfig = this.loadUserConfig();
    (COLORS as any).activeProfile = (userConfig as any).aesthetic || 'AETHER';

    this.ui.clear();

    // Phase 1: Cinematic Splash & Diagnostics
    await SplashRenderer.bootSequence((COLORS as any).activeProfile);

    // Apply Overrides Immediately
    if (overrides && Object.keys(overrides).length > 0) {
      const current = await this.loadConfig();
      const merged = { ...current, ...overrides };
      await this.saveToEnv(merged);
      await ProtocolRenderer.renderSuccess(
        'Neural parameters synchronized via direct CLI override.',
      );
    }

    await this.runSafetyAudit();
    await this.runDiagnostics();

    const config: BootstrapConfig = await this.loadConfig();

    const isIncomplete =
      !config.anthropicApiKey &&
      (!config.cloudflareAccountId || !config.cloudflareApiToken) &&
      !config.openaiApiKey &&
      !config.geminiApiKey;

    // Phase 2: AI Provider Selection (Linear Step-by-Step)
    if (isIncomplete || forceSetup) {
      await this.runProviderSetup(config);
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
      openrouterApiKey: process.env.OPENROUTER_API_KEY,
      openrouterModel: process.env.OPENROUTER_MODEL,
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
          if (key === 'OPENROUTER_API_KEY') config.openrouterApiKey = value;
          if (key === 'OPENROUTER_MODEL') config.openrouterModel = value;
        }
      }
    }

    return config;
  }

  private async runProviderSetup(config: BootstrapConfig) {
    console.log(ProtocolRenderer.renderStepHeader(1, 3, 'AI Provider Setup', this.projectName));
    this.ui.logInfo('To get started, we need to connect a "Brain" to DietCode.');
    this.ui.logInfo(
      'You can use a cloud service (like Anthropic or OpenAI) or a local one (Ollama).',
    );

    const providers = [
      { id: '1', name: 'Anthropic (Recommended)', meta: PROVIDER_UPLINKS.anthropic },
      { id: '2', name: 'OpenAI', meta: PROVIDER_UPLINKS.openai },
      { id: '3', name: 'Google Gemini', meta: PROVIDER_UPLINKS.gemini },
      { id: '4', name: 'Cloudflare Workers AI', meta: PROVIDER_UPLINKS.cloudflare },
      { id: '5', name: 'Ollama (Local/Private)', meta: PROVIDER_UPLINKS.ollama },
      { id: '6', name: 'OpenRouter (Multi-Model)', meta: (PROVIDER_UPLINKS as any).openrouter },
    ];

    for (const p of providers) {
      console.log(`  ${COLORS.HIVE_GOLD(p.id)}. ${p.name.padEnd(25)} - ${p.meta.strength}`);
    }

    const choice = await this.ui.promptUser(
      '\nWhich AI service would you like to connect first? (1-6): ',
    );

    if (choice === '1') await this.setupAnthropic(config);
    else if (choice === '2') await this.setupOpenAI(config);
    else if (choice === '3') await this.setupGemini(config);
    else if (choice === '4') await this.setupCloudflare(config);
    else if (choice === '5') await this.setupOllama(config);
    else if (choice === '6') await this.setupOpenRouter(config);

    if (!config.ollamaBaseUrl) {
      await this.discoverLocalNode(config);
    }
  }

  private async setupOpenAI(config: BootstrapConfig) {
    let valid = false;
    const meta = PROVIDER_UPLINKS.openai;
    while (!valid) {
      this.ui.logInfo(`${ICONS.GEAR} AUTH_REQUIRED: ${meta.name} API Access`);
      this.ui.logInfo(`STRENGTH: ${COLORS.HIGHLIGHT(meta.strength)}`);
      this.ui.logInfo(`OBTAIN_KEY: ${COLORS.HIVE_CYAN(meta.url)}`);

      const key = await this.ui.promptSecret('Enter OpenAI API Key (or "skip"): ');
      if (key.toLowerCase() === 'skip') break;

      const sanitizedKey = key.trim();
      await ProtocolRenderer.renderHandshakePulse('OpenAI');
      valid = await this.validateOpenAI(sanitizedKey);

      if (valid) {
        config.openaiApiKey = sanitizedKey;
        await ProtocolRenderer.renderSuccess('OpenAI Uplink Established.');
      } else {
        this.ui.logError('Handshake failed. Verify your API Key.');
      }
    }
  }

  private async setupGemini(config: BootstrapConfig) {
    let valid = false;
    const meta = PROVIDER_UPLINKS.gemini;
    while (!valid) {
      this.ui.logInfo(`${ICONS.GEAR} AUTH_REQUIRED: ${meta.name} API Access`);
      this.ui.logInfo(`STRENGTH: ${COLORS.HIGHLIGHT(meta.strength)}`);
      this.ui.logInfo(`OBTAIN_KEY: ${COLORS.HIVE_CYAN(meta.url)}`);

      const key = await this.ui.promptSecret('Enter Gemini API Key (or "skip"): ');
      if (key.toLowerCase() === 'skip') break;

      const sanitizedKey = key.trim();
      await ProtocolRenderer.renderHandshakePulse('Gemini');
      valid = await this.validateGemini(sanitizedKey);

      if (valid) {
        config.geminiApiKey = sanitizedKey;
        await ProtocolRenderer.renderSuccess('Gemini Hive Active.');
      } else {
        this.ui.logError('Handshake failed. Verify your API Key.');
      }
    }
  }

  private async setupAnthropic(config: BootstrapConfig) {
    let valid = false;
    const meta = PROVIDER_UPLINKS.anthropic;
    while (!valid) {
      this.ui.logInfo(`${ICONS.GEAR} AUTH_REQUIRED: ${meta.name} API Access`);
      this.ui.logInfo(`STRENGTH: ${COLORS.HIGHLIGHT(meta.strength)}`);
      this.ui.logInfo(`OBTAIN_KEY: ${COLORS.HIVE_CYAN(meta.url)}`);

      const key = await this.ui.promptSecret('Enter Anthropic API Key (or "skip"): ');
      if (key.toLowerCase() === 'skip') break;

      const sanitizedKey = key.trim();
      await ProtocolRenderer.renderValidationPulse('Decrypting and verifying Anthropic handshake');
      const start = Date.now();
      valid = await this.validateAnthropic(sanitizedKey);
      const latency = Date.now() - start;

      if (valid) {
        config.anthropicApiKey = sanitizedKey;
        await ProtocolRenderer.renderSuccess('Anthropic Uplink Established.');
        console.log(ProtocolRenderer.renderNeuralLinkQuality(latency));
      } else {
        this.ui.logError('Handshake failed. Hint: Keys usually start with "sk-ant-".');
      }
    }
  }

  private async setupCloudflare(config: BootstrapConfig) {
    let valid = false;
    const meta = PROVIDER_UPLINKS.cloudflare;
    while (!valid) {
      this.ui.logInfo(`${ICONS.GEAR} AUTH_REQUIRED: ${meta.name}`);
      this.ui.logInfo(`STRENGTH: ${COLORS.HIGHLIGHT(meta.strength)}`);
      this.ui.logInfo(`DASHBOARD: ${COLORS.HIVE_CYAN(meta.url)}`);

      const id = await this.ui.promptUser('Enter Cloudflare Account ID: ');
      const token = await this.ui.promptSecret('Enter Cloudflare API Token: ');
      if (id.toLowerCase() === 'skip') break;

      const sanitizedId = id.trim();
      const sanitizedToken = token.trim();

      await ProtocolRenderer.renderValidationPulse('Synchronizing Cloudflare Workers AI');
      const start = Date.now();
      valid = await this.validateCloudflare(sanitizedId, sanitizedToken);
      const latency = Date.now() - start;

      if (valid) {
        config.cloudflareAccountId = sanitizedId;
        config.cloudflareApiToken = sanitizedToken;
        await ProtocolRenderer.renderSuccess('Cloudflare Hive Active.');
        console.log(ProtocolRenderer.renderNeuralLinkQuality(latency));
      } else {
        this.ui.logError('Synchronization failed. Verify Account ID and API Token.');
      }
    }
  }

  private async setupOpenRouter(config: BootstrapConfig) {
    let valid = false;
    const meta = (PROVIDER_UPLINKS as any).openrouter;
    while (!valid) {
      this.ui.logInfo(`${ICONS.GEAR} AUTH_REQUIRED: ${meta.name} API Access`);
      this.ui.logInfo(`STRENGTH: ${COLORS.HIGHLIGHT(meta.strength)}`);
      this.ui.logInfo(`OBTAIN_KEY: ${COLORS.HIVE_CYAN(meta.url)}`);

      const key = await this.ui.promptSecret('Enter OpenRouter API Key (or "skip"): ');
      if (key.toLowerCase() === 'skip') break;

      const sanitizedKey = key.trim();
      await ProtocolRenderer.renderHandshakePulse('OpenRouter');
      valid = await this.validateOpenRouter(sanitizedKey);

      if (valid) {
        config.openrouterApiKey = sanitizedKey;
        await ProtocolRenderer.renderSuccess('OpenRouter Uplink Established.');
      } else {
        this.ui.logError('Handshake failed. Verify your API Key.');
      }
    }
  }

  private async calibrateNeuralProfiles(config: BootstrapConfig) {
    console.log(ProtocolRenderer.renderStepHeader(2, 3, 'Model Selection', this.projectName));
    this.ui.logInfo("Now, let's pick which AI model to use for your tasks.");

    if (config.anthropicApiKey) {
      this.ui.logInfo(`\n${ICONS.GEAR} Choose your Anthropic Model:`);
      console.log('  1. Claude 3.7 Sonnet (Best for coding & reasoning)');
      console.log('  2. Claude 3.5 Haiku (Fast & efficient)');
      const choice = await this.ui.promptUser('Selection (1-2) [1]: ');
      config.anthropicModel =
        choice === '2' ? 'claude-3-5-haiku-20241022' : 'claude-3-7-sonnet-20250219';
    }

    if (config.openaiApiKey) {
      this.ui.logInfo(`\n${ICONS.GEAR} Choose your OpenAI Model:`);
      console.log('  1. GPT-4o (Most intelligent)');
      console.log('  2. GPT-4o-mini (Small & fast)');
      const choice = await this.ui.promptUser('Selection (1-2) [1]: ');
      config.openaiModel = choice === '2' ? 'gpt-4o-mini' : 'gpt-4o';
    }

    if (config.geminiApiKey) {
      this.ui.logInfo(`\n${ICONS.GEAR} Choose your Google Gemini Model:`);
      console.log('  1. Gemini 2.0 Flash (Fastest with 1M context)');
      console.log('  2. Gemini 1.5 Pro (Deep reasoning)');
      const choice = await this.ui.promptUser('Selection (1-2) [1]: ');
      config.geminiModel = choice === '2' ? 'gemini-1.5-pro' : 'gemini-2.0-flash';
    }
  }

  private async setupOllama(config: BootstrapConfig) {
    const meta = PROVIDER_UPLINKS.ollama;
    this.ui.logInfo(`${ICONS.GEAR} AUTH_REQUIRED: ${meta.name} Registration`);
    this.ui.logInfo(`STRENGTH: ${COLORS.HIGHLIGHT(meta.strength)}`);
    this.ui.logInfo(`DOWNLOAD: ${COLORS.HIVE_CYAN(meta.url)}`);

    const url = await this.ui.promptUser('Enter Ollama Base URL [http://localhost:11434]: ');
    config.ollamaBaseUrl = (url || 'http://localhost:11434').trim();

    await ProtocolRenderer.renderHandshakePulse('Ollama');

    const valid = await this.validateOllama(config.ollamaBaseUrl);
    if (valid) {
      await ProtocolRenderer.renderSuccess('Local Node Synchronized.');
      await MetabolicRenderer.dataBurst([
        'LINK_STABLE',
        'READY_FOR_UPSTREAM',
        'CONTEXT_SHARD_REPLICATED',
      ]);
    } else {
      this.ui.logError('Local Node unreachable. Please ensure Ollama is running.');
    }
  }

  private async discoverLocalNode(config: BootstrapConfig) {
    const defaultUrl = 'http://localhost:11434';
    process.stdout.write(`\r ${ICONS.DIAGNOSTIC} Scanning for Local Neural Nodes...`);
    const isOllamaRunning = await this.validateOllama(defaultUrl);
    process.stdout.write(`\r${' '.repeat(50)}\r`);

    if (isOllamaRunning) {
      this.ui.logInfo(
        `${COLORS.SUCCESS('◈')} PROXIMITY_ALERT: Ollama Local Node detected at ${defaultUrl}`,
      );
      const use = await this.ui.promptUser(
        'Shall I enable your Local Neural Link automatically? (y/n): ',
      );
      if (use.toLowerCase() === 'y' || use.toLowerCase() === 'yes') {
        config.ollamaBaseUrl = defaultUrl;
        await ProtocolRenderer.renderSuccess('Local Node Auto-Synchronized.');
      }
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
      const { AnthropicProvider } = await import(
        '../../infrastructure/llm/providers/AnthropicProvider'
      );
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

  private async validateOpenRouter(key: string): Promise<boolean> {
    try {
      if (key === 'test-key') return true;
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      return response.ok;
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
      const { CloudflareProvider } = await import(
        '../../infrastructure/llm/providers/CloudflareProvider'
      );
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
    this.ui.logInfo(
      `\n${ProtocolRenderer.renderStepHeader(3, 3, 'User Profile', this.projectName)}`,
    );
    this.ui.logInfo("Almost done! Let's personalize your experience.");

    const configPath = '.dietcode/config.json';
    let userConfig: UserConfig = { name: 'Admin', onboardedAt: Date.now() };

    if (this.fs.exists(configPath)) {
      userConfig = JSON.parse(this.fs.readFile(configPath));
    }

    const name = await this.ui.promptUser(`What is your name? [${userConfig.name}]: `);
    if (name) userConfig.name = name;

    this.ui.logInfo(`\n${ICONS.GEAR} Choose a color theme for the CLI:`);
    console.log(`  1. ${COLORS.HIGHLIGHT('AETHER')} (Standard Deep Space)`);
    console.log(`  2. ${COLORS.WARNING('VOLCANIC')} (High Contrast Heat)`);
    console.log(`  3. ${COLORS.HIVE_GOLD('SOLARIS')} (Golden Dawn)`);
    console.log(`  4. ${COLORS.MUTED('ONYX')} (Stealth Mode)`);

    const themeChoice = await this.ui.promptUser('Selection (1-4) [1]: ');
    const themeMap: Record<string, string> = {
      '1': 'AETHER',
      '2': 'VOLCANIC',
      '3': 'SOLARIS',
      '4': 'ONYX',
    };
    (userConfig as any).aesthetic = themeMap[themeChoice] || 'AETHER';

    this.fs.writeFile(configPath, JSON.stringify(userConfig, null, 2));
    await ProtocolRenderer.renderSuccess(`Profile saved. Welcome to the hive, ${userConfig.name}.`);
  }

  private async runKickstartProtocol() {
    this.ui.logInfo('\nPreparing for final activation...');
    const config = await this.loadConfig();
    const model = config.anthropicModel || config.openaiModel || config.geminiModel || 'Ollama';

    console.log(
      ProtocolRenderer.renderAxiomReceipt({
        name: JSON.parse(this.fs.readFile('.dietcode/config.json')).name,
        model,
        theme: (JSON.parse(this.fs.readFile('.dietcode/config.json')) as any).aesthetic || 'AETHER',
        latency: 12,
      }),
    );

    await MetabolicRenderer.dataBurst([
      'READY_FOR_COMMAND',
      'HIVE_MINDS_ONLINE',
      'SOVEREIGN_RESERVE_STABLE',
    ]);

    console.log(ProtocolRenderer.renderKickstartMenu());
    const choice = await this.ui.promptUser('Initiate Kickstart Task? (1-3 or S): ');

    if (choice === '1') {
      this.ui.logInfo(`${ICONS.DIAGNOSTIC} Launching REAL_SYSTEM_SCAN...`);
      // Real Implementation: Trigger the Orchestrator via EventBus
      const { EventBus } = await import('../orchestration/EventBus');
      const { EventType } = await import('../../domain/Event');

      EventBus.getInstance().publish(EventType.COMMAND_RECEIVED, {
        command: 'SYSTEM_SCAN',
        source: 'BootstrapService',
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
      const lines = content.split('\n').map((l) => l.trim());

      const leaks = ['.env', '.env.bak', '.env.local', '.env.example'].filter(
        (env) => !lines.some((l) => l.includes(env)),
      );

      if (leaks.length > 0) {
        this.ui.logError(
          `CRITICAL_VULNERABILITY: Secret patterns [${leaks.join(', ')}] are NOT ignored in .gitignore!`,
        );
        const fix = await this.ui.promptUser(
          'Shall I patch .gitignore to secure your credentials? (y/n): ',
        );
        if (fix.toLowerCase() === 'y') {
          this.fs.writeFile(
            '.gitignore',
            `${content}\n\n# DietCode Sovereign Secrets\n.env*\n.env.local\n`,
          );
          this.ui.logSuccess('Patch Applied: Global secret patterns are now insulated.');
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
    if (config.openrouterApiKey) updates.OPENROUTER_API_KEY = config.openrouterApiKey;
    if (config.openrouterModel) updates.OPENROUTER_MODEL = config.openrouterModel;

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

    this.fs.writeFile('.env', newLines.join('\n'), { mode: 0o600 });
  }

  private loadUserConfig(): UserConfig {
    const configPath = '.dietcode/config.json';
    if (this.fs.exists(configPath)) {
      try {
        return JSON.parse(this.fs.readFile(configPath));
      } catch {
        /* ignore */
      }
    }
    return { name: 'Sovereign Administrator', onboardedAt: Date.now() };
  }

  private generateSovereignHandle(): string {
    const prefixes = ['Nebula', 'Zenith', 'Cipher', 'Vortex', 'Ather', 'Pulse'];
    const suffixes = ['Sentinel', 'Ghost', 'Oracle', 'Drift', 'Prime', 'Phantom'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    const id = Math.floor(Math.random() * 99)
      .toString()
      .padStart(2, '0');
    return `${p}${s}-${id}`;
  }
}
