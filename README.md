# SKDX Code

SKDX Code is a source-available distribution of [Code OSS](https://github.com/microsoft/vscode), maintained in [SkandaDX/skdxcode](https://github.com/SkandaDX/skdxcode). It retains the upstream editor, extension API, built-in extensions, chat, agent and MCP implementations. External services and separately distributed extensions have their own availability and licensing requirements. SKDX Code is not affiliated with Microsoft.

## Baseline and upstream maintenance

This rebrand starts at `852628ef747208b70d488956a3bc98be12f9e34c` (editor `1.142.0`, distro `a0e7521b2a1e3289e4118fad155277b200aebd35`). The checkout and lockfiles define the baseline; nothing was upgraded. No separate SKDX release version has been invented.

Work is on `skdx`, tracking `origin/skdx`. Origin is `git@github.com:SkandaDX/skdxcode.git`; upstream is `https://github.com/microsoft/vscode.git`. `git ls-remote --symref origin HEAD` reports `refs/heads/skdx`. The local `origin/HEAD` still points at `origin/main`; this work does not change remote settings or history.

During future upstream merges:

1. Record the new upstream SHA separately from any SKDX release metadata and retain upstream's editor version and dependency locks.
2. Merge `product.json`, retaining new upstream fields, built-in extension metadata, and the stable SKDX installation UUIDs. Never regenerate UUIDs per build.
3. Review consumers of changed product fields. Keep the targeted executable, development-path, welcome, issue-reporter, packaging and CI changes. Update the standalone web-development version fallback to match the new editor baseline.
4. Regenerate assets if artwork changes; otherwise use the tracked assets. Run the checks and package validation below.
5. Rescan product surfaces. Classify upstream names before editing; do not globally replace `code`, `vscode` or `Microsoft`.

### Upstream review — 2026-10-23

Fetched `upstream` from `microsoft/vscode`; no upstream source changes were applied. The local baseline remains `852628ef747208b70d488956a3bc98be12f9e34c` / `1.142.0`. At the fetched snapshot, `upstream/main` is `d6e20fdc019aae0d6a9b69536a38cd3cb9bc5152`, **1,879 commits ahead**, changing 5,474 files. The latest fetched release tag is `1.143.1` (`e646868227c3e3a9e3f24277c8c7220be42c0be7`, October 22). Prefer evaluating that release tag for a stable baseline; evaluate `main` when the newer Agent Host fixes below are needed. These are different histories: the release tag does not contain these four mainline commits by ancestry, and backport equivalence has not been established.

Priority review candidates, based on the upstream diffs and commit descriptions:

| Change | Why review it |
| --- | --- |
| [MCP OAuth token isolation — `75e6bc299612`](https://github.com/microsoft/vscode/commit/75e6bc29961240c00800a33718fda8f4611e3541) | Targets credentials to the owning MCP server/session and separates static OAuth clients. Affects protocol, authentication, Copilot, Codex, and reconnect replay across 51 files. |
| [Client credential sealing — `47da279f730e`](https://github.com/microsoft/vscode/commit/47da279f730e3b4d4cafff069608bcd0668e2a66) | Seals credentials with the host key and connection challenge; handles cancellation, sign-out, and reconnect. Includes crypto build changes. |
| [Mission Control relay authentication — `bbc0dccec6b3`](https://github.com/microsoft/vscode/commit/bbc0dccec6b32528f3f019b74e545061adb2369f) | Binds recipient keys to authenticated environments and cancels stale identity requests. Review with the credential-sealing changes. |
| [Workspace Trust forwarding — `d6e526a8312f`](https://github.com/microsoft/vscode/commit/d6e526a8312f8f68835286b8277ee966f330d62a) | Passes session-scoped trust to Copilot without persisting user-wide trust. Requires the matching runtime behavior; do not copy only the flag. |
| [Electron / toolchain update — `d6e20fdc019a`](https://github.com/microsoft/vscode/commit/d6e20fdc019aae0d6a9b69536a38cd3cb9bc5152) | Main now pins Electron `43.8.3` and Node `24.22.1`, versus this checkout's Electron `43.7.7` / Node `24.18.0`. Review runtime, checksums, native dependencies, and lockfiles together. |

This is an update assessment, not a claim that these are published CVEs or that a backport has been tested. Prefer updating a complete baseline over independently copying credential/protocol patches with unreviewed dependencies. The fork and upstream modify many of the same files, especially packaging, product consumers, chat/Agent Host, and CI; resolve changes individually rather than selecting one side wholesale.

A local, **no-commit** review can preserve this checkout and apply its rebrand onto an upstream snapshot in a separate worktree:

```sh
# Run from this checkout. Inspect the untracked-file list and copy any needed
# files separately: git diff includes staged additions but excludes untracked files.
git ls-files --others --exclude-standard
backup_dir="$(mktemp -d "${TMPDIR:-/tmp}/skdx-upstream.XXXXXX")"
git diff --binary --full-index HEAD > "$backup_dir/skdx-rebrand.patch"

# Fetching updates remote-tracking references; it does not change this checkout.
git fetch upstream main --tags
git worktree add --detach ../skdxcode-upstream-review d6e20fdc019aae0d6a9b69536a38cd3cb9bc5152
git -C ../skdxcode-upstream-review apply --3way "$backup_dir/skdx-rebrand.patch"
```

Use a different unused worktree path if that path exists. Substitute `1.143.1` for the pinned main SHA to review the stable release. The apply step may report conflicts; retain the patch, resolve conflicts in the review worktree, and leave the original index and working tree intact. Preserve upstream's new product fields and version/dependency metadata while restoring SKDX identity, installation UUIDs, storage isolation, Open VSX configuration, assets, and fork CI branch filters. Do not migrate user profiles or credentials. Use the candidate baseline's `.nvmrc`, install its locked dependencies, run its relevant authentication/protocol tests plus the branding/package checks, and build/smoke-test supported platforms before adopting it. No commit, push, merge, publication, or deployment is part of this workflow.

## Identity and coexistence

`product.json` is the authority. Display names are **SKDX Code**; the executable, CLI and external URI scheme are `skdx-code`. The macOS bundle ID is `com.skdx.code`, Windows AppUserModelID is `SKDX.Code`, and Linux desktop/window identity is `com.skdx.Code` with icon `skdx-code`. Windows system/user installers have separate stable architecture-specific GUIDs, SKDX registry values, installation directories and mutex names. APPX is unconfigured: enabling that packaging path requires a legitimate `SKDX_APPX_PUBLISHER` matching the release certificate and SKDX context-menu infrastructure.

| Storage | Default location |
| --- | --- |
| Windows user data | `%APPDATA%\SKDX Code` |
| macOS user data | `~/Library/Application Support/SKDX Code` |
| Linux user data | `$XDG_CONFIG_HOME/SKDX Code`, otherwise `~/.config/SKDX Code` |
| Desktop extensions and argv | `~/.skdx-code/extensions`, `~/.skdx-code/argv.json` |
| Shared storage | `~/.skdx-code-shared` |
| Development user data | OS application-data directory plus `skdx-code-dev` |
| Development extensions | `~/.skdx-code-dev/extensions` |
| Remote server data | `~/.skdx-code-server` |

These paths follow `userDataPath.ts`, `environmentService.ts`, and the server environment. `dataFolderName` does **not** control every OS path. Logs, caches, profiles, extension metadata and credentials' encrypted payloads live under the selected user/shared-data paths. Electron safeStorage retains OS protection: Windows DPAPI, macOS Keychain and Linux's selected secret-storage backend. Separate app/bundle identity isolates its application keychain entry; OS-level account protection remains shared by design. Main IPC derives from user-data path and version. The `--user-data-dir`, `--extensions-dir`, `--shared-data-dir`, portable-mode and environment-variable overrides retain their meaning; deliberately selecting another editor's paths defeats isolation.

The packaged macOS launcher is `Contents/Resources/app/bin/skdx-code`; its Shell Command action installs `/usr/local/bin/skdx-code`. Windows/Linux launchers also use `skdx-code`. Nothing installs a global `code` command. Only `skdx-code:` is registered externally. Debian post-install adds no Microsoft package repository for SKDX Code.

No profiles, settings, extensions or credentials are migrated automatically. Use the existing profile export/import UI (`.code-profile`) or manually import reviewed settings/keybindings into SKDX Code. Reinstall extensions from Open VSX or licensed local VSIX files; exporting a profile does not grant rights to redistribute its extensions.

## Compatibility retained

The `vscode` extension API module, `vscode.d.ts`, `engines.vscode`, extension/publisher identities, command/configuration/context/language IDs, grammars, IPC protocols, serialized formats, `.vscode` project folders and `.code-workspace` files remain upstream-compatible. Internal `vscode-file`, `vscode-remote`, `vscode-webview` schemes, CSS variables, environment variables and development/build task names are intentional compatibility contracts.

Microsoft copyrights, upstream MIT license, third-party notices, built-in extension publishers and SHA256 integrity metadata remain intact. Codicons, language/file-type icons, themes, settings defaults, workflows and keybindings are retained. Upstream documentation and tutorial URLs remain useful and accurately describe their source. The onboarding VS Code keymap label describes the compatible mapping. Copilot/GitHub/Microsoft provider names describe third-party products, not SKDX ownership.

One baseline packaging inconsistency was fixed: `.moduleignore` previously removed the pinned built-in Copilot SDK that a subsequent packaging task required. Its SDK, package metadata and license are now retained; existing target-native materialization, version matching and lockfile integrity verification remain in force.

## Artwork and reproducibility

The editable wide logo and compact application mark are copied from `../skandadx/public/logo.svg` and `favicon.svg` at website commit `cdc5a88ba73ba18c5ec8591415714f4984197b4f`, and stored in `resources/skdx/`. Original SKDX artwork is attributed to SkandaDX. No Microsoft logo was recolored. The compact site mark is already designed for small sizes; desktop raster assets use fixed contrasting ink with transparent backgrounds.

```sh
npm run generate-branding
npm run check-branding
```

Generation uses Node from `.nvmrc`, Python 3 and Pillow (validated with Pillow `12.3.0`), without adding application dependencies. The small rasterizer supports this mark's polyline/translate/scale geometry and rejects unsupported transforms/elements; use a full SVG renderer if the artwork changes beyond that geometry. Tracked ICO/ICNS contain multiple resolutions; Linux/PWA PNGs, favicon, Windows tiles and installer BMPs are generated alongside light/dark/high-contrast workbench SVGs. Installer BMPs retain their existing dimensions and use white backgrounds.

`resources/skdx/assets.json` records SHA256 hashes of source and generated artwork, including the chat mark geometry. The existing npm Electron/gulp build paths verify it before building; ordinary builds consume committed assets and require no Python renderer. Re-running generation is idempotent with the documented toolchain. Build-native filenames such as `resources/darwin/code.icns` remain hooks, but their contents are SKDX artwork.

## Build and run

Use Node **24.18.0**, npm and the existing `package-lock.json` files. Native dependencies target Electron **43.7.7** as configured by this checkout. Follow the existing [contribution instructions](CONTRIBUTING.md), [agent instructions](AGENTS.md), [build guidance](https://github.com/microsoft/vscode/wiki/How-to-Contribute) and platform compiler prerequisites. This task reused installed dependencies; it did not run a dependency upgrade.

```sh
# New checkout only: install the existing locked dependencies.
npm ci
npm run compile
./scripts/code.sh --user-data-dir=/tmp/skdx-dev/user-data --extensions-dir=/tmp/skdx-dev/extensions --shared-data-dir=/tmp/skdx-dev/shared
./scripts/code-cli.sh --help

# Host package (executed on macOS ARM64).
npm run gulp vscode-darwin-arm64
node build/check-skdx-package.ts '../VSCode-darwin-arm64/SKDX Code.app/Contents/Resources/app'
'../VSCode-darwin-arm64/SKDX Code.app/Contents/Resources/app/bin/skdx-code' --help
```

Select an existing target for other hosts: `vscode-darwin-x64`, `vscode-win32-x64`, `vscode-win32-arm64`, `vscode-linux-x64`, `vscode-linux-arm64`, `vscode-linux-armhf`; `-min` variants retain upstream's minified pipeline. Existing web/server tasks remain available. Task names and output directories retain upstream conventions for maintenance; they do not set product identity. Outputs are under the repository's parent, e.g. `../VSCode-darwin-arm64/SKDX Code.app`. `-ci` packaging tasks require previously generated bundle/extension output and must not substitute for a fresh full build after source changes.

No signing or notarization credentials are configured. These are unsigned development artifacts. Release work still needs platform builds/smoke tests, legitimate signing/notarization credentials, any release-specific infrastructure, and a verified Debian maintainer contact (no email was invented here).

## Extension registry and external services

Open VSX is configured using its [official VS Code integration](https://github.com/eclipse-openvsx/openvsx/wiki/Using-Open-VSX-in-VS-Code). Search, item pages, resources and latest-version lookup use its documented endpoints. Microsoft Marketplace is not configured. Availability, extension licensing and fork compatibility vary. Local VSIX installation and the source-level extension-management implementation remain intact.

**Signed registry installation limitation:** this baseline does not ship `@vscode/vsce-sign`. Signed Open VSX installation therefore fails closed with “Signature verification was not executed.” The copy installed as a build dependency has terms restricting use to Microsoft products and prohibiting redistribution; it is not added to the product. Signature checks are not disabled. A legitimately licensed, fork-compatible verification solution is a release requirement for signed registry installs; meanwhile local, appropriately licensed VSIX installation uses the existing supported path.

| Service | Configuration and dependency | Status |
| --- | --- | --- |
| Application updates | No `updateUrl` or SKDX update infrastructure | Unconfigured; no Microsoft distribution feed. Implementation retained. |
| Settings Sync | No `configurationSync` endpoint | Unconfigured; local settings/profiles retained. |
| Authentication | Built-in GitHub/Microsoft providers retained; no new OAuth app IDs/secrets | Not verified. SKDX OAuth registrations need `skdx-code:` redirect/callback allowlists or an explicitly fork-compatible broker. Upstream brokers may reject the new scheme. Do not claim Microsoft affiliation or reuse restricted registrations. |
| Remote servers | Existing server builds/protocols, `skdx-code-server` / `.skdx-code-server` | Source retained; deploy/build matching servers and supply separately licensed remote extensions where required. Not exercised. |
| Remote tunnels | `skdx-code-tunnel`; no SKDX tunnel provider or licensed CLI distribution configured | Not operationally verified; needs compatible CLI, provider registration/account and service infrastructure. |
| Chat/Copilot/agents | Upstream default-agent descriptors and Copilot source/SDK retained | Local implementations ship. GitHub Copilot needs a compatible extension, account/entitlement and working provider auth. No entitlement/restriction/proposed-API bypass. |
| Other AI providers | Existing provider/SDK abstractions retained | Need their own account, key or local runtime; not configured or verified by this task. |
| MCP | Local/client/server implementation and upstream Copilot registry descriptors retained | Local functionality preserved in source; external registries/connectors need account/service support. Not exercised. |
| Voice | Existing Microsoft `voiceWsUrl` retained as a third-party service descriptor | Unverified; authenticated service support required. No invented SKDX endpoint. |
| Experiments | No experimentation endpoint added | No SKDX experiment service configured. |
| Telemetry | No instrumentation keys or collection endpoints added | No new collection; existing abstractions/extension telemetry policy retained. Extensions/providers may collect according to their own policies. |
| Crash reporting | No upload endpoint or crash credentials configured | No remote upload configured; local crash machinery retained. Company/product labels are SkandaDX/SKDX Code, with no endpoint or credentials added. |
| Webviews | Desktop local resources retained; upstream CDN template remains for externally hosted webviews | Desktop/web hosting requires applicable origin/CSP support. CDN/webserver availability not asserted. |

GitHub Actions PR, dependency-cache and CodeQL branch filters use `skdx`. Platform workflows retain the existing packaging/test architecture. Microsoft-hosted 1ES runner pools, service secrets and publishing workflows are not provisioned for this fork and were not executed or enabled. Nothing was pushed or published.

## Validation record

Host: macOS ARM64. All npm validation commands used `PATH=/Users/karthicknr/.nvm/versions/node/v24.18.0/bin:$PATH` and `NODE_OPTIONS=--openssl-config=/dev/null`; the latter avoids this host's global OpenSSL configuration and changes no project dependency.

| Exact command | Result |
| --- | --- |
| `npm run typecheck-client` before edits | Passed baseline. |
| `npm run test-build-scripts` before edits | 623/624 passed; existing `standaloneResources` test compares `/var` with `/private/var`. |
| `npm run generate-branding`; `npm run check-branding` | Passed; generated assets inspected for transparency and dimensions. |
| `npm run compile` / `npm run compile-client` | Passed after fixing the new test's required argv `_` field. Core, built-ins and Copilot compiled. |
| `npm --prefix build run typecheck` | Passed. |
| `npm run gulp vscode-darwin-arm64` | Passed after retaining the baseline Copilot SDK; final bundle rebuilt after executable-consumer changes. |
| `npm run gulp vscode-darwin-arm64-ci` | Passed repackaging checks with previously built output. |
| `npm run hygiene` | Passed after adapting the upstream gallery prohibition to Open VSX and correcting generator whitespace/header. |
| `npm run eslint -- <changed TypeScript/JavaScript files>` | Passed targeted checks; individual command targets are recorded in validation logs. |
| `npm run test-node -- --run src/vs/platform/environment/test/node/userDataPath.test.ts` | 6 passed, including the development coexistence regression. An initial incorrect selector was corrected. |
| `node --test build/lib/test/copilot.test.ts` | 24 passed, including actual stream-level SDK pruning coverage. |
| `npm run test-build-scripts` after changes | 624/625 passed; same pre-existing `/var` versus `/private/var` failure; new coverage passed. |
| `git diff --exit-code 852628ef747208b70d488956a3bc98be12f9e34c -- package-lock.json .nvmrc .npmrc src/vscode-dts src/vs/workbench/api extensions/*/package.json .vscode LICENSE.txt ThirdPartyNotices.txt` | Passed: these compatibility/build/licensing boundaries are unchanged. |
| `./scripts/code-cli.sh --help` and packaged `bin/skdx-code --help` | Correct SKDX Code/Dev name, upstream version and CLI usage. |
| Packaged CLI `--install-extension redhat.vscode-yaml` with isolated user/extensions/shared directories | Search/manifest worked; signed installation failed closed because verifier is unavailable. |
| Packaged CLI `--install-extension /tmp/skdx-yaml.vsix` in the same isolated directories | Passed using the MIT-licensed YAML extension downloaded from Open VSX. |

Native app tooling opened the packaged workbench with SKDX Code window/menu identity and Open VSX popular results. A temporary profile was created and loaded the disposable two-folder workspace. Shell-driven GUI launches encountered macOS process/LaunchServices restrictions; native UI tooling could launch the app. Do not equate the successful launch or compilation with complete functional parity.

The final checks and runtime limitations are recorded below. Windows/Linux builds/install/uninstall, x64/macOS universal/notarized packages, web/server/tunnels, authenticated services and provider callbacks require their respective environments. Do not publish this artifact as a fully validated release.

### Final checks and runtime limits

The final `vscode-darwin-arm64` build completed successfully, followed by `npm run electron` for the development runtime. `node build/check-skdx-package.ts '../VSCode-darwin-arm64/SKDX Code.app/Contents/Resources/app'` passed. macOS `CFBundleName` is `SKDX Code`, `CFBundleExecutable` is `skdx-code`, and its resource icon is `SKDX Code.icns`; `com.skdx.code` and `skdx-code:` are registered in the bundle. The executable name and native display name are deliberately separate.

Additional checks passed: `npm run valid-layers-check`, `npm run check-cyclic-dependencies`, and `npm run test-node -- --run src/vs/platform/environment/test/node/userDataPath.test.ts --run src/vs/workbench/contrib/chat/test/common/chatColors.test.ts` (19 tests). Final build-tool type checking, client compilation and targeted lint also passed. Local validation logs and the exact full lint target list are retained in `.cache/skdx-validation/` (ignored development evidence).

Verified in the packaged native workbench: SKDX welcome/onboarding labels and mark, SKDX native application menu, a temporary profile, loading both roots of `validation.code-workspace`, opening/editing/saving a TypeScript file (saved bytes checked on disk), TypeScript language status/diagnostics, and Git detection of the fixture's modified file. These checks establish these specific behaviors, not complete feature parity.

Extension validation used this exact isolated argument prefix with packaged `bin/skdx-code`:

```sh
--user-data-dir=/tmp/skdx-cli-validation/user-data --extensions-dir=/tmp/skdx-cli-validation/extensions --shared-data-dir=/tmp/skdx-cli-validation/shared
```

Operations executed were `--install-extension redhat.vscode-yaml` (signature failure described above), `--install-extension /tmp/skdx-yaml.vsix` (passed), `--list-extensions --show-versions` (listed `redhat.vscode-yaml@1.25.2026100608`), `--update-extensions` (no newer extension found), and `--uninstall-extension redhat.vscode-yaml` (passed). Open VSX popular results and HTTP detail/VSIX retrieval worked. Extension activation and disabling were not verified in a running extension host.

The existing smoke command `npm run smoketest -- --build '../VSCode-darwin-arm64/SKDX Code.app' -g 'Search|Preferences|Multi Root|Notebook|Terminal'` compiled its harness, then failed all three selected suite setup hooks (0 tests passed): shell-launched Electron aborted with macOS process/Mach-port restrictions and `kill EPERM`, including an escalated retry. Native app tooling could launch the same bundle, but later automation snapshots/input focus became inconsistent, preventing reliable completion of search, diff, terminal/tasks, debugger, settings/keybinding persistence and Markdown/webview/notebook checks. These remain unverified; attempted actions are not passes. Development CLI help passed; development GUI runtime and packaged CLI window reuse/wait/diff/goto/OS URI callbacks remain unverified. No global `code` or `skdx-code` symlink was installed or overwritten.

Remaining branding occurrences were reviewed by category: Microsoft copyrights/licenses; `vscode` API, engine, schema, IPC and serialized compatibility contracts; original VS Code session provenance; third-party extension/provider identities; and upstream documentation/tutorial links. External language packs may retain embedded upstream wording and need SKDX-specific translations. No localization keys or extension publisher identities were changed.

Release requirements remain: finish the unverified functional checks in an unrestricted desktop test environment; build/test Windows, Linux and other supported architectures; supply legitimately licensed extension signature verification; provision any SKDX update/auth/sync/tunnel/web services actually offered; and obtain valid signing/notarization identities. The artifact is unsigned, unpublished development output. No commits to this product repository, pushes, remote-default changes or deployments were made.

### Branding follow-up — 2026-10-23

The follow-up pass updates remaining first-party editor messages, built-in extension descriptions and notifications, Windows updater translations, Agent Host client/MCP labels, tool descriptions, and policy diagnostics. Localization keys, extension IDs, APIs, persisted theme names, session provenance, third-party product names and upstream documentation links remain compatible. Mission Control environment names and macOS disk-image/permission prompts now use product configuration. Sign-in pages retain the provider name while using SKDX links/text and removing embedded upstream logos.

The legacy Copilot workspace-creation command now stores `aiGeneratedWorkspaces.json` under the extension context's `globalStorageUri`, including custom user-data locations, rather than inferring a VS Code profile from the OS and app name. It preserves existing entries at that location and does not import the original editor's history. Related protocol-label expectations, system-prompt snapshots, and branding tests are updated. This follow-up does not upgrade the editor baseline or dependencies; previous packaged artifacts predate these edits and require rebuilding.

Follow-up validation: client and build-tool type checks passed; Copilot's main extension type check passed; targeted ESLint passed across 76 TypeScript/TSX files; branding asset hashes, localization-key preservation, and diff whitespace checks passed. Tests passed: 85 Mission Control/MCP/policy/bundler tests, 518 Copilot agent tests (one existing pending), six sign-in HTML tests, and 12 workspace-creation tests. Tests exposed an incomplete VS Code API shim and retained mock call history in the new storage tests; the mocks were corrected before the passing run. No browser/native UI checks, fresh application packages, cross-platform installers, or live provider sign-ins were run for this follow-up. No upstream patches were applied and the 167 pre-existing staged files remain staged; follow-up edits are unstaged. Nothing was committed, pushed, published, or deployed.
