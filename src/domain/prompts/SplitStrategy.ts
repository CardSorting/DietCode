/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic and contract definitions
 * Violations: None
 */

/**
 * Represents a behavioral pattern extracted from a prompt.
 * The pattern is split into 3 architectural elements.
 */
export type SplitPattern = {
  name: string;
  domainContract?: DomainElement;
  infrastructureImpl?: InfrastructureElement;
  coreOrchestrator?: CoreElement;
};

/**
 * Domain layer element: Defines the interface contract
 * Zero dependencies, pure logic
 */
export interface DomainElement {
  name: string;
  interfaceName: string;
  parameters: string[];
  returns: string;
}

/**
 * Infrastructure layer element: Implements the Domain contract
 * Contains I/O, external services, adapters
 */
export interface InfrastructureElement {
  adapterName: string;
  implementsInterface: string;
  usesDependencies: string[];
  behavior: string;
}

/**
 * Core layer element: Orchestrates Domain and Infrastructure
 * Coordinates workflows, task execution
 */
export interface CoreElement {
  serviceName: string;
  orchestrates?: string[];
  composition: string;
}

/**
 * Pattern mapping result: Which architectural zone a prompt resolves to
 */
export type PatternMapping = {
  patternName: string;
  extractionStrategy: StringMapping;
  domainElement?: DomainElement;
  infrastructureElement?: InfrastructureElement;
  coreElement?: CoreElement;
};

/**
 * String mapping strategy: Text from prompt -> Code extraction rule
 */
export type StringMapping = {
  promptText: string;
  skipKeyWords?: string[];
  requiredKeywords?: string[];
  extractionPattern: string;
};