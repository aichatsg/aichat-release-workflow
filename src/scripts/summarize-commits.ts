import { writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { requireEnv } from "../lib/env.js";
import { getCommitsInRange } from "../lib/git.js";
import { summarizeCommits } from "../lib/openai.js";

const EnvSchema = z.object({
	PREVIOUS_TAG: z.string().optional(),
	NEW_TAG: z.string().min(1, "NEW_TAG is required"),
	OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
	OPENAI_MODEL: z.string().min(1).default("gpt-4"),
	RELEASE_NOTES_PATH: z.string().min(1).default("./release-notes.md"),
});

async function main(): Promise<void> {
	const env = requireEnv(EnvSchema);

	const outputPath = path.resolve(env.RELEASE_NOTES_PATH);
	const commits = await getCommitsInRange(env.PREVIOUS_TAG, env.NEW_TAG);

	if (commits.length === 0) {
		console.log(
			`No commits found in range ${env.PREVIOUS_TAG ?? "(initial)"}..${env.NEW_TAG}; writing empty release notes.`,
		);
		await writeFile(outputPath, "", "utf8");
		return;
	}

	console.log(`Summarizing ${commits.length} commit(s) with model ${env.OPENAI_MODEL}...`);
	const markdown = await summarizeCommits(commits, {
		apiKey: env.OPENAI_API_KEY,
		model: env.OPENAI_MODEL,
	});

	await writeFile(outputPath, `${markdown}\n`, "utf8");
	console.log(`Release notes written to ${outputPath}`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? (error.stack ?? error.message) : error);
	process.exit(1);
});
