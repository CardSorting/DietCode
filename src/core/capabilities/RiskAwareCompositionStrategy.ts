/**
 * [LAYER: CORE]
 * Principle: Implements risk-aware prompt composition strategy
 */

import type { PromptDefinition } from '../../domain/prompts/PromptCategory';
import { PromptCategory } from '../../domain/prompts/PromptCategory';
import type { PatternAwareStrategy } from '../../domain/prompts/PromptCompositionStrategy';
import {
  type RiskFactor,
  type RiskProfile,
  type SafetySafeguard,
  RiskTier,
  SafeguardFactory,
} from '../../domain/prompts/PromptRiskProfile';
import type { TemplateContext } from '../../domain/prompts/PromptTemplateEngine';

/**
 * Safe type for technology arrays from project context
 */
interface SafeTechnologyArray {
  technologies: string[];
}

/**
 * Strategy that wraps prompts with risk assessment and safety instructions based on dangerLevel
 */
export class RiskAwareCompositionStrategy implements PatternAwareStrategy {
  readonly name = 'risk-aware-composition';

  private patternTemplate: string;

  constructor() {
    this.patternTemplate = this.getRiskAssessmentPattern();
  }

  canApply(prompt: PromptDefinition, context: Partial<TemplateContext>): boolean {
    // Apply to prompts with explicit danger level or high-risk categories
    return !!(prompt.dangerLevel || this.isHighRiskCategory(prompt.category));
  }

  async apply(
    prompt: PromptDefinition,
    context: Partial<TemplateContext>,
  ): Promise<{ prompt: string; notes: string[] }> {
    const notes: string[] = [];

    // Assess risk level
    const riskProfile = this.assessRisk(prompt, context);

    // Select appropriate safeguards
    const safeguards = SafeguardFactory.getSafeguardsForTier(riskProfile.tier);
    const escalationStage = riskProfile.escalation_stage || 'before_tool';

    notes.push(`Risk tier: ${riskProfile.tier}`);
    notes.push(`Safeguards: ${safeguards.map((s: SafetySafeguard) => s.type).join(', ')}`);

    // Wrap prompt with risk assessment instructions
    const wrappedPrompt = this.wrapPromptWithRiskAssessment(
      prompt.content,
      riskProfile,
      safeguards,
      escalationStage,
      context,
    );

    return { prompt: wrappedPrompt, notes };
  }

  /**
   * Assess risk based on prompt metadata and context
   */
  private assessRisk(prompt: PromptDefinition, context: Partial<TemplateContext>): RiskProfile {
    const dangerLevel = prompt.dangerLevel || 'low';

    // Map danger levels to risk tiers
    const tierMap: Record<string, RiskTier> = {
      critical: RiskTier.HIGH,
      high: RiskTier.HIGH,
      medium: RiskTier.MEDIUM,
      low: RiskTier.LOW,
    };

    const tier = tierMap[dangerLevel] || RiskTier.MEDIUM;

    // Build assumptions list
    const assumptions = this.buildAssumptions(prompt, context);

    return {
      promptId: prompt.id,
      tier,
      safeguarding: SafeguardFactory.getSafeguardsForTier(tier),
      factors: this.identifyRiskFactors(prompt, context),
      assumptions,
      escalation_stage: tier === RiskTier.HIGH ? 'before_tool' : 'before_tool',
      recommended_tools: this.getRecommendedTools(tier),
    } as RiskProfile;
  }

  /**
   * Determine escalation strategy based on risk tier
   */
  private determineEscalationStrategy(): 'before_tool' | 'after_tool' | 'on_failure' {
    const strategies = ['before_tool', 'after_tool', 'on_failure'];
    return strategies[Math.floor(Math.random() * strategies.length)] as
      | 'before_tool'
      | 'after_tool'
      | 'on_failure';
  }

  /**
   * Generate assumptions from prompt context
   */
  private buildAssumptions(prompt: PromptDefinition, context: Partial<TemplateContext>): string[] {
    const assumptions: string[] = [];

    if (!context.project?.name) {
      assumptions.push('Project name not available');
    }

    if (!context.sessionId) {
      assumptions.push('Session ID not available');
    }

    if (
      prompt.category === PromptCategory.SYSTEM_CORE ||
      prompt.category === PromptCategory.SECURITY_PATTERNS
    ) {
      assumptions.push('Production system at risk if error occurs');
    }

    const project = context.project as SafeTechnologyArray | undefined;
    if (!project || !project.technologies || project.technologies.length === 0) {
      assumptions.push('Technology stack not detected');
    }

    return assumptions;
  }

  /**
   * Identify risk factors based on prompt properties
   */
  private identifyRiskFactors(
    prompt: PromptDefinition,
    context: Partial<TemplateContext>,
  ): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Build derived risk factors
    const isHighRisk = ['critical', 'high'].includes(prompt.dangerLevel || '');

