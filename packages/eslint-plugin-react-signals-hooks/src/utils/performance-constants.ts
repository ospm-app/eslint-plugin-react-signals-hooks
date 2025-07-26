export const PerformanceOperations = {
  // Signal operations
  signalAccess: 'signalAccess',
  signalUpdate: 'signalUpdate',
  signalCheck: 'signalCheck',
  signalCreation: 'signalCreation',

  // Analysis operations
  nestedPropertyCheck: 'nestedPropertyCheck',
  identifierResolution: 'identifierResolution',
  scopeLookup: 'scopeLookup',
  typeCheck: 'typeCheck',

  // Component and hook analysis
  componentCheck: 'componentCheck',
  hookCheck: 'hookCheck',

  // Effect and batch operations
  effectCheck: 'effectCheck',
  batchAnalysis: 'batchAnalysis',

  // AST and node processing
  nodeProcessing: 'nodeProcessing',
  dependencyCheck: 'dependencyCheck',
} as const;

export type PerformanceOperation = keyof typeof PerformanceOperations;
