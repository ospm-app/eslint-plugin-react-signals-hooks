# Validation Libraries API Comparison

This document provides a detailed comparison of the APIs for Valibot, Zod, Arktype, and Joi.

## Basic Types

| Type | valibot | zod | arktype | joi |
|------|---------|-----|---------|-----|
| String | `string()` | `z.string()` | `type("string")` | `Joi.string()` |
| Number | `number()` | `z.number()` | `type("number")` | `Joi.number()` |
| Boolean | `boolean()` | `z.boolean()` | `type("boolean")` | `Joi.boolean()` |
| Null | `null_()` | `z.null()` | `type("null")` | `Joi.valid(null)` |
| Undefined | `undefined_()` | `z.undefined()` | `type("undefined")` | `Joi.any().valid(undefined)` |
| Any | `any()` | `z.any()` | `type("unknown")` | `Joi.any()` |
| Never | `never()` | `z.never()` | `type("never")` | `Joi.any().forbidden()` |
| BigInt | `bigint()` | `z.bigint()` | `type("bigint")` | `Joi.any().custom(BigInt)` |
| Symbol | `symbol()` | `z.symbol()` | `type("symbol")` | `Joi.symbol()` |

## Common Validations

### String Validations

| Validation | valibot | zod | arktype | joi |
|------------|---------|-----|---------|-----|
| Min length | `string([minLength(1)])` | `z.string().min(1)` | `type("string & {length: [1, number]}")` | `Joi.string().min(1)` |
| Max length | `string([maxLength(10)])` | `z.string().max(10)` | `type("string & {length: [0, 10]}")` | `Joi.string().max(10)` |
| Email | `string([email()])` | `z.string().email()` | `type("string & {includes: '@', includes: '.'}")` | `Joi.string().email()` |
| URL | `string([url()])` | `z.string().url()` | `type("string & {startsWith: 'http'}")` | `Joi.string().uri()` |
| UUID | `string([uuid()])` | `z.string().uuid()` | `type("string & /^[0-9a-f]{8}-.../")` | `Joi.string().guid()` |
| Regex | `string([pattern(/^[A-Z]+$/)])` | `z.string().regex(/^[A-Z]+$/)` | `type("string & /^[A-Z]+$/")` | `Joi.string().pattern(/^[A-Z]+$/)` |

### Number Validations

| Validation | valibot | zod | arktype | joi |
|------------|---------|-----|---------|-----|
| Min | `number([minValue(1)])` | `z.number().min(1)` | `type("number & [1, number]")` | `Joi.number().min(1)` |
| Max | `number([maxValue(100)])` | `z.number().max(100)` | `type("number & [number, 100]")` | `Joi.number().max(100)` |
| Integer | `number([integer()])` | `z.number().int()` | `type("integer")` | `Joi.number().integer()` |
| Positive | `number([minValue(0, 'exclusive')])` | `z.number().positive()` | `type("number & (0, number)")` | `Joi.number().positive()` |

## Object & Array

### Object Validation

| Feature | valibot | zod | arktype | joi |
|---------|---------|-----|---------|-----|
| Basic | `object({name: string()})` | `z.object({name: z.string()})` | `type({name: "string"})` | `Joi.object({name: Joi.string()})` |
| Partial | `partial(object({name: string()}))` | `z.object({name: z.string()}).partial()` | `type(Partial<{name: string}>)` | `Joi.object({name: Joi.string()}).optional()` |
| Pick | `pick(schema, ['name'])` | `schema.pick({name: true})` | `type(Pick<typeof schema, 'name'>)` | `schema.pick(['name'])` |
| Omit | `omit(schema, ['name'])` | `schema.omit({name: true})` | `type(Omit<typeof schema, 'name'>)` | `schema.omit(['name'])` |

### Array Validation

| Feature | valibot | zod | arktype | joi |
|---------|---------|-----|---------|-----|
| Basic | `array(string())` | `z.array(z.string())` | `type("string[]")` | `Joi.array().items(Joi.string())` |
| Min length | `array(string(), [minLength(1)])` | `z.array(z.string()).min(1)` | `type("string[] & {length: [1, number]}")` | `Joi.array().min(1)` |
| Max length | `array(string(), [maxLength(10)])` | `z.array(z.string()).max(10)` | `type("string[] & {length: [0, 10]}")` | `Joi.array().max(10)` |
| Unique | `array(string(), [unique()])` | `z.array(z.string()).unique()` | `type("string[] & {unique: true}")` | `Joi.array().unique()` |

## Advanced Types

### Union & Intersection

| Type | valibot | zod | arktype | joi |
|------|---------|-----|---------|-----|
| Union | `union([string(), number()])` | `z.union([z.string(), z.number()])` | `type("string | number")` | `Joi.alternatives().try(Joi.string(), Joi.number())` |
| Intersection | `merge(obj1, obj2)` | `z.intersection(obj1, obj2)` | `type({...obj1, ...obj2})` | `obj1.concat(obj2)` |
| Discriminated Union | `variant('type', [...])` | `z.discriminatedUnion('type', [...])` | `type(...) | type(...)` | `Joi.alternatives().conditional(...)` |

## Custom Validation

### Custom Validators

| Feature | valibot | zod | arktype | joi |
|---------|---------|-----|---------|-----|
| Custom | `string([custom(v => v.length <= 5)])` | `z.string().refine(v => v.length <= 5)` | `type("string & {length: '<=5'}")` | `Joi.string().custom(v => v.length <= 5)` |
| Async | `string([customAsync(async v => {...})])` | `z.string().refine(async v => {...})` | `type("string & ${async s => {...}}")` | `Joi.string().external(async v => {...})` |
| Transform | `transform(string(), v => v.trim())` | `z.string().transform(v => v.trim())` | `type("string & {trim: true}")` | `Joi.string().custom(v => v.trim())` |

## Error Handling

### Error Customization

| Feature | valibot | zod | arktype | joi |
|---------|---------|-----|---------|-----|
| Custom message | `string([email('Invalid email')])` | `z.string().email('Invalid email')` | `type("string & {includes: '@', error: 'Invalid email'}")` | `Joi.string().email({tlds: false}).messages({'string.email': 'Invalid email'})` |
| Error formatting | `safeParse(schema, data)` | `schema.safeParse(data)` | `type.validate(data)` | `schema.validate(data)` |

## Summary of Key Differences

1. **Type Safety**:
   - Zod, Valibot, and Arktype provide full TypeScript support
   - Joi has limited TypeScript support

2. **Bundle Size**:
   - Valibot: ~1.5KB (smallest)
   - Arktype: ~2KB
   - Zod: ~8KB
   - Joi: ~12KB (largest)

3. **API Style**:
   - Zod & Joi: Method chaining
   - Valibot: Functional API with array of validations
   - Arktype: Type strings and objects

4. **Performance**:
   - Valibot & Arktype: Optimized for tree-shaking
   - Zod: Good runtime performance
   - Joi: Most feature-rich but slowest
