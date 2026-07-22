import OpenAI from "openai";
import type { Commit } from "./git.js";

export type SummarizeOptions = {
	apiKey: string;
	model: string;
};

const SYSTEM_PROMPT = `You are a release-notes writer for a SaaS product.
Given a list of git commit messages, produce a concise, well-structured Markdown changelog.
Group entries under these sections (omit any section that would be empty):

## Features
## Improvements
## Bug Fixes
## Chores

Rules:
- Use plain, user-facing language. Skip internal refactors unless they affect users.
- Deduplicate near-identical commits.
- Merge trivial commits (typos, formatting) into a single bullet under Chores.
- Do NOT include commit SHAs.
- Do NOT include a top-level heading; start directly with the first section.
- If there are no meaningful changes, output the single line: "No user-facing changes."`;

function formatCommits(commits: Commit[]): string {
	return commits.map((c) => `- ${c.message}`).join("\n");
}

/**
 * Summarizes the given commits into a Markdown changelog using OpenAI Chat Completions.
 */
export async function summarizeCommits(
	commits: Commit[],
	options: SummarizeOptions,
): Promise<string> {
	if (commits.length === 0) return "";

	const client = new OpenAI({ apiKey: options.apiKey });

	const response = await client.chat.completions.create({
		model: options.model,
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{
				role: "user",
				content: `Here are the commits since the last release:\n\n${formatCommits(commits)}`,
			},
		],
	});

	const content = response.choices[0]?.message?.content ?? "";
	return content.trim();
}
