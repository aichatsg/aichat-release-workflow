import OpenAI from "openai";
import type { Commit } from "./git.js";

export type SummarizeOptions = {
	apiKey: string;
	model: string;
};

const SYSTEM_PROMPT = `You are a release-notes writer for a SaaS product.
Given a list of git commit messages, produce a concise, well-structured Markdown changelog.

Most commit messages follow this format:
    <type>(<optional scope>): #<ticketid> <description>

Examples:
    feat(auth): #ABC-1234 add SSO login
    fix(api): #7421 handle empty response
    chore(deps): #NA bump axios
    refactor(env): #- rename config keys

<type> is one of:
- feat     -> new user-facing feature       -> put under "## Features"
- fix      -> bug fix                       -> put under "## Bug Fixes"
- perf     -> performance improvement       -> put under "## Improvements"
- refactor -> internal refactor             -> usually skip; include under "## Improvements" only if user-visible
- docs     -> documentation                 -> put under "## Chores"
- chore    -> tooling / deps / housekeeping -> put under "## Chores"
- build    -> build system / CI             -> put under "## Chores"
- ci       -> CI config                     -> put under "## Chores"
- style    -> formatting only               -> put under "## Chores" (merge into one bullet)
- test     -> tests only                    -> put under "## Chores" (merge into one bullet)
Any commit whose subject or body contains "BREAKING CHANGE" or a trailing "!"
(e.g. "feat!:" or "feat(api)!:") is a breaking change -> put under a "## Breaking Changes"
section that appears BEFORE all other sections.

Commits that do NOT follow this format should be classified by their meaning
(feature vs. fix vs. chore) using the same rules.

Group entries under these sections, in this order, omitting any that would be empty:

## Breaking Changes
## Features
## Improvements
## Bug Fixes
## Chores
## Tickets Resolved

Rules:
- Strip the "<type>(<scope>): #<ticketid> " prefix from each bullet; write the
  description in plain, user-facing language.
- Skip pure internal refactors unless they affect users.
- Deduplicate near-identical commits.
- Merge trivial commits (typos, formatting, dep bumps, test-only changes) into a single
  bullet under Chores.
- Do NOT include commit SHAs.
- Do NOT include ticket IDs inline in the change bullets; they belong only in the
  "## Tickets Resolved" section (see below).
- Do NOT include a top-level heading; start directly with the first section.
- If there are no meaningful changes, output the single line: "No user-facing changes."

Ticket extraction rules for the "## Tickets Resolved" section:
- Look at the "#<ticketid>" token immediately after the "<type>(<scope>):" prefix in
  every commit.
- Treat these values as NOT real tickets and ignore them entirely:
  "N", "n", "NA", "na", "N/A", "n/a", "-", "none", "None", "TBD", "tbd", or any
  empty/whitespace token. Also ignore any token shorter than 4 characters.
- Everything else (typically 4+ characters, e.g. "ABC-1234", "7421", "CU-9x8y7")
  is a real ticket ID.
- Deduplicate ticket IDs (case-insensitive).
- For each real ticket ID, output one bullet in this exact format:
      - [#<ticketid>](https://app.clickup.com/t/<ticketid>)
  where <ticketid> is used verbatim in both the label and the URL (do not lower-case,
  strip, or reformat it).
- If no real tickets are found, OMIT the "## Tickets Resolved" section entirely.`;

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