    if (prompt.dangerLevel && isHighRisk) {
      factors.push({
        factor: 'sensitivity',
        value: prompt.dangerLevel,
        severity: 'high',
      });
    }

    const project = context.project as SafeTechnologyArray | undefined;
    if (project?.technologies) {
      factors.push({
        factor: 'scope',
        value: `${project.technologies.length} technologies`,
        severity: 'medium',
      });
    }

    if (
      prompt.category === PromptCategory.TOOL_PROTOCOLS ||
      prompt.category === PromptCategory.SECURITY_PATTERNS
    ) {
      factors.push({
        factor: 'system_impact',
        value: 'system-level changes',
        severity: 'high',
      });
    }

    if (prompt.content.includes('DELETE') || prompt.content.includes('DROP')) {
      factors.push({
        factor: 'reversibility',
        value: 'destructive operations',
        severity: 'high',
      });
    }

    return factors;
  }

  /**
   * Get recommended tools based on risk tier
   */
  private getRecommendedTools(tier: RiskTier): string[] | undefined {
    switch (tier) {
      case RiskTier.LOW:
        return [];
      case RiskTier.MEDIUM:
        return ['pre-commit-hooks', 'semantic-release', 'docker-compose'];
      case RiskTier.HIGH:
        return ['backups', 'sandbox-environments', 'rollback-plans', 'communication'];
      default:
        return [];
    }
  }

  /**
   * Get the risk assessment pattern template
   */
  private getRiskAssessmentPattern(): string {
    return `---
# Risk Assessment for This Prompt

RISK EVALUATION
---
Risk Level: {{risk.tier}}
Confidence: {{confidence}}

RISK FACTORS
---
{% for factor in risk.factors %}
- {{factor.factor}}: {{factor.value}} (severity: {{factor.severity}})
{% endfor %}

SAFEGUARDS REQUIRED
---
{% for safeguard in risk.safeguarding %}
- [{{safeguard.required ? 'X' : ' '}}] {{safeguard.description}} (type: {{safeguard.type}})
{% endfor %}

ASSUMPTIONS
---
{% for assumption in risk.assumptions %}
- {{assumption}}
{% endfor %}

ASSUMED TOOLS / COMMANDS
---
{% if risk.recommended_tools %}
{% for tool in risk.recommended_tools %}
- {{tool}}
{% endfor %}
{% else %}
None recommended
{% endif %}

VERIFICATION REQUIREMENTS
---
{{risk.assumptions.length > 2 ? 'Required: Run comprehensive tests, backup operations, and rollback preparation.' : 'Required: Run basic checks and documentation.'}}

OUTPUT REQUIREMENTS
---
1. Document risk tier and rationale
2. List all safeguards applied
3. Report verification results
4. Note any deviations from assumptions`;
  }

  /**
   * Wrap the prompt content with the risk assessment pattern
   */
  private wrapPromptWithRiskAssessment(
    promptContent: string,
    riskProfile: RiskProfile,
    safeguards: { type: string; description: string; required: boolean }[],
    escalationStage: string,
    context: Partial<TemplateContext>,
  ): string {
    // Template context for this specific wrapping
    const wrapperContext = {
      risk: {
        tier: riskProfile.tier,
        confidence: 0.85, // Default confidence, could be dynamic
        factors: riskProfile.factors,
        safeguarding: safeguards,
        assumptions: riskProfile.assumptions,
        recommended_tools: riskProfile.recommended_tools,
      },
      escalation_stage: escalationStage,
    };

    // Merge original prompt with assessment
    return `# Risk Assessment Precondition

${this.patternTemplate}

---

${promptContent}`;
  }

  /**
   * Determine if a category is high-risk by default
   */
  private isHighRiskCategory(category: string): boolean {
    const HIGH_RISK_CATEGORIES = [
      PromptCategory.TOOL_PROTOCOLS,
      PromptCategory.SECURITY_PATTERNS,
      PromptCategory.AGENT_ORCHESTRATION,
      PromptCategory.VERIFICATION_CHECKPOINTS,
      PromptCategory.UTILITY_OPERATIONS,
    ];

    return HIGH_RISK_CATEGORIES.includes(category as PromptCategory);
  }
}

// Helper function for tests to bypass safe enum guards
export function getEscalationStrategy(): 'minimal' | 'standard' | 'aggressive' {
  const strategies = ['minimal', 'standard', 'aggressive'];
  return strategies[Math.floor(Math.random() * strategies.length)] as
    | 'minimal'
    | 'standard'
    | 'aggressive';
}

export function getEscalationString(): string {
  const strategies = ['minimal', 'standard', 'aggressive'];
  const result = strategies[Math.floor(Math.random() * strategies.length)];
  return result || 'minimal';
}