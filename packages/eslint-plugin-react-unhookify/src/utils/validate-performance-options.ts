/** biome-ignore-all assist/source/organizeImports: off */
import { PerformanceOperations } from './performance-constants.js';
import type { PerformanceBudget } from './types.js';

type ValidationResult = {
  valid: boolean;
  errors: Array<string>;
};

const DEFAULT_LIMITS: Record<string, { min: number; max: number }> = {
  maxTime: { min: 10, max: 1000 },
  maxNodes: { min: 100, max: 10_000 },
  maxMemory: { min: 10 * 1024 * 1024, max: 1024 * 1024 * 1024 }, // 10MB to 1GB
};

const OPERATION_LIMITS: Record<string, { min: number; max: number }> = {
  [PerformanceOperations.signalAccess]: { min: 100, max: 10_000 },
  [PerformanceOperations.signalUpdate]: { min: 50, max: 5_000 },
  [PerformanceOperations.signalCheck]: { min: 50, max: 5_000 },
  [PerformanceOperations.nestedPropertyCheck]: { min: 50, max: 5_000 },
  [PerformanceOperations.identifierResolution]: { min: 100, max: 10_000 },
  [PerformanceOperations.scopeLookup]: { min: 100, max: 10_000 },
  [PerformanceOperations.typeCheck]: { min: 50, max: 5_000 },
  [PerformanceOperations.componentCheck]: { min: 10, max: 2_000 },
  [PerformanceOperations.hookCheck]: { min: 10, max: 2_000 },
  [PerformanceOperations.effectCheck]: { min: 10, max: 2_000 },
  [PerformanceOperations.batchAnalysis]: { min: 10, max: 2_000 },
};

export function validatePerformanceOptions(
  options: Partial<PerformanceBudget>,
  ruleName: string
): ValidationResult {
  const errors: Array<string> = [];

  // Validate global limits
  for (const [key, { min, max }] of Object.entries(DEFAULT_LIMITS)) {
    const value = options[key as keyof PerformanceBudget];

    if (typeof value === 'number' && (value < min || value > max)) {
      errors.push(`${ruleName}: ${key} must be between ${min} and ${max}, got ${value}`);
    }
  }

  // Validate operation limits
  if (options.maxOperations) {
    for (const [op, value] of Object.entries(options.maxOperations)) {
      const limits = OPERATION_LIMITS[op as keyof typeof PerformanceOperations];

      if (typeof limits === 'undefined') {
        errors.push(`${ruleName}: Unknown operation '${op}' in maxOperations`);

        continue;
      }

      if (typeof value !== 'number' || value < limits.min || value > limits.max) {
        errors.push(
          `${ruleName}: maxOperations.${op} must be between ${limits.min} and ${limits.max}, got ${value}`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
