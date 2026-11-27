# Security policy

Cauldron is a small, unsigned Mac app maintained by one person. If you find something that worries you, here's how to tell us about it.

## Supported versions

Only the **latest release** is supported. If you're on an older build, update first — downloads are on [GitHub Releases](https://github.com/cre8tivoz/cauldron/releases). Your version is in the About window.

## What's in scope

- **The app** — the Electron shell, the editor, and the actions it can run.
- **The sites it generates** — the plain Astro files Cauldron creates or edits in your own folder.
- **The local preview server** — the sandboxed preview that renders a site on your Mac.
- **Agent key storage** — the API keys you add under Your AI key, encrypted with the macOS keychain.

Your own machine, the AI provider you choose and any host you deploy to are outside this project — take those up with their owners.

## Don't report vulnerabilities in public issues

A public issue gives everyone the details before there's a fix. Please don't open a public issue for a security problem, and don't paste a proof-of-concept into a comment or pull request.

## How to report privately

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability** to open a private security advisory.
3. Describe what you found, how you found it and how to reproduce it.

The advisory goes straight to the maintainer and stays private.

If you can't see **Report a vulnerability**, or you'd rather not use GitHub's advisory flow, contact the maintainer through GitHub at **[@cre8tivoz](https://github.com/cre8tivoz)** and say only that you have a security report — don't put the details in a public issue, a pull request or a direct message thread.

## What to expect

This is a one-person project, so this is best effort. You'll usually hear back within a week, though I can't promise that every time. If the problem's confirmed, the fix ships in the **next release**, with a note about it in that release.
