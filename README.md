# aichat-release-workflow

Reusable GitHub Actions workflow + TypeScript tooling that automates AIChat
releases across every product repo (backend, frontend, ai-backend, …):

1. Compute the next semver tag from Conventional Commits and push it.
2. Ask OpenAI to summarise the commits into a Markdown changelog.
3. Publish a GitHub Release with those notes.
4. Announce the release in Slack.

---

## Requirements pinned by this repo

- **Node.js `24.17.0`** — pinned in [.nvmrc](.nvmrc), [.node-version](.node-version), and every `actions/setup-node` step.
- **Package manager: `pnpm@9`** — declared via `packageManager` in [package.json](package.json) and set up with `pnpm/action-setup@v4`.
- **TypeScript**, strict mode, ESM (`NodeNext`).
- **Compiler: [`tsup`](https://tsup.egoist.dev/)** — scripts are compiled to `dist/` and executed with plain `node`.

---

## Consuming the workflow

Add this file to any downstream repo (e.g. `aichat-client-portal-backend/.github/workflows/release.yml`):

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    uses: aichatsg/aichat-release-workflow/.github/workflows/release.yml@v1
    with:
      product_name: Backend
    secrets:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

Or, if your org policy allows it:

```yaml
secrets: inherit
```

### Minimum caller permissions

The reusable workflow requests `contents: write` on the jobs that need it, but
the caller must not restrict `GITHUB_TOKEN` below that. If you set an explicit
`permissions:` block on the caller job, include at least:

```yaml
permissions:
  contents: write
```

---

## Inputs

| Name             | Type    | Required | Default                            | Description                                                                       |
| ---------------- | ------- | -------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| `product_name`   | string  | yes      | —                                  | Human name shown in the Slack message (e.g. `Backend`, `Frontend`, `AI Backend`). |
| `release_branch` | string  | no       | `main`                             | Branch that produces releases.                                                    |
| `default_bump`   | string  | no       | `patch`                            | Fallback bump when no conventional-commit type matches.                           |
| `tag_prefix`     | string  | no       | `v`                                | Tag prefix.                                                                       |
| `node_version`   | string  | no       | `24.17.0`                          | Overridable but defaulted to the pinned version.                                  |
| `openai_model`   | string  | no       | `gpt-4`                            | OpenAI model used for summarisation.                                              |
| `slack_enabled`  | boolean | no       | `true`                             | Skip Slack notification when false.                                               |
| `tools_repo`     | string  | no       | `aichatsg/aichat-release-workflow` | Repo hosting these scripts.                                                       |
| `tools_ref`      | string  | no       | `v1`                               | Ref of this repo to check out.                                                    |

## Secrets

| Name                | Required                   | Description                 |
| ------------------- | -------------------------- | --------------------------- |
| `OPENAI_API_KEY`    | yes                        | Used to summarise commits.  |
| `SLACK_WEBHOOK_URL` | when `slack_enabled: true` | Slack Incoming Webhook URL. |

`GITHUB_TOKEN` is auto-provided by GitHub to reusable workflows.

---

## Local development

```bash
nvm use          # picks 24.17.0
pnpm install
pnpm type-check
pnpm lint
pnpm build
```

Run a script against a real repo checkout:

```bash
PREVIOUS_TAG=v1.2.3 \
NEW_TAG=v1.2.4 \
OPENAI_API_KEY=sk-... \
OPENAI_MODEL=gpt-4 \
RELEASE_NOTES_PATH=./release-notes.md \
pnpm run:summarize
```

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/... \
RELEASE_TAG=v1.2.4 \
RELEASE_URL=https://github.com/aichatsg/aichatsg/releases/tag/v1.2.4 \
RELEASE_NOTES_PATH=./release-notes.md \
PRODUCT_NAME=Backend \
pnpm run:notify-slack
```

---

## Testing changes against a real caller repo

1. Open a branch here, e.g. `feat/tweak-prompt`.
2. In a caller repo, temporarily change the `uses:` line to point at that branch:
   ```yaml
   uses: aichatsg/aichat-release-workflow/.github/workflows/release.yml@feat/tweak-prompt
   ```
3. Trigger a release on that branch.
4. Once verified, merge into `main`. The [`self-release`](.github/workflows/self-release.yml)
   workflow will automatically tag a new `vX.Y.Z` from your conventional commits,
   publish a GitHub Release, and force-move the `v1` major tag so callers pinned
   to `@v1` pick up the change.

Callers should pin to `@v1` (moving) or a specific `@sha` for maximum safety.

---

## Migrating an existing repo

**Delete** from the caller repo:

- Any existing release workflow file (e.g. `.github/workflows/release.yml`).
- Any local release-notes / Slack-notification scripts (e.g. `scripts/summarize-commits.ts`, `scripts/notify-slack.ts`).
- The dependencies those scripts pulled in (openai, simple-git, @tryfabric/mack, axios, he, zod), unless used elsewhere.

**Add** to the caller repo — a single workflow file, ~15 lines:

```yaml
name: Release
on:
  push:
    branches: [main]
concurrency: ${{ github.workflow }}-${{ github.ref }}
jobs:
  release:
    uses: aichatsg/aichat-release-workflow/.github/workflows/release.yml@v1
    with:
      product_name: Backend
    secrets:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

Make sure `OPENAI_API_KEY` and `SLACK_WEBHOOK_URL` exist as repo or org secrets.

---

## Repo layout

```
.
├── .github/
│   ├── workflows/
│   │   ├── release.yml       # reusable workflow (on: workflow_call)
│   │   ├── self-release.yml  # this repo's own semver + GH Release + move v1 tag
│   │   └── ci.yml            # typecheck + lint + build on PR
│   └── dependabot.yml
├── src/
│   ├── lib/                # shared helpers
│   │   ├── env.ts
│   │   ├── git.ts
│   │   ├── openai.ts
│   │   └── slack.ts
│   └── scripts/
│       ├── summarize-commits.ts
│       └── notify-slack.ts
├── .nvmrc
├── .node-version
├── biome.json
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── tsup.config.ts
```
