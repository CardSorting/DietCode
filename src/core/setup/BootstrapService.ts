import type { Filesystem } from '../../domain/system/Filesystem';
import type { TerminalInterface } from '../../domain/system/TerminalInterface';

export interface BootstrapConfig {
  anthropicApiKey?: string;
  cloudflareAccountId?: string;
  cloudflareApiToken?: string;
}

export class BootstrapService {
  constructor(
    private fs: Filesystem,
    private ui: TerminalInterface,
  ) {}

  async bootstrap(): Promise<BootstrapConfig> {
    this.ui.clear();
    this.showSplash();

    const config: BootstrapConfig = {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
    };

    // If we have some keys, but not all, or none at all, let's check .env
    if (!config.anthropicApiKey && (!config.cloudflareAccountId || !config.cloudflareApiToken)) {
      await this.loadFromEnv(config);
    }

    // If still missing, start interactive onboarding
    if (!config.anthropicApiKey && (!config.cloudflareAccountId || !config.cloudflareApiToken)) {
      this.ui.logInfo('Welcome to DietCode. It looks like this is your first time setting up.');
      this.ui.logInfo('Please provide at least one AI provider configuration.');

      const choice = await this.ui.promptUser(
        'Which provider would you like to configure? (1: Anthropic, 2: Cloudflare, 3: Both): ',
      );

      if (choice === '1' || choice === '3' || choice.toLowerCase().includes('anthropic')) {
        config.anthropicApiKey = await this.ui.promptSecret('Enter your Anthropic API Key: ');
      }

      if (choice === '2' || choice === '3' || choice.toLowerCase().includes('cloudflare')) {
        config.cloudflareAccountId = await this.ui.promptUser('Enter your Cloudflare Account ID: ');
        config.cloudflareApiToken = await this.ui.promptSecret('Enter your Cloudflare API Token: ');
      }

      if (config.anthropicApiKey || (config.cloudflareAccountId && config.cloudflareApiToken)) {
        const save = await this.ui.promptUser('Would you like to save these credentials to .env? (y/n): ');
        if (save.toLowerCase() === 'y' || save.toLowerCase() === 'yes') {
          await this.saveToEnv(config);
          this.ui.logSuccess('Configuration saved to .env');
        }
      } else {
        this.ui.logError('No valid configuration provided. DietCode cannot start.');
        process.exit(1);
      }
    }

    return config;
  }

  private async loadFromEnv(config: BootstrapConfig) {
    if (this.fs.exists('.env')) {
      const content = this.fs.readFile('.env');
      const lines = content.split('\n');
      for (const line of lines) {
        const [key, value] = line.split('=').map((s) => s.trim());
        if (key === 'ANTHROPIC_API_KEY' && !config.anthropicApiKey) config.anthropicApiKey = value;
        if (key === 'CLOUDFLARE_ACCOUNT_ID' && !config.cloudflareAccountId)
          config.cloudflareAccountId = value;
        if (key === 'CLOUDFLARE_API_TOKEN' && !config.cloudflareApiToken)
          config.cloudflareApiToken = value;
      }
    }
  }

  private async saveToEnv(config: BootstrapConfig) {
    let content = '';
    if (this.fs.exists('.env')) {
      content = this.fs.readFile('.env');
      if (!content.endsWith('\n')) content += '\n';
    }

    if (config.anthropicApiKey && !content.includes('ANTHROPIC_API_KEY')) {
      content += `ANTHROPIC_API_KEY=${config.anthropicApiKey}\n`;
    }
    if (config.cloudflareAccountId && !content.includes('CLOUDFLARE_ACCOUNT_ID')) {
      content += `CLOUDFLARE_ACCOUNT_ID=${config.cloudflareAccountId}\n`;
    }
    if (config.cloudflareApiToken && !content.includes('CLOUDFLARE_API_TOKEN')) {
      content += `CLOUDFLARE_API_TOKEN=${config.cloudflareApiToken}\n`;
    }

    this.fs.writeFile('.env', content);
  }

  private showSplash() {
    const splash = `
    ██████╗ ██╗███████╗████████╗ ██████╗  ██████╗ ██████╗ ███████╗
    ██╔══██╗██║██╔════╝╚══██╔══╝██╔════╝ ██╔═══██╗██╔══██╗██╔════╝
    ██║  ██║██║█████╗     ██║   ██║      ██║   ██║██║  ██║█████╗  
    ██║  ██║██║██╔══╝     ██║   ██║      ██║   ██║██║  ██║██╔══╝  
    ██████╔╝██║███████╗   ██║   ╚██████╗ ╚██████╔╝██████╔╝███████╗
    ╚═════╝ ╚═╝╚══════╝   ╚═╝    ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝
    
           [ SOVEREIGN HIVE ARCHITECTURE ] - v2.0.0
    `;
    console.log(splash);
  }
}
