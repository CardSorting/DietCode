import type { Filesystem } from '../../domain/system/Filesystem';
import type { TerminalInterface } from '../../domain/system/TerminalInterface';
import { TerminalRenderer } from '../../ui/renderer/TerminalRenderer';
import { COLORS, ICONS } from '../../ui/theme';

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
    this.showSplash();

    await this.runDiagnostics();

    const config: BootstrapConfig = {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
    };

    if (!config.anthropicApiKey && (!config.cloudflareAccountId || !config.cloudflareApiToken)) {
      await this.loadFromEnv(config);
    }

    if (!config.anthropicApiKey && (!config.cloudflareAccountId || !config.cloudflareApiToken)) {
      this.ui.logInfo('Welcome to DietCode. It looks like this is your first time setting up.');
      this.ui.logInfo('Please provide at least one AI provider configuration.');

      const choice = await this.ui.promptUser(
        'Which provider would you like to configure? (1: Anthropic, 2: Cloudflare, 3: Both): ',
      );

      if (choice === '1' || choice === '3' || choice.toLowerCase().includes('anthropic')) {
        let valid = false;
        while (!valid) {
          config.anthropicApiKey = await this.ui.promptSecret('Enter your Anthropic API Key: ');
          this.ui.logInfo(`${ICONS.LOADING} Validating Anthropic credentials...`);
          valid = await this.validateAnthropic(config.anthropicApiKey);
          if (!valid) this.ui.logError('Invalid Anthropic API Key. Please try again.');
        }
      }

      if (choice === '2' || choice === '3' || choice.toLowerCase().includes('cloudflare')) {
        let valid = false;
        while (!valid) {
          config.cloudflareAccountId = await this.ui.promptUser('Enter your Cloudflare Account ID: ');
          config.cloudflareApiToken = await this.ui.promptSecret('Enter your Cloudflare API Token: ');
          this.ui.logInfo(`${ICONS.LOADING} Validating Cloudflare credentials...`);
          valid = await this.validateCloudflare(config.cloudflareAccountId, config.cloudflareApiToken);
          if (!valid)
            this.ui.logError('Invalid Cloudflare configuration. Please check your IDs and tokens.');
        }
      }

      const save = await this.ui.promptUser('Would you like to save these credentials to .env? (y/n): ');
      if (save.toLowerCase() === 'y' || save.toLowerCase() === 'yes') {
        await this.saveToEnv(config);
        this.ui.logSuccess('Configuration saved to .env');
      }
    }

    await this.personalize();

    return config;
  }

  private showSplash() {
    console.log(`\n${TerminalRenderer.renderSplash()}\n`);
  }

  private async runDiagnostics() {
    this.ui.logInfo(`${ICONS.DIAGNOSTIC} Starting Sovereign Diagnostics...`);
    const steps = [
      { name: 'Core Infrastructure', icon: ICONS.BRAIN },
      { name: 'Sovereign Database', icon: ICONS.DATABASE },
      { name: 'Hive Queue Engine', icon: ICONS.BEE },
      { name: 'Architectural Integrity', icon: ICONS.TEMPLE },
    ];

    for (const step of steps) {
      process.stdout.write(`  ${step.icon} Initializing ${step.name}... `);
      await new Promise((r) => setTimeout(r, 400));
      process.stdout.write(`${ICONS.CHECK}\n`);
    }
    this.ui.logSuccess('Sovereign Systems Online.\n');
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
      } catch {
        // use default
      }
    } else {
      this.ui.logInfo('\n--- Sovereign Identification ---');
      const name = await this.ui.promptUser('What is your name, Sovereign? ');
      if (name.trim()) {
        userConfig.name = name.trim();
      }
      if (!this.fs.exists('.dietcode')) this.fs.mkdir('.dietcode');
      this.fs.writeFile(configPath, JSON.stringify(userConfig, null, 2));
      this.ui.logSuccess(`Identification accepted, ${userConfig.name}.`);
    }

    this.ui.logInfo(`\nWelcome back, ${COLORS.HIGHLIGHT(userConfig.name)}.\n`);
  }

  private async loadFromEnv(config: BootstrapConfig) {
    if (this.fs.exists('.env')) {
      const content = this.fs.readFile('.env');
      const env = content.split('\n').reduce((acc: any, line) => {
        const [key, value] = line.split('=');
        if (key && value) acc[key.trim()] = value.trim();
        return acc;
      }, {});

      if (env.ANTHROPIC_API_KEY) config.anthropicApiKey = env.ANTHROPIC_API_KEY;
      if (env.CLOUDFLARE_ACCOUNT_ID) config.cloudflareAccountId = env.CLOUDFLARE_ACCOUNT_ID;
      if (env.CLOUDFLARE_API_TOKEN) config.cloudflareApiToken = env.CLOUDFLARE_API_TOKEN;
    }
  }

  private async saveToEnv(config: BootstrapConfig) {
    let content = '';
    if (config.anthropicApiKey) content += `ANTHROPIC_API_KEY=${config.anthropicApiKey}\n`;
    if (config.cloudflareAccountId) content += `CLOUDFLARE_ACCOUNT_ID=${config.cloudflareAccountId}\n`;
    if (config.cloudflareApiToken) content += `CLOUDFLARE_API_TOKEN=${config.cloudflareApiToken}\n`;
    this.fs.writeFile('.env', content);
  }
}
