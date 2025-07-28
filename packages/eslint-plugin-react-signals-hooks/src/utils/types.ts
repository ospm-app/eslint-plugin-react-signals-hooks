import type { PerformanceOperation } from "./performance-constants.js";

/**
 * Performance budget configuration for rule execution
 *
 * @property maxTime - Maximum execution time in milliseconds
 * @property maxMemory - Maximum memory usage in bytes
 * @property maxNodes - Maximum number of AST nodes to process
 * @property enableMetrics - Whether to collect detailed performance metrics
 * @property logMetrics - Whether to log metrics to console
 * @property maxOperations - Operation-specific limits
 */
export type PerformanceBudget = {
	maxTime?: number | undefined;
	maxMemory?: number | undefined;
	maxNodes?: number | undefined;
	enableMetrics?: boolean | undefined;
	logMetrics?: boolean | undefined;
	maxOperations?: Partial<Record<PerformanceOperation, number>> | undefined;
};

export type PerformanceMetrics = {
	// Basic timing
	startTime: number;
	endTime?: number | undefined;
	duration?: number | undefined;

	// Memory usage (in bytes)
	memoryUsage?: NodeJS.MemoryUsage | undefined;
	memoryDelta?: number | undefined;

	// Node and operation counts
	nodeCount: number;
	operationCounts: Record<string, number>;

	// File and rule info
	filePath: string;
	ruleName: string;

	// Budget tracking
	exceededBudget?: boolean | undefined;
	budgetExceededBy?: number | undefined;

	// Performance budget configuration
	perfBudget?: PerformanceBudget | undefined;

	// Additional metrics
	phaseDurations?: Record<string, number> | undefined;
	customMetrics?: Record<string, unknown> | undefined;

	// Node type tracking
	nodeTypes?: Map<string, number>;
	nodeLocations?: Array<{
		type: string;
		start: { line: number; column: number };
		end: { line: number; column: number };
	}>;
	budgetExceededNodeTypes?: Set<string>;
};
