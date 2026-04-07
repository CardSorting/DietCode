/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { BORDERS, COLORS, ICONS, SYMBOLS, WAVEFORMS, supportsUnicode } from '../design/Theme';
import { MetabolicRenderer } from './MetabolicRenderer';

/**
 * [LAYER: UI RENDERER]
 * Sovereign Hive Connectivity Protocol - Specialized Layouts.
 */
export const ProtocolRenderer = {
  /**
   * Renders a header for a specific onboarding step.
   */
  renderStepHeader(step: number, total: number, title: string, project?: string): string {
    const progress = step / total;
    const percent = Math.round(progress * 100);
    const filled = Math.floor(progress * 20);
    const spark = SYMBOLS.getSpark(progress);
    
    const bar = SYMBOLS.FULL_BLOCK.repeat(Math.max(0, filled - 1)) + 
                (filled > 0 ? spark : '') + 
                SYMBOLS.EMPTY_BLOCK.repeat(Math.max(0, 20 - filled));
                
    const projectHeader = project ? COLORS.AESTHETIC_PURPLE(` PROJECT_AETHER: ${project}`) : '';
    
    return [
      `\n${BORDERS.tl}${BORDERS.h.repeat(60)}${BORDERS.tr}`,
      `${BORDERS.v} [ STEP ${step}/${total} ] ${title.padEnd(46)} ${BORDERS.v}`,
      `${BORDERS.v}  PROGRESS: [${COLORS.HIVE_CYAN(bar)}] ${percent}%`.padEnd(62) + BORDERS.v,
      `${BORDERS.bl}${BORDERS.h.repeat(60)}${BORDERS.br}`,
      projectHeader,
    ].join('\n');
  },

  /**
   * Renders the current status of all providers.
   */
  renderConnectivityStatus(providers: { name: string, status: 'CONNECTED' | 'PENDING' | 'MISSING' | 'ERROR' }[]): string {
    const lines = providers.map(p => {
      let statusText = '';
      if (p.status === 'CONNECTED') statusText = COLORS.SUCCESS('CONNECTED');
      else if (p.status === 'PENDING') statusText = COLORS.WARNING('PENDING');
      else if (p.status === 'MISSING') statusText = COLORS.MUTED('MISSING');
      else statusText = COLORS.ERROR('ERROR');
      
      return ` ${ICONS.GEAR} ${p.name.padEnd(12)} : ${statusText}`;
    });

    const box = [
      COLORS.PRIMARY(`${BORDERS.tl}${BORDERS.h} HIVE CONNECTIVITY STATUS ${BORDERS.h.repeat(15)}${BORDERS.tr}`),
      ...lines.map(l => `${COLORS.PRIMARY(BORDERS.v)} ${l.padEnd(38)} ${COLORS.PRIMARY(BORDERS.v)}`),
      COLORS.PRIMARY(`${BORDERS.bl}${BORDERS.h.repeat(40)}${BORDERS.br}`)
    ].join('\n');

    return `\n${box}\n`;
  },

  /**
   * Renders a validation "Pulse" effect.
   */
  async renderValidationPulse(message: string): Promise<void> {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    for (let i = 0; i < 20; i++) {
        process.stdout.write(`\r ${COLORS.HIVE_GOLD(frames[i % frames.length])} ${message}...`);
        await new Promise(r => setTimeout(r, 80));
    }
    process.stdout.write(`\r${' '.repeat(50)}\r`);
  },

  /**
   * Renders a "Success" confirmation with matrix reveal.
   */
  async renderSuccess(message: string): Promise<void> {
    console.log('\n');
    await MetabolicRenderer.matrixReveal(message, COLORS.SUCCESS);
    console.log(` ${COLORS.SUCCESS(ICONS.CHECK)} ${COLORS.HIGHLIGHT('VERIFIED')}`);
  },

  /**
   * Renders a Swarm Readiness Report (Agent Handshake Grid).
   */
  renderSwarmReadiness(agents: { id: string, status: 'LOCKED' | 'PENDING' | 'OFFLINE' }[]): string {
    const grid = agents.map(a => {
        let status = '';
        if (a.status === 'LOCKED') status = COLORS.SUCCESS('LOCKED');
        else if (a.status === 'PENDING') status = COLORS.WARNING('PENDING');
        else status = COLORS.ERROR('OFFLINE');
        
        return `${COLORS.PRIMARY('◈')} ${a.id.padEnd(15)} : ${status}`;
    });

    return [
      '\n',
      COLORS.AESTHETIC_PURPLE(' [ SWARM_HANDSHAKE_REGISTRY ]'),
      ...grid.map(g => `  ${g}`),
      '\n'
    ].join('\n');
  },

  /**
   * Renders a Neural Status resonance dashboard.
   */
  renderNeuralStatus(metrics: { resonance: number, stability: number, latency: number }): string {
    const resBar = this.renderMiniBar(metrics.resonance);
    const stabBar = this.renderMiniBar(metrics.stability);
    
    return [
      COLORS.AESTHETIC_PINK(' [ NEURAL_DASHBOARD ]'),
      `  RESONANCE : ${resBar} ${metrics.resonance}%`,
      `  STABILITY : ${stabBar} ${metrics.stability}%`,
      `  LATENCY   : ${COLORS.HIVE_GOLD(`${metrics.latency}ms`)}`,
      '\n'
    ].join('\n');
  },

  /**
   * Renders a Neural Link Quality assessment based on latency.
   */
  renderNeuralLinkQuality(latency: number): string {
    let rating = COLORS.SUCCESS('SOVEREIGN');
    if (latency > 500) rating = COLORS.ERROR('DRIFTING');
    else if (latency > 250) rating = COLORS.WARNING('ACTIVE');
    else if (latency > 100) rating = COLORS.PRIMARY('PRIME');
    
    return [
      `  NEURAL_LINK_QUALITY : ${rating} (${latency}ms)`,
      `  SIGNAL_STRENGTH     : ${COLORS.PRIMARY(WAVEFORMS.HEARTBEAT)}`,
      '\n'
    ].join('\n');
  },

  /**
   * Renders a Theme Selection preview.
   */
  renderThemeSelection(profiles: string[], active: string): string {
    const list = profiles.map(p => {
        const isSelected = p === active;
        const indicator = isSelected ? COLORS.SUCCESS('▶') : ' ';
        const name = isSelected ? COLORS.HIGHLIGHT(p) : COLORS.MUTED(p);
        return `  ${indicator} ${name}`;
    });

    return [
      '\n',
      COLORS.AESTHETIC_PURPLE(' [ SUB_HIVE_AESTHETIC_PROFILES ]'),
      ...list,
      '\n'
    ].join('\n');
  },

  /**
   * Renders the Kickstart Protocol Action Menu.
   */
  renderKickstartMenu(): string {
    return [
      '\n',
      COLORS.HIVE_CYAN(' [ KICKSTART_PROTOCOL_ACTIVE ]'),
      `  1. ${COLORS.HIGHLIGHT('SYSTEM_SCAN')}   : Full repository analysis`,
      `  2. ${COLORS.HIGHLIGHT('HIVE_AUDIT')}    : Security and integrity check`,
      `  3. ${COLORS.HIGHLIGHT('NEURAL_LINK')}   : Direct sovereign dialogue`,
      `  S. ${COLORS.MUTED('EXIT_PROTOCOL')}  : Return to shell`,
      '\n'
    ].join('\n');
  },

  /**
   * Renders the Final Axiom Synchronization Receipt.
   */
  renderAxiomReceipt(config: { name: string, model: string, theme: string, latency: number }): string {
    const signature = `SIG_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    return [
      '\n',
      COLORS.PRIMARY(`${BORDERS.tl}${BORDERS.h.repeat(42)}${BORDERS.tr}`),
      `${COLORS.PRIMARY(BORDERS.v)} ${COLORS.HIGHLIGHT('NEURAL_SYNCHRONIZATION_RECEIPT')}         ${COLORS.PRIMARY(BORDERS.v)}`,
      `${COLORS.PRIMARY(BORDERS.v)} ${COLORS.MUTED(BORDERS.h.repeat(40))} ${COLORS.PRIMARY(BORDERS.v)}`,
      `${COLORS.PRIMARY(BORDERS.v)}  SOVEREIGN  : ${config.name.padEnd(25)} ${COLORS.PRIMARY(BORDERS.v)}`,
      `${COLORS.PRIMARY(BORDERS.v)}  PROFILE    : ${config.model.padEnd(25)} ${COLORS.PRIMARY(BORDERS.v)}`,
      `${COLORS.PRIMARY(BORDERS.v)}  AESTHETIC  : ${config.theme.padEnd(25)} ${COLORS.PRIMARY(BORDERS.v)}`,
      `${COLORS.PRIMARY(BORDERS.v)}  LATENCY    : ${COLORS.HIVE_GOLD(`${config.latency}ms`).padEnd(34)} ${COLORS.PRIMARY(BORDERS.v)}`,
      `${COLORS.PRIMARY(BORDERS.v)}  SIGNATURE  : ${COLORS.MUTED(signature).padEnd(34)} ${COLORS.PRIMARY(BORDERS.v)}`,
      COLORS.PRIMARY(`${BORDERS.bl}${BORDERS.h.repeat(42)}${BORDERS.br}`),
      '\n'
    ].join('\n');
  },

  /**
   * Renders an Ambient Status line that "breathes".
   */
  renderAmbientStatus(text: string): string {
    return MetabolicRenderer.ambientDrift(` [ STATUS: ${text} ] `, Date.now() / 1000);
  },

  /**
   * Renders a procedurally generated Sovereign Handle.
   */
  async renderSovereignHandle(handle: string): Promise<void> {
    console.log(`\n ${COLORS.PRIMARY('◈')} ${COLORS.MUTED('ASSIGNING_IDENTITY_TOKEN...')}`);
    await MetabolicRenderer.decrypt(` [ NEURAL_ID: ${handle} ] `, 50);
    console.log(`\n ${COLORS.PRIMARY(ICONS.CHECK)} ${COLORS.HIGHLIGHT('IDENTITY_SYNCHRONIZED')}\n`);
  },

  /**
   * Renders a live Waveform Pulse for link monitoring.
   */
  async renderWaveformPulse(intensity: number): Promise<void> {
    const wave = MetabolicRenderer.renderWaveform(intensity);
    process.stdout.write(`\r ${COLORS.PRIMARY('SIGNAL:')} ${wave} [ ${COLORS.HIVE_GOLD(`${Math.floor(intensity * 100)}%`)} ] `);
  },

  renderMiniBar(value: number): string {
    const progress = value / 100;
    const filled = Math.floor(progress * 10);
    const spark = SYMBOLS.getSpark(progress);
    
    const bar = SYMBOLS.FULL_BLOCK.repeat(Math.max(0, filled - 1)) + 
                (filled > 0 ? spark : '') + 
                SYMBOLS.EMPTY_BLOCK.repeat(Math.max(0, 10 - filled));
                
    return `[${COLORS.PRIMARY(bar)}]`;
  },

  /**
   * Renders a high-fidelity handshake pulse.
   */
  async renderHandshakePulse(provider: string): Promise<void> {
    console.log(`\n ${COLORS.PRIMARY('◈')} ${COLORS.HIGHLIGHT(`INITIATING_${provider.toUpperCase()}_HANDSHAKE`)}`);
    const frames = WAVEFORMS.HEARTBEAT.split('');
    for (let i = 0; i < 15; i++) {
        const frame = frames[i % frames.length];
        const intensity = Math.sin(i * 0.5) * 0.5 + 0.5;
        process.stdout.write(`\r  ${COLORS.MUTED('[')} ${COLORS.lerpHeat(frame ?? '', intensity)} ${COLORS.MUTED(']')} SYNCHRONIZING... ${Math.floor(intensity * 100)}%`);
        await new Promise(r => setTimeout(r, 60));
    }
    process.stdout.write(`\r${' '.repeat(60)}\r`);
  }
};
