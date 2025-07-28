import { AST_NODE_TYPES } from "@typescript-eslint/types";

export const PerformanceOperations = {
	// Signal operations
	signalAccess: "signalAccess",
	signalUpdate: "signalUpdate",
	signalCheck: "signalCheck",
	signalCreation: "signalCreation",

	// Analysis operations
	nestedPropertyCheck: "nestedPropertyCheck",
	identifierResolution: "identifierResolution",
	scopeLookup: "scopeLookup",
	typeCheck: "typeCheck",

	// Component and hook analysis
	componentCheck: "componentCheck",
	hookCheck: "hookCheck",

	// Effect and batch operations
	effectCheck: "effectCheck",
	batchAnalysis: "batchAnalysis",

	// AST and node processing
	nodeProcessing: "nodeProcessing",
	dependencyCheck: "dependencyCheck",

	// Rule execution
	ruleInit: "ruleInit",
	ruleExecution: "ruleExecution",

	// Property chain analysis
	analyzePropertyChainFailed: "analyzePropertyChainFailed",

	// Dependency analysis
	getDependencyFailed: "getDependencyFailed",

	// Import analysis
	importCheck: "importCheck",

	// Conditional analysis
	conditionalAnalysis: "conditionalAnalysis",
	complexityAnalysis: "complexityAnalysis",

	// Call expression analysis
	callExpressionCheck: "callExpressionCheck",

	// Node marking
	markNodeFailed: "markNodeFailed",
	nodeBudgetExceeded: "nodeBudgetExceeded",
	[`${AST_NODE_TYPES}Processing`]: `${AST_NODE_TYPES}Processing`,
};

export type PerformanceOperation = keyof typeof PerformanceOperations;
