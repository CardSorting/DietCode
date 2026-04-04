/**
 * [LAYER: DOMAIN]
 * Principle: Layer classification and scanner status
 */

export interface LayerAwareness {
  declaredLayer: string;
  expectedLayer: string;
  isCompliant: boolean;
  reason: string;
  scanResult: {
    blocking: boolean;
    warnings: string[];
    suggestions: string[];
  };
}
