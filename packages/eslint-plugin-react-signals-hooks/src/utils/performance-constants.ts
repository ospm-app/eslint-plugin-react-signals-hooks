import type { AST_NODE_TYPES } from '@typescript-eslint/types';

export const PerformanceOperations: PerformanceOperation = {
  'hook:useEffect': 'hook:useEffect',
  'hook:useLayoutEffect': 'hook:useLayoutEffect',
  'hook:useCallback': 'hook:useCallback',
  'hook:useMemo': 'hook:useMemo',
  'hook:useImperativeHandle': 'hook:useImperativeHandle',
  'hook:effect': 'hook:effect',
  'hook:computed': 'hook:computed',

  'signalImport:signal': 'signalImport:signal',
  'signalImport:useSignal': 'signalImport:useSignal',

  'signalHookFound:useSignal': 'signalHookFound:useSignal',
  'signalHookFound:useComputed': 'signalHookFound:useComputed',
  'signalHookFound:useSignalEffect': 'signalHookFound:useSignalEffect',
  'signalHookFound:useSignalState': 'signalHookFound:useSignalState',
  'signalHookFound:useSignalRef': 'signalHookFound:useSignalRef',

  reactComponentFunctionDeclarationProcessing: 'reactComponentFunctionDeclarationProcessing',
  reactComponentArrowFunctionDeclarationProcessing:
    'reactComponentArrowFunctionDeclarationProcessing',

  reactComponentFunctionExpressionProcessing: 'reactComponentFunctionExpressionProcessing',
  reactComponentArrowFunctionExpressionProcessing:
    'reactComponentArrowFunctionExpressionProcessing',

  enteredHookContextProcessing: 'enteredHookContextProcessing',
  signalFunctionCallProcessing: 'signalFunctionCallProcessing',

  fileAnalysis: 'fileAnalysis',
  assignmentAnalysis: 'assignmentAnalysis',
  preImportAnalysis: 'preImportAnalysis',

  'assignmentType:computedMemberAssignment': 'assignmentType:computedMemberAssignment',
  'assignmentType:memberAssignment': 'assignmentType:memberAssignment',
  'assignmentType:identifierAssignment': 'assignmentType:identifierAssignment',
  'assignmentType:otherAssignment': 'assignmentType:otherAssignment',

  isSignalCreation: 'isSignalCreation',
  signalCreationFound: 'signalCreationFound',
  signalAssignmentFound: 'signalAssignmentFound',
  signalsImportFound: 'signalsImportFound',
  variableCheck: 'variableCheck',
  ignoredByPattern: 'ignoredByPattern',
  validSignalFound: 'validSignalFound',
  hasTypeAnnotation: 'hasTypeAnnotation',
  reportingIssue: 'reportingIssue',
  parameterCheck: 'parameterCheck',
  propertyCheck: 'propertyCheck',
  mutationCheckStart: 'mutationCheckStart',
  importCheckStart: 'importCheckStart',
  functionExit: 'functionExit',
  checkAssignment: 'checkAssignment',
  checkUpdate: 'checkUpdate',
  signalUpdateFound: 'signalUpdateFound',
  batchMutation: 'batchMutation',
  nodeProcessingExpression: 'nodeProcessingExpression',
  reportGeneration: 'reportGeneration',

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

  // Rule execution
  ruleInit: 'ruleInit',
  ruleExecution: 'ruleExecution',

  // Property chain analysis
  analyzePropertyChainFailed: 'analyzePropertyChainFailed',

  // Dependency analysis
  getDependencyFailed: 'getDependencyFailed',

  // Import analysis
  importCheck: 'importCheck',

  // Conditional analysis
  conditionalAnalysis: 'conditionalAnalysis',
  complexityAnalysis: 'complexityAnalysis',

  // Call expression analysis
  callExpressionCheck: 'callExpressionCheck',

  // Node marking
  markNodeFailed: 'markNodeFailed',
  nodeBudgetExceeded: 'nodeBudgetExceeded',

  AccessorPropertyProcessing: 'AccessorPropertyProcessing',
  ArrayExpressionProcessing: 'ArrayExpressionProcessing',
  ArrayPatternProcessing: 'ArrayPatternProcessing',
  ArrowFunctionExpressionProcessing: 'ArrowFunctionExpressionProcessing',
  AssignmentExpressionProcessing: 'AssignmentExpressionProcessing',
  AssignmentPatternProcessing: 'AssignmentPatternProcessing',
  AwaitExpressionProcessing: 'AwaitExpressionProcessing',
  BinaryExpressionProcessing: 'BinaryExpressionProcessing',
  BlockStatementProcessing: 'BlockStatementProcessing',
  BreakStatementProcessing: 'BreakStatementProcessing',
  CallExpressionProcessing: 'CallExpressionProcessing',
  CatchClauseProcessing: 'CatchClauseProcessing',
  ChainExpressionProcessing: 'ChainExpressionProcessing',
  ClassBodyProcessing: 'ClassBodyProcessing',
  ClassDeclarationProcessing: 'ClassDeclarationProcessing',
  ClassExpressionProcessing: 'ClassExpressionProcessing',
  ConditionalExpressionProcessing: 'ConditionalExpressionProcessing',
  ContinueStatementProcessing: 'ContinueStatementProcessing',
  DebuggerStatementProcessing: 'DebuggerStatementProcessing',
  DecoratorProcessing: 'DecoratorProcessing',
  DoWhileStatementProcessing: 'DoWhileStatementProcessing',
  EmptyStatementProcessing: 'EmptyStatementProcessing',
  ExportAllDeclarationProcessing: 'ExportAllDeclarationProcessing',
  ExportDefaultDeclarationProcessing: 'ExportDefaultDeclarationProcessing',
  ExportNamedDeclarationProcessing: 'ExportNamedDeclarationProcessing',
  ExportSpecifierProcessing: 'ExportSpecifierProcessing',
  ExpressionStatementProcessing: 'ExpressionStatementProcessing',
  ForInStatementProcessing: 'ForInStatementProcessing',
  ForOfStatementProcessing: 'ForOfStatementProcessing',
  ForStatementProcessing: 'ForStatementProcessing',
  FunctionDeclarationProcessing: 'FunctionDeclarationProcessing',
  FunctionExpressionProcessing: 'FunctionExpressionProcessing',
  IdentifierProcessing: 'IdentifierProcessing',
  IfStatementProcessing: 'IfStatementProcessing',
  ImportAttributeProcessing: 'ImportAttributeProcessing',
  ImportDeclarationProcessing: 'ImportDeclarationProcessing',
  ImportDefaultSpecifierProcessing: 'ImportDefaultSpecifierProcessing',
  ImportExpressionProcessing: 'ImportExpressionProcessing',
  ImportNamespaceSpecifierProcessing: 'ImportNamespaceSpecifierProcessing',
  ImportSpecifierProcessing: 'ImportSpecifierProcessing',
  JSXAttributeProcessing: 'JSXAttributeProcessing',
  JSXClosingElementProcessing: 'JSXClosingElementProcessing',
  JSXClosingFragmentProcessing: 'JSXClosingFragmentProcessing',
  JSXElementProcessing: 'JSXElementProcessing',
  JSXEmptyExpressionProcessing: 'JSXEmptyExpressionProcessing',
  JSXExpressionContainerProcessing: 'JSXExpressionContainerProcessing',
  JSXFragmentProcessing: 'JSXFragmentProcessing',
  JSXIdentifierProcessing: 'JSXIdentifierProcessing',
  JSXMemberExpressionProcessing: 'JSXMemberExpressionProcessing',
  JSXNamespacedNameProcessing: 'JSXNamespacedNameProcessing',
  JSXOpeningElementProcessing: 'JSXOpeningElementProcessing',
  JSXOpeningFragmentProcessing: 'JSXOpeningFragmentProcessing',
  JSXSpreadAttributeProcessing: 'JSXSpreadAttributeProcessing',
  JSXSpreadChildProcessing: 'JSXSpreadChildProcessing',
  JSXTextProcessing: 'JSXTextProcessing',
  LabeledStatementProcessing: 'LabeledStatementProcessing',
  LiteralProcessing: 'LiteralProcessing',
  LogicalExpressionProcessing: 'LogicalExpressionProcessing',
  MemberExpressionProcessing: 'MemberExpressionProcessing',
  MetaPropertyProcessing: 'MetaPropertyProcessing',
  MethodDefinitionProcessing: 'MethodDefinitionProcessing',
  NewExpressionProcessing: 'NewExpressionProcessing',
  ObjectExpressionProcessing: 'ObjectExpressionProcessing',
  ObjectPatternProcessing: 'ObjectPatternProcessing',
  PrivateIdentifierProcessing: 'PrivateIdentifierProcessing',
  ProgramProcessing: 'ProgramProcessing',
  PropertyProcessing: 'PropertyProcessing',
  PropertyDefinitionProcessing: 'PropertyDefinitionProcessing',
  RestElementProcessing: 'RestElementProcessing',
  ReturnStatementProcessing: 'ReturnStatementProcessing',
  SequenceExpressionProcessing: 'SequenceExpressionProcessing',
  SpreadElementProcessing: 'SpreadElementProcessing',
  StaticBlockProcessing: 'StaticBlockProcessing',
  SuperProcessing: 'SuperProcessing',
  SwitchCaseProcessing: 'SwitchCaseProcessing',
  SwitchStatementProcessing: 'SwitchStatementProcessing',
  TaggedTemplateExpressionProcessing: 'TaggedTemplateExpressionProcessing',
  TemplateElementProcessing: 'TemplateElementProcessing',
  TemplateLiteralProcessing: 'TemplateLiteralProcessing',
  ThisExpressionProcessing: 'ThisExpressionProcessing',
  ThrowStatementProcessing: 'ThrowStatementProcessing',
  TryStatementProcessing: 'TryStatementProcessing',
  UnaryExpressionProcessing: 'UnaryExpressionProcessing',
  UpdateExpressionProcessing: 'UpdateExpressionProcessing',
  VariableDeclarationProcessing: 'VariableDeclarationProcessing',
  VariableDeclaratorProcessing: 'VariableDeclaratorProcessing',
  WhileStatementProcessing: 'WhileStatementProcessing',
  WithStatementProcessing: 'WithStatementProcessing',
  YieldExpressionProcessing: 'YieldExpressionProcessing',
  TSAbstractAccessorPropertyProcessing: 'TSAbstractAccessorPropertyProcessing',
  TSAbstractKeywordProcessing: 'TSAbstractKeywordProcessing',
  TSAbstractMethodDefinitionProcessing: 'TSAbstractMethodDefinitionProcessing',
  TSAbstractPropertyDefinitionProcessing: 'TSAbstractPropertyDefinitionProcessing',
  TSAnyKeywordProcessing: 'TSAnyKeywordProcessing',
  TSArrayTypeProcessing: 'TSArrayTypeProcessing',
  TSAsExpressionProcessing: 'TSAsExpressionProcessing',
  TSAsyncKeywordProcessing: 'TSAsyncKeywordProcessing',
  TSBigIntKeywordProcessing: 'TSBigIntKeywordProcessing',
  TSBooleanKeywordProcessing: 'TSBooleanKeywordProcessing',
  TSCallSignatureDeclarationProcessing: 'TSCallSignatureDeclarationProcessing',
  TSClassImplementsProcessing: 'TSClassImplementsProcessing',
  TSConditionalTypeProcessing: 'TSConditionalTypeProcessing',
  TSConstructorTypeProcessing: 'TSConstructorTypeProcessing',
  TSConstructSignatureDeclarationProcessing: 'TSConstructSignatureDeclarationProcessing',
  TSDeclareFunctionProcessing: 'TSDeclareFunctionProcessing',
  TSDeclareKeywordProcessing: 'TSDeclareKeywordProcessing',
  TSEmptyBodyFunctionExpressionProcessing: 'TSEmptyBodyFunctionExpressionProcessing',
  TSEnumBodyProcessing: 'TSEnumBodyProcessing',
  TSEnumDeclarationProcessing: 'TSEnumDeclarationProcessing',
  TSEnumMemberProcessing: 'TSEnumMemberProcessing',
  TSExportAssignmentProcessing: 'TSExportAssignmentProcessing',
  TSExportKeywordProcessing: 'TSExportKeywordProcessing',
  TSExternalModuleReferenceProcessing: 'TSExternalModuleReferenceProcessing',
  TSFunctionTypeProcessing: 'TSFunctionTypeProcessing',
  TSImportEqualsDeclarationProcessing: 'TSImportEqualsDeclarationProcessing',
  TSImportTypeProcessing: 'TSImportTypeProcessing',
  TSIndexedAccessTypeProcessing: 'TSIndexedAccessTypeProcessing',
  TSIndexSignatureProcessing: 'TSIndexSignatureProcessing',
  TSInferTypeProcessing: 'TSInferTypeProcessing',
  TSInstantiationExpressionProcessing: 'TSInstantiationExpressionProcessing',
  TSInterfaceBodyProcessing: 'TSInterfaceBodyProcessing',
  TSInterfaceDeclarationProcessing: 'TSInterfaceDeclarationProcessing',
  TSInterfaceHeritageProcessing: 'TSInterfaceHeritageProcessing',
  TSIntersectionTypeProcessing: 'TSIntersectionTypeProcessing',
  TSIntrinsicKeywordProcessing: 'TSIntrinsicKeywordProcessing',
  TSLiteralTypeProcessing: 'TSLiteralTypeProcessing',
  TSMappedTypeProcessing: 'TSMappedTypeProcessing',
  TSMethodSignatureProcessing: 'TSMethodSignatureProcessing',
  TSModuleBlockProcessing: 'TSModuleBlockProcessing',
  TSModuleDeclarationProcessing: 'TSModuleDeclarationProcessing',
  TSNamedTupleMemberProcessing: 'TSNamedTupleMemberProcessing',
  TSNamespaceExportDeclarationProcessing: 'TSNamespaceExportDeclarationProcessing',
  TSNeverKeywordProcessing: 'TSNeverKeywordProcessing',
  TSNonNullExpressionProcessing: 'TSNonNullExpressionProcessing',
  TSNullKeywordProcessing: 'TSNullKeywordProcessing',
  TSNumberKeywordProcessing: 'TSNumberKeywordProcessing',
  TSObjectKeywordProcessing: 'TSObjectKeywordProcessing',
  TSOptionalTypeProcessing: 'TSOptionalTypeProcessing',
  TSParameterPropertyProcessing: 'TSParameterPropertyProcessing',
  TSPrivateKeywordProcessing: 'TSPrivateKeywordProcessing',
  TSPropertySignatureProcessing: 'TSPropertySignatureProcessing',
  TSProtectedKeywordProcessing: 'TSProtectedKeywordProcessing',
  TSPublicKeywordProcessing: 'TSPublicKeywordProcessing',
  TSQualifiedNameProcessing: 'TSQualifiedNameProcessing',
  TSReadonlyKeywordProcessing: 'TSReadonlyKeywordProcessing',
  TSRestTypeProcessing: 'TSRestTypeProcessing',
  TSSatisfiesExpressionProcessing: 'TSSatisfiesExpressionProcessing',
  TSStaticKeywordProcessing: 'TSStaticKeywordProcessing',
  TSStringKeywordProcessing: 'TSStringKeywordProcessing',
  TSSymbolKeywordProcessing: 'TSSymbolKeywordProcessing',
  TSTemplateLiteralTypeProcessing: 'TSTemplateLiteralTypeProcessing',
  TSThisTypeProcessing: 'TSThisTypeProcessing',
  TSTupleTypeProcessing: 'TSTupleTypeProcessing',
  TSTypeAliasDeclarationProcessing: 'TSTypeAliasDeclarationProcessing',
  TSTypeAnnotationProcessing: 'TSTypeAnnotationProcessing',
  TSTypeAssertionProcessing: 'TSTypeAssertionProcessing',
  TSTypeLiteralProcessing: 'TSTypeLiteralProcessing',
  TSTypeOperatorProcessing: 'TSTypeOperatorProcessing',
  TSTypeParameterProcessing: 'TSTypeParameterProcessing',
  TSTypeParameterDeclarationProcessing: 'TSTypeParameterDeclarationProcessing',
  TSTypeParameterInstantiationProcessing: 'TSTypeParameterInstantiationProcessing',
  TSTypePredicateProcessing: 'TSTypePredicateProcessing',
  TSTypeQueryProcessing: 'TSTypeQueryProcessing',
  TSTypeReferenceProcessing: 'TSTypeReferenceProcessing',
  TSUndefinedKeywordProcessing: 'TSUndefinedKeywordProcessing',
  TSUnionTypeProcessing: 'TSUnionTypeProcessing',
  TSUnknownKeywordProcessing: 'TSUnknownKeywordProcessing',
  TSVoidKeywordProcessing: 'TSVoidKeywordProcessing',

  // importCheck

  importCheckAccessorProperty: 'importCheckAccessorProperty',
  importCheckArrayExpression: 'importCheckArrayExpression',
  importCheckArrayPattern: 'importCheckArrayPattern',
  importCheckArrowFunctionExpression: 'importCheckArrowFunctionExpression',
  importCheckAssignmentExpression: 'importCheckAssignmentExpression',
  importCheckAssignmentPattern: 'importCheckAssignmentPattern',
  importCheckAwaitExpression: 'importCheckAwaitExpression',
  importCheckBinaryExpression: 'importCheckBinaryExpression',
  importCheckBlockStatement: 'importCheckBlockStatement',
  importCheckBreakStatement: 'importCheckBreakStatement',
  importCheckCallExpression: 'importCheckCallExpression',
  importCheckCatchClause: 'importCheckCatchClause',
  importCheckChainExpression: 'importCheckChainExpression',
  importCheckClassBody: 'importCheckClassBody',
  importCheckClassDeclaration: 'importCheckClassDeclaration',
  importCheckClassExpression: 'importCheckClassExpression',
  importCheckConditionalExpression: 'importCheckConditionalExpression',
  importCheckContinueStatement: 'importCheckContinueStatement',
  importCheckDebuggerStatement: 'importCheckDebuggerStatement',
  importCheckDecorator: 'importCheckDecorator',
  importCheckDoWhileStatement: 'importCheckDoWhileStatement',
  importCheckEmptyStatement: 'importCheckEmptyStatement',
  importCheckExportAllDeclaration: 'importCheckExportAllDeclaration',
  importCheckExportDefaultDeclaration: 'importCheckExportDefaultDeclaration',
  importCheckExportNamedDeclaration: 'importCheckExportNamedDeclaration',
  importCheckExportSpecifier: 'importCheckExportSpecifier',
  importCheckExpressionStatement: 'importCheckExpressionStatement',
  importCheckForInStatement: 'importCheckForInStatement',
  importCheckForOfStatement: 'importCheckForOfStatement',
  importCheckForStatement: 'importCheckForStatement',
  importCheckFunctionDeclaration: 'importCheckFunctionDeclaration',
  importCheckFunctionExpression: 'importCheckFunctionExpression',
  importCheckIdentifier: 'importCheckIdentifier',
  importCheckIfStatement: 'importCheckIfStatement',
  importCheckImportAttribute: 'importCheckImportAttribute',
  importCheckImportDeclaration: 'importCheckImportDeclaration',
  importCheckImportDefaultSpecifier: 'importCheckImportDefaultSpecifier',
  importCheckImportExpression: 'importCheckImportExpression',
  importCheckImportNamespaceSpecifier: 'importCheckImportNamespaceSpecifier',
  importCheckImportSpecifier: 'importCheckImportSpecifier',
  importCheckJSXAttribute: 'importCheckJSXAttribute',
  importCheckJSXClosingElement: 'importCheckJSXClosingElement',
  importCheckJSXClosingFragment: 'importCheckJSXClosingFragment',
  importCheckJSXElement: 'importCheckJSXElement',
  importCheckJSXEmptyExpression: 'importCheckJSXEmptyExpression',
  importCheckJSXExpressionContainer: 'importCheckJSXExpressionContainer',
  importCheckJSXFragment: 'importCheckJSXFragment',
  importCheckJSXIdentifier: 'importCheckJSXIdentifier',
  importCheckJSXMemberExpression: 'importCheckJSXMemberExpression',
  importCheckJSXNamespacedName: 'importCheckJSXNamespacedName',
  importCheckJSXOpeningElement: 'importCheckJSXOpeningElement',
  importCheckJSXOpeningFragment: 'importCheckJSXOpeningFragment',
  importCheckJSXSpreadAttribute: 'importCheckJSXSpreadAttribute',
  importCheckJSXSpreadChild: 'importCheckJSXSpreadChild',
  importCheckJSXText: 'importCheckJSXText',
  importCheckLabeledStatement: 'importCheckLabeledStatement',
  importCheckLiteral: 'importCheckLiteral',
  importCheckLogicalExpression: 'importCheckLogicalExpression',
  importCheckMemberExpression: 'importCheckMemberExpression',
  importCheckMetaProperty: 'importCheckMetaProperty',
  importCheckMethodDefinition: 'importCheckMethodDefinition',
  importCheckNewExpression: 'importCheckNewExpression',
  importCheckObjectExpression: 'importCheckObjectExpression',
  importCheckObjectPattern: 'importCheckObjectPattern',
  importCheckPrivateIdentifier: 'importCheckPrivateIdentifier',
  importCheckProgram: 'importCheckProgram',
  importCheckProperty: 'importCheckProperty',
  importCheckPropertyDefinition: 'importCheckPropertyDefinition',
  importCheckRestElement: 'importCheckRestElement',
  importCheckReturnStatement: 'importCheckReturnStatement',
  importCheckSequenceExpression: 'importCheckSequenceExpression',
  importCheckSpreadElement: 'importCheckSpreadElement',
  importCheckStaticBlock: 'importCheckStaticBlock',
  importCheckSuper: 'importCheckSuper',
  importCheckSwitchCase: 'importCheckSwitchCase',
  importCheckSwitchStatement: 'importCheckSwitchStatement',
  importCheckTaggedTemplateExpression: 'importCheckTaggedTemplateExpression',
  importCheckTemplateElement: 'importCheckTemplateElement',
  importCheckTemplateLiteral: 'importCheckTemplateLiteral',
  importCheckThisExpression: 'importCheckThisExpression',
  importCheckThrowStatement: 'importCheckThrowStatement',
  importCheckTryStatement: 'importCheckTryStatement',
  importCheckUnaryExpression: 'importCheckUnaryExpression',
  importCheckUpdateExpression: 'importCheckUpdateExpression',
  importCheckVariableDeclaration: 'importCheckVariableDeclaration',
  importCheckVariableDeclarator: 'importCheckVariableDeclarator',
  importCheckWhileStatement: 'importCheckWhileStatement',
  importCheckWithStatement: 'importCheckWithStatement',
  importCheckYieldExpression: 'importCheckYieldExpression',
  importCheckTSAbstractAccessorProperty: 'importCheckTSAbstractAccessorProperty',
  importCheckTSAbstractKeyword: 'importCheckTSAbstractKeyword',
  importCheckTSAbstractMethodDefinition: 'importCheckTSAbstractMethodDefinition',
  importCheckTSAbstractPropertyDefinition: 'importCheckTSAbstractPropertyDefinition',
  importCheckTSAnyKeyword: 'importCheckTSAnyKeyword',
  importCheckTSArrayType: 'importCheckTSArrayType',
  importCheckTSAsExpression: 'importCheckTSAsExpression',
  importCheckTSAsyncKeyword: 'importCheckTSAsyncKeyword',
  importCheckTSBigIntKeyword: 'importCheckTSBigIntKeyword',
  importCheckTSBooleanKeyword: 'importCheckTSBooleanKeyword',
  importCheckTSCallSignatureDeclaration: 'importCheckTSCallSignatureDeclaration',
  importCheckTSClassImplements: 'importCheckTSClassImplements',
  importCheckTSConditionalType: 'importCheckTSConditionalType',
  importCheckTSConstructorType: 'importCheckTSConstructorType',
  importCheckTSConstructSignatureDeclaration: 'importCheckTSConstructSignatureDeclaration',
  importCheckTSDeclareFunction: 'importCheckTSDeclareFunction',
  importCheckTSDeclareKeyword: 'importCheckTSDeclareKeyword',
  importCheckTSEmptyBodyFunctionExpression: 'importCheckTSEmptyBodyFunctionExpression',
  importCheckTSEnumBody: 'importCheckTSEnumBody',
  importCheckTSEnumDeclaration: 'importCheckTSEnumDeclaration',
  importCheckTSEnumMember: 'importCheckTSEnumMember',
  importCheckTSExportAssignment: 'importCheckTSExportAssignment',
  importCheckTSExportKeyword: 'importCheckTSExportKeyword',
  importCheckTSExternalModuleReference: 'importCheckTSExternalModuleReference',
  importCheckTSFunctionType: 'importCheckTSFunctionType',
  importCheckTSImportEqualsDeclaration: 'importCheckTSImportEqualsDeclaration',
  importCheckTSImportType: 'importCheckTSImportType',
  importCheckTSIndexedAccessType: 'importCheckTSIndexedAccessType',
  importCheckTSIndexSignature: 'importCheckTSIndexSignature',
  importCheckTSInferType: 'importCheckTSInferType',
  importCheckTSInstantiationExpression: 'importCheckTSInstantiationExpression',
  importCheckTSInterfaceBody: 'importCheckTSInterfaceBody',
  importCheckTSInterfaceDeclaration: 'importCheckTSInterfaceDeclaration',
  importCheckTSInterfaceHeritage: 'importCheckTSInterfaceHeritage',
  importCheckTSIntersectionType: 'importCheckTSIntersectionType',
  importCheckTSIntrinsicKeyword: 'importCheckTSIntrinsicKeyword',
  importCheckTSLiteralType: 'importCheckTSLiteralType',
  importCheckTSMappedType: 'importCheckTSMappedType',
  importCheckTSMethodSignature: 'importCheckTSMethodSignature',
  importCheckTSModuleBlock: 'importCheckTSModuleBlock',
  importCheckTSModuleDeclaration: 'importCheckTSModuleDeclaration',
  importCheckTSNamedTupleMember: 'importCheckTSNamedTupleMember',
  importCheckTSNamespaceExportDeclaration: 'importCheckTSNamespaceExportDeclaration',
  importCheckTSNeverKeyword: 'importCheckTSNeverKeyword',
  importCheckTSNonNullExpression: 'importCheckTSNonNullExpression',
  importCheckTSNullKeyword: 'importCheckTSNullKeyword',
  importCheckTSNumberKeyword: 'importCheckTSNumberKeyword',
  importCheckTSObjectKeyword: 'importCheckTSObjectKeyword',
  importCheckTSOptionalType: 'importCheckTSOptionalType',
  importCheckTSParameterProperty: 'importCheckTSParameterProperty',
  importCheckTSPrivateKeyword: 'importCheckTSPrivateKeyword',
  importCheckTSPropertySignature: 'importCheckTSPropertySignature',
  importCheckTSProtectedKeyword: 'importCheckTSProtectedKeyword',
  importCheckTSPublicKeyword: 'importCheckTSPublicKeyword',
  importCheckTSQualifiedName: 'importCheckTSQualifiedName',
  importCheckTSReadonlyKeyword: 'importCheckTSReadonlyKeyword',
  importCheckTSRestType: 'importCheckTSRestType',
  importCheckTSSatisfiesExpression: 'importCheckTSSatisfiesExpression',
  importCheckTSStaticKeyword: 'importCheckTSStaticKeyword',
  importCheckTSStringKeyword: 'importCheckTSStringKeyword',
  importCheckTSSymbolKeyword: 'importCheckTSSymbolKeyword',
  importCheckTSTemplateLiteralType: 'importCheckTSTemplateLiteralType',
  importCheckTSThisType: 'importCheckTSThisType',
  importCheckTSTupleType: 'importCheckTSTupleType',
  importCheckTSTypeAliasDeclaration: 'importCheckTSTypeAliasDeclaration',
  importCheckTSTypeAnnotation: 'importCheckTSTypeAnnotation',
  importCheckTSTypeAssertion: 'importCheckTSTypeAssertion',
  importCheckTSTypeLiteral: 'importCheckTSTypeLiteral',
  importCheckTSTypeOperator: 'importCheckTSTypeOperator',
  importCheckTSTypeParameter: 'importCheckTSTypeParameter',
  importCheckTSTypeParameterDeclaration: 'importCheckTSTypeParameterDeclaration',
  importCheckTSTypeParameterInstantiation: 'importCheckTSTypeParameterInstantiation',
  importCheckTSTypePredicate: 'importCheckTSTypePredicate',
  importCheckTSTypeQuery: 'importCheckTSTypeQuery',
  importCheckTSTypeReference: 'importCheckTSTypeReference',
  importCheckTSUndefinedKeyword: 'importCheckTSUndefinedKeyword',
  importCheckTSUnionType: 'importCheckTSUnionType',
  importCheckTSUnknownKeyword: 'importCheckTSUnknownKeyword',
  importCheckTSVoidKeyword: 'importCheckTSVoidKeyword',
};

