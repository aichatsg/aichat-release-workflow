import type { ZodError, ZodTypeAny, output } from "zod";

/**
 * Parses `process.env` against the provided Zod schema. On failure, prints a
 * friendly error listing every missing/invalid key and exits with code 1.
 */
export function requireEnv<T extends ZodTypeAny>(schema: T): output<T> {
	const result = schema.safeParse(process.env);
	if (!result.success) {
		printEnvError(result.error);
		process.exit(1);
	}
	return result.data;
}

function printEnvError(error: ZodError): void {
	const lines = error.issues.map((issue) => {
		const key = issue.path.join(".") || "(root)";
		return `  - ${key}: ${issue.message}`;
	});
	console.error("Invalid or missing environment variables:");
	console.error(lines.join("\n"));
}
