# Prompt Enhancement Documentation: Integration with claude-code-prompts

## Overview

This documentation describes the enhanced prompt engine that integrates with collections from the [claude-code-prompts](https://github.com/anthropics/claude-code-prompts) repository. The enhancement brings advanced scaffolding, template parameterization, risk-aware composition, and context integration to the DietCode AI Tooling Harness.

## Architecture Changes

The enhancements follow the Joy-Zoning architecture:

### Domain Layer (src/domain/prompts/)
- **PromptTemplateEngine**: Custom template engine with variable replacement, conditional blocks, and loops
- **PromptRiskProfile**: Risk assessment models and safeguard definitions
- **PromptCompositionStrategy**: Strategy pattern for prompt composition enhancements
- **PromptVersion & PromptAnalytics**: Version control and analytics for prompts

### Core Layer (src/core/capabilities/)
- **ContextProviderEngine**: Loads and combines session context, memory items, and project information
- **RiskAwareCompositionStrategy**: Wraps prompts with risk assessment and safety instructions

### Infrastructure Layer (src/infrastructure/)
- **PromptRegistryAdapter**: Enhanced rendering with context providers and risk strategies
- **PromptLoader**: Extended with template compilation and version tracking

## Key Features

### 1. Template Parameterization

Prompts now support dynamic content injection using a custom template language:

```yaml
---
name: Memory Consolidation
category: MEMORY_CYCLES
dangerLevel: medium
---

# Memory Analysis

Review **{{memory.items | length}}** items from project: **{{project.name}}**

**Technologies:**
{% for tech in project.technologies %}
- {{tech}}
{% endfor %}
```

**Features:**
- Variable interpolation: `{{variable}}`
- Filters: `{{value | round | uppercase}}`
- Loops: `{% for item in collection %}...{% endfor %}`
- Conditionals: `{{#if condition}}...{% endif %}`

### 2. Context Provider

The `ContextProviderEngine` automatically enriches prompts with relevant context:

```typescript
const enhancedContext = await contextProvider.prepareContext(prompt, sessionContext);
```

What gets loaded:
- **Project Context**: Technology stack, dependencies, configurations
- **Session Memory**: Recent items relevant to the session
- **User Preferences**: Saved user settings
- **Project Files**: Relevant files from file system

### 3. Risk-Aware Composition

The `RiskAwareCompositionStrategy` wraps high-risk prompts with safety instructions:

```markdown
---
# Risk Assessment for This Prompt

RISK EVALUATION
---
Risk Level: high
Confidence: 0.85

RISK FACTORS
---
- sensitivity: medium (severity: medium)
- system_impact: system-level changes (severity: high)
- reversibility: destructive operations (severity: high)

SAFEGUARDS REQUIRED
---
- [ ] Create backup before proceeding (type: BACKUP)
- [ ] Test in isolation environment (type: SANDBOX)
- [ ] Prepare rollback script (type: SANDBOX)

VERIFICATION REQUIREMENTS
---
Required: Run comprehensive tests, backup operations, and rollback preparation.
```

**Risk Tiers:**
- **LOW**: Standard safety checks
- **MEDIUM**: Test thoroughly, prepare rollback
- **HIGH**: Explicit approval, backup strategy, sandbox testing

### 4. Multi-Source Prompt Integration

The registry now loads prompts from multiple sources with proper conflict resolution:

```
1. Project Overrides (.claude-code-prompts/)
2. User Repository Overrides (~/.claude-code-prompts/)
3. Embedded Standard Collection (DietCode repo)
```

Conflict resolution:
- **Priority**: User > Project > Embedded
- **Strategy**: `OVERRIDE` if higher priority, else `KEEP_EXISTING`
- **Detection**: Automatic version and timestamp comparison

## Usage

### Basic Prompt Rendering

```typescript
const result = await adapter.renderPrompt('prompt-id', {
  sessionId: 'session-123',
  timestamp: new Date().toISOString(),
  project: {
    name: 'My Project',
    path: '/path/to/project',
    technologies: ['TypeScript', 'Next.js']
  },
  user: {
    preferences: {
      session_timeout: 30
    }
  }
});

console.log(result.rendered);
console.log(result.metadata);
```

### Risk Assessment

```typescript
const riskAssessment = await adapter.assessPromptRisk('deployment.prompt');

console.log('Risk Profile:', riskAssessment.profile.tier);
console.log('Recommendations:', riskAssessment.recommendations);
```

### Accessing Generated Strategies

```typescript
const metadata = result.metadata;

console.log('Enabled Strategies:', metadata.enabledStrategies);
// ['context-provider', 'risk-aware-composition']

console.log('Strategy Notes:', metadata.strategyNotes);
// ['Risk tier: high', 'Safeguards: backup, sandbox, rollback']
```

## Integration with claude-code-prompts Collections

### Strategy 1: Risk Assessment Patterns

Claude-code-prompts provides sophisticated risk assessment frameworks. Our integration:

1. **Detects high-risk prompts** based on category and dangerLevel metadata
2. **Analyzes prompt context** to generate predictive risk factors
3. **Applies appropriate safeguards** based on risk tier
4. **Wraps prompts** with safety instructions

Benefits:
- Automatic safety checks for destructive operations
- Context-aware risk assessment (not template-level only)
- Actionable recommendations based on actual risk

### Strategy 2: Advanced Scaffolding Type Names

The enhanced system supports multiple scaffolding styles:

- `FIX_PROBLEMS` (System Core)
- `REFINE_REACT` → `FIX_REACT` (System Core)
- `REFACTOR_DATABASE` → `IMPROVE_DATABASE` (System Core)
- `FIX_AUDIT_SAFETY` → `FIX_SAFETY_AUDIT` (System Core)

Benefits:
- More explicit prompt meanings
- Better alignment with technical intent
- Improved semantic clarity

### Strategy 3: Prompt Scaffolding Strikes Back

The enhanced system provides:
- **Pre-flight Safety Checks**: Validation before tool execution
- **Audit Trail**: Compliance tracking for every interaction
- **Comprehensive Scoping**: Precise functional boundaries

Benefits:
- Prevents unintended changes
- Maintains operation boundaries
- Ensures code quality

### Strategy 4: Memory Alignment

Context Provider integrates with:
- **Session Memory**: Recent decisions and reasoning
- **Project Knowledge**: Technology stack and patterns
- **User Preferences**: Custom settings

Benefits:
- Personalized AI behavior
- Contextual relevance
- Consistency across sessions

## Testing

### Integration Tests

The enhanced system includes comprehensive integration tests in `test/integration/prompt-enhanced-integration.test.ts`:

```bash
npm test test/integration/prompt-enhanced-integration.test.ts
```

### Test Coverage

- Context provider integration
- Risk-aware composition
- Template rendering with variables
- Strategy application
- Caching behavior
- Error handling
- Performance metrics
- Backward compatibility

## Performance Considerations

### Context Caching

The ContextProviderEngine caches prepared contexts based on:
- Prompt identity (ID + session context hash)
- Cache size limit (100 entries)
- Automatic cleanup (entries older than 1 hour)

**Benefit**: Significant performance improvement for repeated prompt renders

### Rendering Metrics

All renders return detailed metadata:
- `renderTimeMs`: Rendering execution time
- `variableCount`: Template variable count
- `templateSizeKb`: Final rendered size
- `enabledStrategies`: Applied enhancement strategies
- `strategyNotes`: Notes from strategy execution
- `memoryItemsLoaded`: Number of items merged into context

## Migration Guide

### For Existing Code

No breaking changes to the basic API. Existing calls continue to work:

```typescript
// Old code still works
const result = await adapter.renderPrompt('prompt-id', {
  sessionId: 'session-123',
  timestamp: new Date().toISOString(),
  project: { name: 'Project', path: '/path', technologies: [] }
});
```

### New Features Available

To use new features:

1. **Enable Rich Context:**
```typescript
await adapter.acquireAll(systemContext);
const enhancedContext = await contextProvider.prepareContext(prompt, sessionContext);
```

2. **Request Risk Assessment:**
```typescript
const assessment = await adapter.assessPromptRisk(promptId);
if (assessment.profile.tier === 'HIGH') {
  // Show approval modal, prepare rollback plans
}
```

3. **Check Strategy Usage:**
```typescript
if (result.metadata.strategyNotes.some(note => note.includes('Risk'))) {
  // Handle risk-aware prompt
}
```

## Best Practices

### 1. Template Design

- Keep variables meaningful and descriptive
- Use hierarchical context (```{{user.preferences.theme}}```)
- Provide default values in templates

### 2. Risk Management

- Mark dangerous prompts with `dangerLevel: 'high'` or `'critical'`
- Use high-risk categories (DEPLOYMENT, INFRASTRUCTURE) for special handling
- Review strategy notes for guidance

### 3. Session Context

- Provide comprehensive session context for accurate risk assessment
- Include relevant project information
- Set user preferences for personalization

### 4. Performance

- Leverage context caching for repeated renders
- Use `assessPromptRisk` before risky operations
- Monitor rendering metrics for optimization

## Future Enhancements

Potential areas for further development:

1. **Learning Engine**: Learn from successful prompt interactions
2. **Auto-Fix Suggestions**: Suggest improvements based on failed attempts
3. **Prompt Versioning**: Full git-like version history
4. **A/B Testing**: Test prompt variants automatically
5. **Auto-Optimization**: Automatically refine prompts based on usage

## References

- [claude-code-prompts Repository](https://github.com/anthropics/claude-code-prompts)
- [Joy-Zoning Architecture](../JOYZONING.md)
- [Prompt Enhancement Test Suite](../test/integration/prompt-enhanced-integration.test.ts)
- [Context Provider Implementation](../../src/core/capabilities/ContextProviderEngine.ts)
- [Risk-Aware Strategy](../../src/core/capabilities/RiskAwareCompositionStrategy.ts)