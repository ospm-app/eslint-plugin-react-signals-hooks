// oxlint-disable no-unused-vars
/** biome-ignore-all assist/source/organizeImports: off */
/** biome-ignore-all lint/correctness/noUnusedImports: off */
import { z } from "zod";
import * as v from "valibot";

// Base messages (Zod v4-compatible)
export const baseInvalid = z.string({ message: "Not a string" });
export const baseRequired = z.string({ message: "Required" });

// String modifiers with { message }
export const strMinMsg = z.string().min(5, { message: "Too short" });
export const strMaxMsg = z.string().max(10, { message: "Too long" });
export const strLenMsg = z.string().length(3, { message: "Bad length" });
export const strEmailMsg = z.string().email({ message: "Bad email" });
export const strUrlMsg = z.string().url({ message: "Bad url" });
export const strUuidMsg = z.string().uuid({ message: "Bad uuid" });
export const strCuidMsg = z.string().cuid({ message: "Bad cuid" });
export const strCuid2Msg = z.string().cuid2({ message: "Bad cuid2" });
export const strRegexMsg = z.string().regex(/a+/, { message: "Regex fail" });
export const strStartsMsg = z.string().startsWith("a", { message: "start" });
export const strEndsMsg = z.string().endsWith("z", { message: "end" });
export const strIncludesMsg = z.string().includes("x", { message: "incl" });

// Array modifiers with { message }
export const arrNonEmptyMsg = z
	.array(z.string())
	.nonempty({ message: "empty" });

export const arrMinSizeMsg = z
	.array(z.number())
	.min(1, { message: "min size" });

export const arrMaxSizeMsg = z
	.array(z.number())
	.max(2, { message: "max size" });

export const arrLenSizeMsg = z
	.array(z.number())
	.length(3, { message: "len size" });

// Number modifiers with { message }
export const numIntMsg = z.number().int({ message: "not int" });
export const numPosMsg = z.number().positive({ message: "pos" });
export const numNegMsg = z.number().negative({ message: "neg" });
export const numNNMsg = z.number().nonnegative({ message: "nn" });
export const numNPMsg = z.number().nonpositive({ message: "np" });
export const numGtMsg = z.number().gt(0, { message: "gt" });
export const numGteMsg = z.number().gte(0, { message: "gte" });
export const numLtMsg = z.number().lt(0, { message: "lt" });
export const numLteMsg = z.number().lte(0, { message: "lte" });
export const numMulMsg = z.number().multipleOf(2, { message: "mul" });

// Parse APIs still work with messages in chain
export const parsed = z
	.string({ message: "bad" })
	.min(3, { message: "m" })
	.parse("x");
