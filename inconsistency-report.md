# ESLint Rules Inconsistency Report

This document outlines the inconsistencies found across the ESLint rule implementations in the project.

## Overview of Inconsistencies

1. **Rule Naming Conventions**
   - Some rules use `Rule` suffix (e.g., `preferSignalReadsRule`), while others don't
   - Inconsistent casing in rule names (camelCase vs kebab-case)

2. **Performance Tracking**
   - Inconsistent performance metric tracking across rules
   - Some rules log detailed metrics while others don't
   - Different approaches to performance budget enforcement

3. **Rule Options**
   - Inconsistent option structures between similar rules
   - Some rules have extensive configuration while others have minimal options

4. **Message IDs**
   - Inconsistent naming conventions for message IDs
   - Some rules include detailed suggestions in messages while others don't

5. **Documentation**
   - Varying levels of detail in rule documentation
   - Inconsistent use of JSDoc comments

## Rule-Specific Inconsistencies

### consistent-rule-structure

- **Status**: Meta-rule for enforcing structure
- **Inconsistencies Found**:
  - Has more extensive performance tracking than other rules
  - Includes additional validation logic not present in other rules

### prefer-signal-reads

- **Status**: Standard rule
- **Inconsistencies Found**:
  - Uses `isInJSXContext` and `isInJSXAttribute` helper functions
  - Has a relatively simple option structure

### no-signal-assignment-in-effect

- **Status**: Complex rule with many options
- **Inconsistencies Found**:
  - More complex option structure with `signalNames` and `allowedPatterns`
  - Includes severity levels for different violation types
  - Has more detailed performance tracking

## Recommendations

1. **Standardize Rule Naming**
   - Choose either `camelCase` or `kebab-case` for rule names
   - Be consistent with the `Rule` suffix in exports

2. **Unify Performance Tracking**
   - Create a shared utility for performance tracking
   - Standardize performance metrics collection and reporting

3. **Standardize Rule Options**
   - Create a base option interface for common options
   - Document option structures consistently

4. **Improve Documentation**
   - Enforce consistent JSDoc comments
   - Document all public APIs and types

5. **Enforce Structure**
   - Use `consistent-rule-structure` to validate other rules
   - Add automated tests for rule structure
