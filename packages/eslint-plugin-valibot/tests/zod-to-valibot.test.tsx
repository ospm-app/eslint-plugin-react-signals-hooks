import { z } from 'zod';

// Basic Types
const stringSchema = z.string();
const numberSchema = z.number();
const bigintSchema = z.bigint();
const booleanSchema = z.boolean();
const dateSchema = z.date();
const symbolSchema = z.symbol();
const undefinedSchema = z.undefined();
const nullSchema = z.null();
const voidSchema = z.void();
const anySchema = z.any();
const unknownSchema = z.unknown();
const neverSchema = z.never();

// Literal and Primitive Constraints
const literalSchema = z.literal('hello');
const stringWithConstraints = z
  .string()
  .min(5)
  .max(100)
  .length(10)
  .email()
  .url()
  .uuid()
  .cuid()
  .cuid2();
const numberWithConstraints = z
  .number()
  .min(5)
  .max(100)
  .int()
  .positive()
  .nonnegative()
  .negative()
  .nonpositive()
  .multipleOf(5);
const bigintWithConstraints = z
  .bigint()
  .min(5n)
  .max(100n)
  .positive()
  .nonnegative()
  .negative()
  .nonpositive()
  .multipleOf(5n);
const dateWithConstraints = z.date().min(new Date('2020-01-01')).max(new Date('2030-01-01'));

// Object Schemas
const userSchema = z.object({
  username: z.string(),
  age: z.number().int().positive(),
  email: z.string().email(),
  address: z
    .object({
      street: z.string(),
      city: z.string(),
      zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
    })
    .optional(),
  tags: z.array(z.string()),
  role: z.enum(['admin', 'user', 'guest']),
  metadata: z.record(z.union([z.string(), z.number()])),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  isActive: z.boolean().default(true),
});

// Array Schemas
const stringArray = z.array(z.string());
const numberArray = z.array(z.number());
const objectArray = z.array(z.object({ name: z.string(), value: z.number() }));
const minMaxArray = z.array(z.string()).min(2).max(10).length(5);

// Tuple Schemas
const point2D = z.tuple([z.number(), z.number()]);
const point3D = z.tuple([z.number(), z.number(), z.number()]);
const mixedTuple = z.tuple([z.string(), z.number(), z.boolean()]);
const restTuple = z.tuple([z.string()]).rest(z.number());

// Union and Intersection Types
const stringOrNumber = z.union([z.string(), z.number()]);
const stringOrNumberLiteral = z.union([
  z.literal('yes'),
  z.literal('no'),
  z.literal(1),
  z.literal(2),
]);
const combinedSchema = z.intersection(
  z.object({ name: z.string() }),
  z.object({ age: z.number() })
);

// Discriminated Unions
const dogSchema = z.object({
  type: z.literal('dog'),
  bark: z.boolean(),
  breed: z.enum(['labrador', 'bulldog', 'poodle']),
});

const catSchema = z.object({
  type: z.literal('cat'),
  meow: z.boolean(),
  lives: z.number().int().min(0).max(9),
});

const animalSchema = z.discriminatedUnion('type', [dogSchema, catSchema]);

// Record Types
const stringRecord = z.record(z.string());
const numberRecord = z.record(z.number());
const objectRecord = z.record(z.object({ value: z.string() }));
const keyRestrictedRecord = z.record(z.string(), z.number());

// Map and Set
const mapSchema = z.map(z.string(), z.number());
const setSchema = z.set(z.string());

// Promise and Function
const promiseSchema = z.promise(z.string());
const functionSchema = z
  .function()
  .args(z.number(), z.string())
  .returns(z.boolean())
  .implement((num, str) => num > 0 && str.length > 0);

// Defaults and Nullish
const withDefault = z.string().default('hello');
const nullishSchema = z.string().nullish();
const optionalSchema = z.string().optional();
const nullableSchema = z.string().nullable();