type NodeTypeProcessing = {
  [K in keyof typeof AST_NODE_TYPES as `${K}Processing`]: `${K}Processing`;
};

type ImportCheckNodeType = {
  [K in keyof typeof AST_NODE_TYPES as `importCheck${K}`]: `importCheck${K}`;
};

export type PerformanceOperation = {
  'hook:useEffect': 'hook:useEffect';
  'hook:useLayoutEffect': 'hook:useLayoutEffect';
  'hook:useCallback': 'hook:useCallback';
  'hook:useMemo': 'hook:useMemo';
  'hook:useImperativeHandle': 'hook:useImperativeHandle';
  'hook:effect': 'hook:effect';
  'hook:computed': 'hook:computed';

  'signalImport:signal': 'signalImport:signal';
  'signalImport:useSignal': 'signalImport:useSignal';

  'signalHookFound:useSignal': 'signalHookFound:useSignal';
  'signalHookFound:useComputed': 'signalHookFound:useComputed';
  'signalHookFound:useSignalEffect': 'signalHookFound:useSignalEffect';
  'signalHookFound:useSignalState': 'signalHookFound:useSignalState';
  'signalHookFound:useSignalRef': 'signalHookFound:useSignalRef';

  reactComponentFunctionDeclarationProcessing: 'reactComponentFunctionDeclarationProcessing';
  reactComponentArrowFunctionDeclarationProcessing: 'reactComponentArrowFunctionDeclarationProcessing';

  reactComponentFunctionExpressionProcessing: 'reactComponentFunctionExpressionProcessing';
  reactComponentArrowFunctionExpressionProcessing: 'reactComponentArrowFunctionExpressionProcessing';

  enteredHookContextProcessing: 'enteredHookContextProcessing';
  signalFunctionCallProcessing: 'signalFunctionCallProcessing';

  fileAnalysis: 'fileAnalysis';
  assignmentAnalysis: 'assignmentAnalysis';
  preImportAnalysis: 'preImportAnalysis';

  'assignmentType:computedMemberAssignment': 'assignmentType:computedMemberAssignment';
  'assignmentType:memberAssignment': 'assignmentType:memberAssignment';
  'assignmentType:identifierAssignment': 'assignmentType:identifierAssignment';
  'assignmentType:otherAssignment': 'assignmentType:otherAssignment';

  isSignalCreation: 'isSignalCreation';
  signalCreationFound: 'signalCreationFound';
  signalAssignmentFound: 'signalAssignmentFound';
  signalsImportFound: 'signalsImportFound';
  variableCheck: 'variableCheck';
  ignoredByPattern: 'ignoredByPattern';
  validSignalFound: 'validSignalFound';
  hasTypeAnnotation: 'hasTypeAnnotation';
  reportingIssue: 'reportingIssue';
  parameterCheck: 'parameterCheck';
  propertyCheck: 'propertyCheck';
  mutationCheckStart: 'mutationCheckStart';
  importCheckStart: 'importCheckStart';
  functionExit: 'functionExit';
  checkAssignment: 'checkAssignment';
  checkUpdate: 'checkUpdate';
  signalUpdateFound: 'signalUpdateFound';
  batchMutation: 'batchMutation';
  nodeProcessingExpression: 'nodeProcessingExpression';
  reportGeneration: 'reportGeneration';

  signalAccess: 'signalAccess';
  signalUpdate: 'signalUpdate';
  signalCheck: 'signalCheck';
  signalCreation: 'signalCreation';
  nestedPropertyCheck: 'nestedPropertyCheck';
  identifierResolution: 'identifierResolution';
  scopeLookup: 'scopeLookup';
  typeCheck: 'typeCheck';
  componentCheck: 'componentCheck';
  hookCheck: 'hookCheck';
  effectCheck: 'effectCheck';
  batchAnalysis: 'batchAnalysis';
  nodeProcessing: 'nodeProcessing';
  dependencyCheck: 'dependencyCheck';
  ruleInit: 'ruleInit';
  ruleExecution: 'ruleExecution';
  analyzePropertyChainFailed: 'analyzePropertyChainFailed';
  getDependencyFailed: 'getDependencyFailed';
  importCheck: 'importCheck';
  conditionalAnalysis: 'conditionalAnalysis';
  complexityAnalysis: 'complexityAnalysis';
  callExpressionCheck: 'callExpressionCheck';
  markNodeFailed: 'markNodeFailed';
  nodeBudgetExceeded: 'nodeBudgetExceeded';
} & NodeTypeProcessing &
  ImportCheckNodeType;

export type PerformanceOperationKeys = keyof PerformanceOperation;
