/** biome-ignore-all assist/source/organizeImports: off */
import { z } from "zod";
import * as v from "valibot";

// Basic Types
export const stringSchema = z.string();

export const numberSchema = z.number();

export const bigintSchema = z.bigint();

export const booleanSchema = z.boolean();

export const dateSchema = z.date();

export const symbolSchema = z.symbol();

export const undefinedSchema = z.undefined();

export const nullSchema = z.null();

export const voidSchema = z.void();

export const anySchema = z.any();

export const unknownSchema = z.unknown();

export const neverSchema = z.never();

// Literal and Primitive Constraints
export const literalSchema = z.literal("hello");

export const stringWithConstraints = z
	.string()
	.min(5)
	.max(100)
	.length(10)
	.email()
	.url()
	.uuid()
	.cuid()
	.cuid2();

export const stringWithConstraintsMin5 = z.string().min(5);

export const stringWithConstraintsMax100 = z.string().max(100);

export const stringWithConstraintsLength10 = z.string().length(10);

export const stringWithConstraintsEmail = z.email();

export const stringWithConstraintsUrl = z.url();

export const stringWithConstraintsUuid = z.uuid();

export const stringWithConstraintsCuid = z.cuid();

export const stringWithConstraintsCuid2 = z.cuid2();

export const numberWithConstraints = z
	.number()
	.min(5)
	.max(100)
	.int()
	.positive()
	.nonnegative()
	.negative()
	.nonpositive()
	.multipleOf(5);

export const numberWithConstraintsMin5 = z.number().min(5);

export const numberWithConstraintsMax100 = z.number().max(100);

export const numberWithConstraintsInt = z.number().int();

export const numberWithConstraintsPositive = z.number().positive();

export const numberWithConstraintsNonnegative = z.number().nonnegative();

export const numberWithConstraintsNegative = z.number().negative();

export const numberWithConstraintsNonpositive = z.number().nonpositive();

export const numberWithConstraintsMultipleOf5 = z.number().multipleOf(5);

export const bigintWithConstraints = z
	.bigint()
	.min(5n)
	.max(100n)
	.positive()
	.nonnegative()
	.negative()
	.nonpositive()
	.multipleOf(5n);

export const dateWithConstraints = z
	.date()
	.min(new Date("2020-01-01"))
	.max(new Date("2030-01-01"));

// Object Schemas
export const userSchema = z.object({
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
	role: z.enum(["admin", "user", "guest"]),
	metadata: z.record(z.string(), z.union([z.string(), z.number()])),
	createdAt: z.date(),
	updatedAt: z.date().optional(),
	isActive: z.boolean().default(true),
});

// Array Schemas
export const stringArray = z.array(z.string());

export const numberArray = z.array(z.number());

export const objectArray = z.array(
	z.object({ name: z.string(), value: z.number() }),
);

export const minMaxArray = z.array(z.string()).min(2).max(10).length(5);

// Tuple Schemas
export const point2D = z.tuple([z.number(), z.number()]);

export const point3D = z.tuple([z.number(), z.number(), z.number()]);

export const mixedTuple = z.tuple([z.string(), z.number(), z.boolean()]);

export const restTuple = z.tuple([z.string()]).rest(z.number());

// Union and Intersection Types
export const stringOrNumber = z.union([z.string(), z.number()]);

export const stringOrNumberLiteral = z.union([
	z.literal("yes"),
	z.literal("no"),
	z.literal(1),
	z.literal(2),
]);

export const combinedSchema = z.intersection(
	z.object({ name: z.string() }),
	z.object({ age: z.number() }),
);

// Discriminated Unions
export const dogSchema = z.object({
	type: z.literal("dog"),
	bark: z.boolean(),
	breed: z.enum(["labrador", "bulldog", "poodle"]),
});

export const catSchema = z.object({
	type: z.literal("cat"),
	meow: z.boolean(),
	lives: z.number().int().min(0).max(9),
});

export const animalSchema = z.discriminatedUnion("type", [
	dogSchema,
	catSchema,
]);

// Record Types
export const stringRecord = z.record(z.string(), z.string());

export const numberRecord = z.record(z.string(), z.number());

export const objectRecord = z.record(
	z.string(),
	z.object({ value: z.string() }),
);

export const keyRestrictedRecord = z.record(z.string(), z.number());

// Map and Set
export const mapSchema = z.map(z.string(), z.number());

export const setSchema = z.set(z.string());

// Promise and Function
export const promiseSchema = z.promise(z.string());

export const functionSchema = z
	.function({ input: [z.number(), z.string()], output: z.boolean() })
	.implement((num, str) => num > 0 && str.length > 0);

// Defaults and Nullish
export const withDefault = z.string().default("hello");

export const nullishSchema = z.string().nullish();

export const optionalSchema = z.string().optional();

export const nullableSchema = z.string().nullable();

// Transform and Refinements
export const trimmedString = z.string().transform((str) => str.trim());

export const positiveEvenNumber = z
	.number()
	.int()
	.positive()
	.refine((n: number): boolean => {
		return n % 2 === 0;
	}, "Number must be even");

// Branded Types
export const emailSchema = z.string().email().brand("Email");

export type Email = z.infer<typeof emailSchema>;

// Custom Error Messages
export const withCustomError = z
	.string({
		error: "Must be a string",
	})
	.min(5, { message: "Must be at least 5 characters" });