// Transform and Refinements
const trimmedString = z.string().transform((str) => str.trim());
const positiveEvenNumber = z
  .number()
  .int()
  .positive()
  .refine((n) => n % 2 === 0, 'Number must be even');

// Branded Types
const emailSchema = z.string().email().brand('Email');
type Email = z.infer<typeof emailSchema>;

// Custom Error Messages
const withCustomError = z
  .string({
    required_error: 'This field is required',
    invalid_type_error: 'Must be a string',
  })
  .min(5, { message: 'Must be at least 5 characters' });

// Effects (preprocess, postprocess)
const preprocessed = z.preprocess(
  (val) => (typeof val === 'string' ? val.toLowerCase() : val),
  z.string()
);

// Catch and Fallback
const withFallback = z.string().catch('default value');

// Readonly
const readOnlySchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .readonly();

// Pick and Omit
const partialUser = userSchema.pick({ username: true, email: true });
const withoutEmail = userSchema.omit({ email: true });

// Partial and Required
const partialUserSchema = userSchema.partial();
const requiredUserSchema = userSchema.required();

// Extract and Exclude
const userRole = z.enum(['admin', 'user', 'guest']);
type AdminRole = z.infer<typeof userRole>;
const adminRole = userRole.extract(['admin']);
const nonAdminRole = userRole.exclude(['admin']);

// Custom Validation
const customValidation = z.string().superRefine((val, ctx) => {
  if (val.length < 5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'String must be at least 5 characters',
    });
  }
});

// Async Validation
const asyncValidation = z.string().refine(
  async (val) => {
    // Some async check
    return await someAsyncCheck(val);
  },
  { message: 'Async validation failed' }
);

// Pipeline
const pipedSchema = z
  .string()
  .transform((val) => val.trim())
  .pipe(z.string().min(5));

// Native Enum
enum Fruit {
  Apple = 'apple',
  Banana = 'banana',
  Orange = 'orange',
}
const fruitSchema = z.nativeEnum(Fruit);

// Custom Schema
const customSchema = z.custom<`${string}@${string}.${string}`>(
  (val) => typeof val === 'string' && /^[^@]+@[^@]+\.[^@]+$/.test(val)
);

// Recursive Types
type Category = {
  name: string;
  subcategories: Category[];
};

const categorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    name: z.string(),
    subcategories: z.array(categorySchema),
  })
);

// Function Schemas
const functionWithSchema = z
  .function()
  .args(z.string(), z.number())
  .returns(z.boolean())
  .describe('A function that takes a string and a number and returns a boolean')
  .default(() => true);

// Date Schemas
const dateRangeSchema = z
  .object({
    start: z.date(),
    end: z.date(),
  })
  .refine((data) => data.start <= data.end, {
    message: 'End date must be after start date',
    path: ['end'],
  });

// Branded Types with Metadata
const brandedWithMeta = z
  .string()
  .brand('BrandedString')
  .describe('A branded string with metadata')
  .meta({ author: 'API Team' });

// Union with Discriminated Union
const responseSchema = z.union([
  z.object({
    status: z.literal('success'),
    data: z.any(),
  }),
  z.object({
    status: z.literal('error'),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  }),
]);

// Complex Nested Schema
const complexSchema = z
  .object({
    id: z.string().uuid(),
    user: z.object({
      name: z.string(),
      email: z.string().email(),
      preferences: z.object({
        theme: z.enum(['light', 'dark', 'system']).default('system'),
        notifications: z.boolean().default(true),
      }),
    }),
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number().positive(),
        quantity: z.number().int().min(1),
        tags: z.array(z.string()).min(1),
        metadata: z.record(z.union([z.string(), z.number(), z.boolean()])),
      })
    ),
    createdAt: z.date(),
    updatedAt: z.date().optional(),
    status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
    metadata: z.record(z.any()).optional(),
  })
  .refine((data) => (data.updatedAt ? data.updatedAt >= data.createdAt : true), {
    message: 'updatedAt must be after createdAt',
    path: ['updatedAt'],
  });
