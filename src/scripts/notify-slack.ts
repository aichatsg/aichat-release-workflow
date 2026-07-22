import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { requireEnv } from "../lib/env.js";
import { postReleaseToSlack } from "../lib/slack.js";

const EnvSchema = z.object({
	SLACK_WEBHOOK_URL: z.string().url("SLACK_WEBHOOK_URL must be a valid URL"),
	RELEASE_TAG: z.string().min(1, "RELEASE_TAG is required"),
	RELEASE_URL: z.string().url("RELEASE_URL must be a valid URL"),
	RELEASE_NOTES_PATH: z.string().min(1).default("./release-notes.md"),
	PRODUCT_NAME: z.string().min(1, "PRODUCT_NAME is required"),
});

async function readNotes(notesPath: string): Promise<string> {
	try {
		return await readFile(notesPath, "utf8");
	} catch {
		return "";
	}
}

async function main(): Promise<void> {
	const env = requireEnv(EnvSchema);

	const notes = await readNotes(path.resolve(env.RELEASE_NOTES_PATH));

	await postReleaseToSlack({
		webhookUrl: env.SLACK_WEBHOOK_URL,
		productName: env.PRODUCT_NAME,
		tag: env.RELEASE_TAG,
		url: env.RELEASE_URL,
		notes,
	});

	console.log(`Posted release ${env.RELEASE_TAG} for ${env.PRODUCT_NAME} to Slack.`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? (error.stack ?? error.message) : error);
	process.exit(1);
});
