# Publishing: Git, static export and one-click hosts

Publishing in Cauldron is deliberately quiet.

Nothing is committed or uploaded unless the person asks. Nothing is invented when a host does not answer.

The code is in `src/main/publishing.ts`, `src/main/index.ts`, `src/components/PublishPanel.tsx` and `src/main/quality.ts`. `README.md` describes the same promise to users. There is no ADR dedicated to publishing.

## What the app reads from Git

`repoState()` and `repoStateAsync()` run read-only Git commands in the site's folder.

A site counts as a repository only when `git rev-parse --show-toplevel` resolves to the site root itself. The panel then shows the branch, the changed files, the last commit subject, whether any remote exists, and how many local commits have not been uploaded.

Changes come from `git status --porcelain -z`. The `-z` form matters: spaces and non-ASCII names survive, and a rename is shown with its old name as well.

The remote that a push would use is not guessed from the first remote. The code checks, in order:

- `branch.<name>.pushRemote`
- `remote.pushDefault`
- `branch.<name>.remote`
- `origin`
- the only remote, when there is exactly one

Several remotes with no chosen one means no remote is selected.

A configured remote is not treated as reachable. That is only known when a push is actually tried.

## The local Git flow

The panel has three actions: Commit, Commit and push, and, when the tree is clean but commits are ahead, Upload commits.

All three call `publishAsync()` with a `push` flag. The person types the commit message. There is no generated message.

Before anything is written, `checkPublishPreconditions()` refuses to proceed when:

- the folder is not a Git repository;
- edits are still typed in buffers;
- recovery drafts still exist;
- nothing has changed and nothing is unpushed;
- there are changes but no commit message.

Git runs with `GIT_TERMINAL_PROMPT=0`. It cannot stop waiting for an interactive password prompt.

With changes, the app runs `git add -A`, then `git commit -m <message>`.

A push happens only if the person asked for it and a remote is configured. An existing upstream gets a plain `git push`. Otherwise the app runs `git push --set-upstream <remote> <branch>`.

Ordinary publishing never force-pushes. `git add -A` does stage everything in the site folder, so the changed-file list is worth reading first.

Failures stay separate from successes.

A failed stage, a failed commit, a missing remote or branch choice, and a failed push each return their own problem text. Git's output is attached as details, trimmed to a bounded tail.

A commit that succeeded followed by a failed push says so: "The commit is in place locally, but the upload failed". When the commit was older, the message says the commit was already made earlier and is still local.

`PublishResult` carries `committed` and `pushed` separately. `PublishPanel.tsx` prints the local commit line and the upload line on their own lines, then re-reads repository state so committed files do not linger in the list.

`src/main/e2e.ts` proves the split. With a nonexistent remote, one local commit is made, the panel shows "Committed 1 file(s) locally." and "upload failed" on separate lines, and an upload-only retry works once the remote is fixed.

## The static build and export path

Static export and all three hosts start with `buildSiteAsync()` in `src/main/quality.ts`.

It runs the site's own package manager with `run build`. The manager is npm, pnpm or yarn, resolved on this machine.

The output directory comes from the site's Astro config when that config is a plain, safe `outDir`. Otherwise the app falls back to `dist/` and refuses to delete the old output recursively.

A build is successful only when the exit status is zero and the output directory exists.

"Build Static Site (dist/)" returns the output path and opens that folder in Finder.

Each host deploy builds again before uploading and checks that `index.html` exists in the output. A failed build stops there with `Static build failed before <host> deployment.` and the build log. A stale `dist/` cannot be published by accident.

## The three one-click hosts

The panel offers these for any open site, Git repository or not.

Cauldron stores no host token. Each deploy inherits the person's environment and uses a CLI they have logged in with themselves.

### Cloudflare Pages

The command is `wrangler pages deploy <output> --project-name <slug> --branch main`. The app uses a resolved local `wrangler`, or `npx --no-install wrangler`. The slug comes from the site name.

A `wrangler.toml` is written only when the caller asks for it.

If Wrangler reports a missing project, the app tries `wrangler pages project create <slug> --production-branch main` and then redeploys.

Authentication is the person's `wrangler login` or a `CLOUDFLARE_API_TOKEN` already in the environment. The app does not prompt for one. Commands run with `CI=1`, colour disabled and a 120-second timeout.

### Vercel

The built output is copied into a temporary staging directory, then deployed with `vercel deploy <dir> --prod --yes`, using the resolved local CLI or `npx --no-install vercel`.

`--yes` avoids an interactive prompt. The staging directory is removed afterwards.

Authentication is the person's `vercel login` or a `VERCEL_TOKEN` in the environment. `VERCEL_TELEMETRY_DISABLED=1` is set for the child process, and the timeout is 180 seconds.

### GitHub Pages

The app first runs `gh auth status`.

It finds the target repository from the `origin` remote when that is GitHub. Otherwise it uses `gh api user` plus the site slug. It checks the repo with `gh repo view` and creates a public one if needed.

The output is copied to a temporary directory. For project sites, absolute paths in `.html` and `.css` are prefixed with the repo name. A `.nojekyll` file is added.

That directory becomes a temporary Git repository on `gh-pages`, committed as "Deploy static site to GitHub Pages", then force-pushed with `gh auth git-credential` supplying credentials. This is a deploy branch in a temporary folder, not a push to the site's own branch.

The app then checks or sets the Pages source to `gh-pages` at the root through `gh api`. An "already enabled" or 409 answer is accepted.

Authentication is the person's `gh auth login`. Temporary directories are removed in a `finally` block.

## How failures are surfaced

Each host has a classifier that reads evidence from CLI output rather than guessing.

`classifyWranglerFailure()` separates login or token errors, a missing Wrangler binary, timeouts and other exit output. `isMissingCloudflareProjectError()` is separate and drives the project-creation retry.

Vercel's classifier checks missing credentials, a missing CLI, timeouts, then a concise error line. GitHub's checks authentication, a missing `gh`, timeouts and other errors.

All three return an `isAuthError` flag. The panel turns that into a "Setup Required" note with the exact command for that host: `npx wrangler login`, `npx vercel login` or `gh auth login`, plus the matching token name where relevant.

Other failures show the problem text in the panel. The result object also carries a bounded log.

## No fake live URL

No live URL is fabricated.

`parseCloudflarePagesUrl()`, `parseVercelUrl()` and `parseGitHubPagesUrl()` extract a URL from CLI output, or from GitHub's `html_url`. No source file contains a made-up `pages.dev`, `vercel.app` or `github.io` address.

A link is rendered only when the deploy succeeded and the host actually reported a URL.

If the host did not report one, the result carries a note such as "Deployed, but Cloudflare didn't report the address — check your Cloudflare dashboard", and the panel shows the note instead of a link. A failed deploy never produces a URL or a success result.