// Effects (preprocess, postprocess)
export const preprocessed = z.preprocess((val: unknown): unknown => {
	return typeof val === "string" ? val.toLowerCase() : val;
}, z.string());

// Catch and Fallback
export const withFallback = z.string().catch("default value");

// Readonly
export const readOnlySchema = z
	.object({
		id: z.string(),
		name: z.string(),
	})
	.readonly();

// Pick and Omit
export const partialUser = userSchema.pick({ username: true, email: true });
export const withoutEmail = userSchema.omit({ email: true });

// Partial and Required
export const partialUserSchema = userSchema.partial();
export const requiredUserSchema = userSchema.required();

// Extract and Exclude
export const userRole = z.enum(["admin", "user", "guest"]);
export type AdminRole = z.infer<typeof userRole>;
export const adminRole = userRole.extract(["admin"]);
export const nonAdminRole = userRole.exclude(["admin"]);

// Custom Validation
export const customValidation = z.string().superRefine((val, ctx): void => {
	if (val.length < 5) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "String must be at least 5 characters",
		});
	}
});

// Async Validation
export const asyncValidation = z.string().refine(
	async (val: string): Promise<boolean> => {
		// Some async check
		// @ts-expect-error
		return await someAsyncCheck(val);
	},
	{ message: "Async validation failed" },
);

// Pipeline
export const pipedSchema = z
	.string()
	.transform((val) => val.trim())
	.pipe(z.string().min(5));

// Native Enum
enum Fruit {
	Apple = "apple",
	Banana = "banana",
	Orange = "orange",
}
export const fruitSchema = z.nativeEnum(Fruit);

// Custom Schema
export const customSchema = z.custom<`${string}@${string}.${string}`>(
	(val: unknown): boolean => {
		return typeof val === "string" && /^[^@]+@[^@]+\.[^@]+$/.test(val);
	},
);

// Recursive Types
export type Category = {
	name: string;
	subcategories: Category[];
};

export const categorySchema: z.ZodType<Category> = z.lazy(() => {
	return z.object({
		name: z.string(),
		subcategories: z.array(categorySchema),
	});
});

// Function Schemas
export const functionWithSchema = z
	.function({ input: [z.string(), z.number()], output: z.boolean() })
	.implement((str: string, num: number): boolean => {
		return str.length > 0 && num >= 0;
	});

// Date Schemas
export const dateRangeSchema = z
	.object({
		start: z.date(),
		end: z.date(),
	})
	.refine(
		(data: { start: Date; end: Date }) => {
			return data.start <= data.end;
		},
		{
			message: "End date must be after start date",
			path: ["end"],
		},
	);

// Branded Types with Metadata
export const brandedWithMeta = z
	.string()
	.brand("BrandedString")
	.describe("A branded string with metadata")
	.meta({ author: "API Team" });

// Union with Discriminated Union
export const responseSchema = z.union([
	z.object({
		status: z.literal("success"),
		data: z.any(),
	}),
	z.object({
		status: z.literal("error"),
		error: z.object({
			code: z.string(),
			message: z.string(),
		}),
	}),
]);

// Complex Nested Schema
export const complexSchema = z
	.object({
		id: z.string().uuid(),
		user: z.object({
			name: z.string(),
			email: z.string().email(),
			preferences: z.object({
				theme: z.enum(["light", "dark", "system"]).default("system"),
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
				metadata: z.record(
					z.string(),
					z.union([z.string(), z.number(), z.boolean()]),
				),
			}),
		),
		createdAt: z.date(),
		updatedAt: z.date().optional(),
		status: z.enum(["pending", "processing", "completed", "cancelled"]),
		metadata: z.record(z.string(), z.any()).optional(),
	})
	.refine(
		(data: { updatedAt?: Date | undefined; createdAt: Date }): boolean => {
			return data.updatedAt ? data.updatedAt >= data.createdAt : true;
		},
		{
			message: "updatedAt must be after createdAt",
			path: ["updatedAt"],
		},
	);

// String boundaries and inclusion
export const stringBoundaries = z
	.string()
	.startsWith("Hello")
	.endsWith("!")
	.includes("lo")
	.nonempty();

// Number comparators (gt/gte/lt/lte)
export const numberComparators = z.number().gt(0).gte(1).lt(10).lte(9);

// Array nonempty
export const nonEmptyStringArray = z.array(z.string()).nonempty();

// Object modes: strict/passthrough/strip/catchall
export const baseObject = z.object({ a: z.string(), b: z.number().optional() });

export const strictObject = baseObject.strict();

export const passthroughObject = baseObject.passthrough();

export const stripObject = baseObject.strip();

export const catchallObject = baseObject.catchall(z.number());

// parse/safeParse on base and chained schemas
export const parsedFromBase = stringSchema.parse("abc");

export const safeParsedFromChain =
	stringWithConstraints.safeParse("abcdefghij");

export const parsedUser = userSchema.parse({
	username: "john",
	age: 30,
	email: "john@example.com",
});

// Coerce APIs
export const coerceNumber = z.coerce.number();

export const coerceString = z.coerce.string();

export const coerceBoolean = z.coerce.boolean();

export const coerceDate = z.coerce.date();

// Additional message normalization examples
export const stringWithMessage = z.string().max(5, { message: "Too long" });

export const stringInvalidTypeMsg = z.string({ message: "Expected string" });
