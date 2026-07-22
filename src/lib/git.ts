import { type SimpleGit, simpleGit } from "simple-git";

export type Commit = {
	sha: string;
	message: string;
};

/**
 * Directory to run git commands in.
 * Prefer REPO_PATH, then GITHUB_WORKSPACE (set by GitHub-hosted runners), then cwd.
 * This matters because these scripts are typically invoked from a `_tools/` checkout,
 * but the tags/commits we care about live in the caller repo's checkout.
 */
function resolveRepoPath(): string {
	return process.env.REPO_PATH || process.env.GITHUB_WORKSPACE || process.cwd();
}

/**
 * Returns first-parent commits in the range `previousTag..newTag`.
 * If `previousTag` is undefined/empty, returns every commit reachable from `newTag`.
 * Runs `git fetch --tags --force` first so tag refs are up to date in CI.
 */
export async function getCommitsInRange(
	previousTag: string | undefined,
	newTag: string,
): Promise<Commit[]> {
	const git: SimpleGit = simpleGit(resolveRepoPath());
	await git.fetch(["--tags", "--force"]);

	const range = previousTag && previousTag.length > 0 ? `${previousTag}..${newTag}` : newTag;

	const raw = await git.raw(["log", range, "--first-parent", "--pretty=format:%H%x09%s"]);

	if (!raw.trim()) return [];

	return raw
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map<Commit>((line) => {
			const [sha, ...rest] = line.split("\t");
			return {
				sha: sha ?? "",
				message: rest.join("\t"),
			};
		});
}
