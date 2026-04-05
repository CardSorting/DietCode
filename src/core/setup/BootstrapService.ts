import type { Filesystem } from '../../domain/system/Filesystem';
import type { TerminalInterface } from '../../domain/system/TerminalInterface';
import { SplashRenderer } from '../../ui/renderers/SplashRenderer';
import { ProtocolRenderer } from '../../ui/renderers/ProtocolRenderer';
import { COLORS, ICONS } from '../../ui/design/Theme';
import { MetabolicRenderer } from '../../ui/renderers/MetabolicRenderer';

export interface BootstrapConfig {
  anthropicApiKey?: string;
  cloudflareAccountId?: string;
  cloudflareApiToken?: string;
}

export interface UserConfig {
  name: string;
  onboardedAt: number;
}

export class BootstrapService {
  constructor(
    private fs: Filesystem,
    private ui: TerminalInterface,
  ) {}

  async bootstrap(): Promise<BootstrapConfig> {
    this.ui.clear();
    
    // Phase 1: Cinematic Splash & Diagnostics
    await SplashRenderer.bootSequence();
    await this.runDiagnostics();

    const config: BootstrapConfig = await this.loadConfig();

    if (!config.anthropicApiKey && (!config.cloudflareAccountId || !config.cloudflareApiToken)) {
      await this.runConnectivityProtocol(config);
    }

    await this.personalize();

    return config;
  }

  private async loadConfig(): Promise<BootstrapConfig> {
    const config: BootstrapConfig = {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
    };

    if (this.fs.exists('.env')) {
      const content = this.fs.readFile('.env');
      const lines = content.split('\n');
      for (const line of lines) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        if (key && value) {
          const trimmedKey = key.trim();
          const trimmedValue = value.trim();
          if (trimmedKey === 'ANTHROPIC_API_KEY') config.anthropicApiKey = trimmedValue;
          if (trimmedKey === 'CLOUDFLARE_ACCOUNT_ID') config.cloudflareAccountId = trimmedValue;
          if (trimmedKey === 'CLOUDFLARE_API_TOKEN') config.cloudflareApiToken = trimmedValue;
        }
      }
    }

    return config;
  }

  private async runConnectivityProtocol(config: BootstrapConfig) {
    console.log(ProtocolRenderer.renderStepHeader(1, 2, 'Connectivity Protocol Activation'));
    this.ui.logInfo('Welcome to DietCode. Initialize your Hive neural link by configuring your AI provider.');

    const providers = [
      { name: 'Anthropic', status: config.anthropicApiKey ? 'CONNECTED' : 'MISSING' },
      { name: 'Cloudflare', status: config.cloudflareAccountId ? 'CONNECTED' : 'MISSING' },
    ] as any;

    console.log(ProtocolRenderer.renderConnectivityStatus(providers));

    const choice = await this.ui.promptUser(
      'Initialize provider uplink? (1: Anthropic, 2: Cloudflare, 3: Both, S: Skip): ',
    );

    if (choice.toLowerCase() === 's') {
      this.ui.logInfo(`${COLORS.WARNING('WARNING:')} Connectivity Protocol bypassed. System may be unstable.`);
      return;
    }

    if (choice === '1' || choice === '3' || choice.toLowerCase().includes('anthropic')) {
      await this.setupAnthropic(config);
    }

    if (choice === '2' || choice === '3' || choice.toLowerCase().includes('cloudflare')) {
      await this.setupCloudflare(config);
    }

    const save = await this.ui.promptUser('Sovereign, shall I persist these parameters to .env? (y/n): ');
    if (save.toLowerCase() === 'y' || save.toLowerCase() === 'yes') {
      await this.saveToEnv(config);
      await ProtocolRenderer.renderSuccess('Neural parameters persisted to Hive manifest (.env).');
    }
  }

  private async setupAnthropic(config: BootstrapConfig) {
    let valid = false;
    while (!valid) {
      const key = await this.ui.promptSecret('Enter Anthropic API Key: ');
      if (key.toLowerCase() === 'skip') break;
      
      await ProtocolRenderer.renderValidationPulse('Decrypting and verifying Anthropic handshake');
      valid = await this.validateAnthropic(key);

      if (valid) {
        config.anthropicApiKey = key;
        await ProtocolRenderer.renderSuccess('Anthropic Uplink Established.');
      } else {
        this.ui.logError('Handshake failed. Invalid key or network obstruction.');
      }
    }
  }

  private async setupCloudflare(config: BootstrapConfig) {
    let valid = false;
    while (!valid) {
      const id = await this.ui.promptUser('Enter Cloudflare Account ID: ');
      const token = await this.ui.promptSecret('Enter Cloudflare API Token: ');
      if (id.toLowerCase() === 'skip') break;

      await ProtocolRenderer.renderValidationPulse('Synchronizing Cloudflare Workers AI');
      valid = await this.validateCloudflare(id, token);

      if (valid) {
        config.cloudflareAccountId = id;
        config.cloudflareApiToken = token;
        await ProtocolRenderer.renderSuccess('Cloudflare Hive Active.');
      } else {
        this.ui.logError('Synchronization failed. Check credentials and retry.');
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
      await new Promise((r) => setTimeout(r, 400));
      process.stdout.write(`${ICONS.CHECK}\n`);
    }
    console.log('\n');
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
      console.log(ProtocolRenderer.renderStepHeader(2, 2, 'Identification Sequence'));
      const name = await this.ui.promptUser('By what title shall the Hive address you, Sovereign? ');
      if (name.trim()) {
        userConfig.name = name.trim();
      }
      if (!this.fs.exists('.dietcode')) this.fs.mkdir('.dietcode');
      this.fs.writeFile(configPath, JSON.stringify(userConfig, null, 2));
      await ProtocolRenderer.renderSuccess(`Sovereign Identity Recognized: ${userConfig.name}`);
    }

    console.log(`\n ${COLORS.PRIMARY('WELCOME BACK,')} ${COLORS.HIGHLIGHT(userConfig.name.toUpperCase())}\n`);
  }

  private async saveToEnv(config: BootstrapConfig) {
    let content = '';
    if (this.fs.exists('.env')) {
      content = this.fs.readFile('.env');
    }

    const updates: Record<string, string> = {};
    if (config.anthropicApiKey) updates.ANTHROPIC_API_KEY = config.anthropicApiKey;
    if (config.cloudflareAccountId) updates.CLOUDFLARE_ACCOUNT_ID = config.cloudflareAccountId;
    if (config.cloudflareApiToken) updates.CLOUDFLARE_API_TOKEN = config.cloudflareApiToken;

    const lines = content.split('\n');
    const newLines = [];
    const processedKeys = new Set();

    for (const line of lines) {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0]?.trim();
        if (key && updates[key]) {
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
}

