/* eslint-disable @typescript-eslint/no-namespace */
/** biome-ignore-all assist/source/organizeImports: off */
import "@total-typescript/ts-reset";

import type { Linter, ESLint } from "eslint";

// Type definitions for ESLint 8 compatibility
type FlatConfig = ESLint.FlatConfig;
type LegacyConfig = Linter.Config;

declare module "eslint" {
	// Add backward compatibility for ESLint 8
	namespace ESLint {
		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface FlatConfig {
			// Add any flat config specific types if needed
		}
	}

	// Add backward compatibility for ESLint 8
	namespace Linter {
		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface Config {
			// Add any legacy config specific types if needed
		}
	}
}

// Core rules
import { consistentRuleStructureRule } from "./consistent-rule-structure.js";

const rules = {
	"consistent-rule-structure": consistentRuleStructureRule,
} as const;

const configRules = {} satisfies Linter.RulesRecord;

const recommendedConfig = {
	name: "eslint-plugin-eslint-rule/recommended",
	plugins: {
		get "eslint-plugin-eslint-rule"() {
			// eslint-disable-next-line @typescript-eslint/no-use-before-define
			return plugin;
		},
	},
	rules: configRules,
};

const plugin = {
	meta: { name: "eslint-plugin-eslint-rule" },
	rules,
	configs: {
		"recommended-legacy": {
			plugins: ["eslint-plugin-eslint-rule"],
			rules: configRules,
		},

		recommended: recommendedConfig,
		"recommended-latest": recommendedConfig,
	},
};

// Export for both ESM and CommonJS
const configs = plugin.configs;
const meta = plugin.meta;

// Export for ESLint 9+ (flat config)
export { configs, meta, rules };

// Export for ESLint 8 (legacy config)
export const configsLegacy = configs;
export const metaLegacy = meta;
export const rulesLegacy = rules;

// Default export for backward compatibility
export default plugin;

// TypeScript type exports
export type { FlatConfig, LegacyConfig, Linter, ESLint };
