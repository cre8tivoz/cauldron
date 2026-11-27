# Releasing Cauldron

Cauldron ships as an unsigned Apple Silicon zip attached to a GitHub release. There is no Apple Developer certificate, so signing and notarisation are not available; that is a settled decision, not something to work around in a release PR. The tag is what runs the macOS CI job, so the order is: land the version bump on `main`, build and verify the zip, then create the release that carries the tag.

Before you start:

- Work from a merged `main` commit with CI green. A release from an unmerged branch names a commit other people cannot fetch.
- Use a Mac for `npm run make`. The only maker configured is the zip maker for `darwin` (`forge.config.mts`).
- Keep the version bump, any README or screenshot changes, and the release notes together as one release story. Don't fold unrelated work into the bump.
- Check the Node version in `.nvmrc` and use npm 12, as the repo requires.

## The version has to move in three places

| Place                      | What it controls                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `package.json` (`version`) | The npm and Electron app version.                                                                               |
| `package-lock.json`        | The lockfile version, currently in both the top-level `version` and `packages[""].version`.                     |
| `README.md`                | The download filename `Cauldron-darwin-arm64-<version>.zip` in the Download section and the first-launch steps. |

Bump with npm so the manifest and lockfile move together:

```bash
npm version <X.Y.Z> --no-git-tag-version
```

That is an npm command, not a repo script, and the flag stops npm making a Git tag. Then update the README zip names and search the tree for the old version. Historical notes can keep their old numbers; anything claiming to describe the current download cannot.

The guard is the release-version test in `scripts/test-core.mjs`. It derives the expected name from `package.json` — `Cauldron-darwin-arm64-${pkg.version}.zip` — and also checks that the README still says "Open Anyway". It runs inside `npm test`, so `npm run check` fails on a bump that forgets the README. There is no test comparing `package-lock.json` to `package.json`; check both lockfile fields by eye after the bump.

## Gate, then build the artifact

Use the Node version in `.nvmrc` (26.13.0). Set `NODE_ENV=development` for the gate and `NODE_ENV=production` for the build you attach to the release:

```bash
NODE_ENV=development npm run check
NODE_ENV=production npm run make
```

`npm run make` is `electron-forge make` with the zip maker for `darwin`, and produces:

```text
out/make/zip/darwin/arm64/Cauldron-darwin-arm64-<version>.zip
```

The check is not optional. `npm run package` and `npm run make` strip types through electron-vite without checking them, so a build can exit 0 with type errors in it. A development-env build also carries dev React and StrictMode double-runs; it is not the bundle to publish.

## Verify the zip before publishing

Check the artifact itself, not just `out/`:

```bash
Z=out/make/zip/darwin/arm64/Cauldron-darwin-arm64-<version>.zip
shasum -a 256 "$Z"
stat -f%z "$Z"
rm -rf /tmp/unzipped && mkdir -p /tmp/unzipped
ditto -x -k "$Z" /tmp/unzipped
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' /tmp/unzipped/Cauldron.app/Contents/Info.plist
strings /tmp/unzipped/Cauldron.app/Contents/Resources/app.asar | grep -c 'Each child in a list should have a unique'
CAULDRON_SMOKE=1 /tmp/unzipped/Cauldron.app/Contents/MacOS/Cauldron
```

The bundle version must match the bump. The dev-React string count must be 0; a count of 1 or more means the build was made with `NODE_ENV=development`. The last command is the same launch mode CI uses: it should print `SMOKE PASS: window created and interface rendered` and exit 0. That proves the shipped bytes can open a window, not that every feature works.

`npm run smoke` is a separate check: it repackages the app from source before launching it, so it is not a launch of the downloaded zip. Run the unzipped executable directly as above when checking the release artifact. If you install the app locally, install from the unzipped copy and archive the previous `/Applications/Cauldron.app` first.

The previous release used a size and SHA-256 in its notes, so keep that step. For v0.150.0 the asset was `122900626` bytes with SHA-256 `70afac71266d770a51054d2dab307baf7669e9294f3e8cda922ce098ca8d6de3`; those numbers belong to that zip, not to the one you are about to publish. Get the new ones from `shasum -a 256` and `stat -f%z`, or from GitHub with `gh release view v0.150.0 --repo cre8tivoz/cauldron --json assets`.

## Create the release and watch the tag build

The release is the unsigned Mac build, so the title convention is `Cauldron v<X.Y.Z> (Unsigned Mac Build)`. Attach the zip you just verified and create the release on the merged `main` commit:

```bash
gh release create v<X.Y.Z> "$Z" --repo cre8tivoz/cauldron \
  --target "$(git rev-parse HEAD)" \
  --title "Cauldron v<X.Y.Z> (Unsigned Mac Build)" \
  --notes-file notes.md
```

Release notes follow the v0.150.0 shape: the exact zip name, byte size and SHA-256; the unsigned first-launch steps (`Open Anyway` in System Settings → Privacy & Security); a short "what's new since <previous tag>" list keyed to real ticket outcomes; a verification list naming the commit and the checks actually run on it; a "not proven yet" list; and any known limitation a person will hit on first open. Do not list a check you did not run.

`gh release create` makes the tag on the remote if it does not exist, and that tag is the CI trigger. If you created the tag locally, push it (`git push origin v<X.Y.Z>`). The local checkout will not see a remote-created tag until `git fetch --tags`, so don't read a failed `git rev-parse v<X.Y.Z>` as "no tag". Confirm the tag commit is the `main` SHA you released from.

Watch the workflow:

```bash
gh run list --repo cre8tivoz/cauldron --limit 3 --json databaseId,event,headBranch,status,conclusion
gh run view <id> --repo cre8tivoz/cauldron --json status,conclusion,jobs
```

The `check` job runs on the tag as well as on pull requests; `mac-build` waits for it, runs `npm run make`, unzips the archive into the runner's temp folder and launches it with `CAULDRON_SMOKE=1`. It uploads no Actions artifacts. Poll the run's own status, not the word "completed" in the per-job output — the Linux job finishes first and can end such a poll while `mac-build` is still running. A branch push without a `v*` tag skips `mac-build`; that is expected.

Before calling the release done, confirm the attached asset's name, size and SHA-256 match the zip you verified, and that the release notes say what was checked on that exact commit.

## Failure signals

| Signal                                            | Meaning                                                          | Action                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| The release-version test fails after a bump       | The README no longer names the zip that `package.json` declares. | Update the README filename. Don't pin a fixed number into the test. |
| `CFBundleShortVersionString` is the old version   | The zip was built from the wrong bump.                           | Rebuild from the merged commit with the new version.                |
| Dev-React string count is 1 or more               | The bundle was built with `NODE_ENV=development`.                | Rebuild with `NODE_ENV=production` and verify the zip again.        |
| Unzipped launch exits non-zero                    | That artifact cannot open a window.                              | Don't publish it. Read the app output printed by the launch.        |
| `mac-build` reports `skipped`                     | The event was a branch push, not a `v*` tag or manual dispatch.  | Push the release tag or run the workflow by hand.                   |
| `git rev-parse v<X.Y.Z>` fails just after release | The tag exists on the remote but not in your checkout.           | Run `git fetch --tags`, then compare the tag commit to `main`.      |
