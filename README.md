# unional/.github

[Default Community Health Files](https://docs.github.com/en/github/building-a-strong-community/creating-a-default-community-health-file)

[Starter Workflows](https://docs.github.com/en/actions/learn-github-actions/creating-starter-workflows-for-your-organization)

Use the workflow templates to create workflows for each repository.

## Versioning

### Which ref to pin

**Pin a tag, never `@main`.** For the changesets release workflows, which tag
depends on one thing — the major of `@changesets/cli` in your repo:

| Your `@changesets/cli` | Pin | Because |
| --- | --- | --- |
| v2 | `@v1` | `*-release-changeset*.yml` uses `changesets/action@v1` |
| v3 | `@v2` | `*-release-changeset*.yml` uses `changesets/action@v2` |

```yaml
jobs:
  release:
    uses: unional/.github/.github/workflows/pnpm-release-changeset.yml@v1
```

If you do not use those workflows, either tag works — every other workflow is
byte-identical across the two.

`v1` and `v2` are *moving* tags, re-pointed forward on each backward-compatible
release within their line and never moved across a breaking change. Pin an exact
version (`@v1.0.0`) if you want a ref that never moves, and accept bumping it by
hand.

Do **not** pin `@main`: every consumer on it takes every change the instant it
merges, including breaking ones nobody reviewed.

### npm authentication

The changesets release workflows no longer take an `NPM_TOKEN`. They publish with
npm trusted publishing (OIDC), which issues short-lived credentials and emits
provenance attestations.

**Before your next release, register a trusted publisher** at
`npmjs.com/package/<name>/access` for every package the repo publishes, naming
this repo and your *caller* workflow's filename (`release.yml`) — not the
reusable workflow's. Until you do, the publish step fails with a 401.

Two exceptions on this line, both flagged in their own headers:
`yarn-release-changeset-monorepo.yml` and `yarn-release-changeset.yml` publish
through Yarn Berry's own publisher, which has no OIDC support, so they cannot
authenticate at all. `@changesets/cli` v3 routes yarn repos to Berry's publisher
rather than the npm CLI — which is why `yarn-release-changeset.yml` is fine on
`@v1` and broken here. Yarn Berry consumers should stay on `@v1`.

### Why there are two lines

`changesets/action` and `@changesets/cli` are strictly paired, and the action
enforces it at runtime:

| `changesets/action` | works with | inputs |
| --- | --- | --- |
| `v1` | `@changesets/cli` v2 | `version`, `publish`, `commit` |
| `v2` | `@changesets/cli` v3 | `version-script`, `publish-script`, `commit-message` |

Run v2 against CLI v2 and it aborts: *"Changesets CLI v2 is not supported; use
Changesets action v1 instead."* No single workflow serves both.

The enforcement is one-directional. `changesets/action@v2` refuses to run
against CLI v2 outright. `changesets/action@v1` carries no such check — it reads
the consumer's CLI major only to pick between the `bump` and `version`
subcommands — so `@v1` is the conservative pin when you are unsure.

Consumers are split across both majors, so the lines run in parallel rather than
one being a deadline. Verified against each consumer's `package.json` on
2026-08-29:

| `@changesets/cli` | Consumers of `pnpm-release-changeset.yml` | Pin |
| --- | --- | --- |
| v3 | `async-fp` `^3.0.0`, `iso-error` `3.0.1`, `monorepo-template` `^3.0.0`, `path-equal` `^3.0.0`, `stable-context` `^3.0.0`, `standard-log` `^3.0.0` | `@v2` |
| v2 | `never-fail` `^2.25.0`, `type-plus` `^2.29.8` | `@v1` |
| none declared | `eslint-plugin-harmony` | — |

`eslint-plugin-harmony` declares no `@changesets/cli` at all; it needs a look of
its own before it is put on a line.

**You are reading the `v2.x` branch — the v2 line.** The v1 line lives on `main`. A fix that
applies to both is made on `main` and cherry-picked. When the last consumer
reaches CLI v3, `v2.x` merges down and the v1 line retires.

### Why this exists

`.mergify.yml` auto-merges Renovate PRs, so bumps to the actions these workflows
call land on `main` with no human in the loop — and under `@main` they reach
every consumer immediately. That is not hypothetical: `changesets/action` v1 → v2
was auto-merged and broke the release path of every changesets consumer at once.

Two things stop a repeat. Renovate now labels its PRs by update type and Mergify
auto-merges only `safe-update`, so a major waits for a review. And tagging means
that even once a major is accepted, it lands on `main` and reaches consumers only
when someone cuts a release.

Renovate is additionally held to `changesets/action` v1 on `main`, because on
this branch that pin is a line assignment rather than a version to keep current.
The v2 line lives on `v2.x`, which Renovate does not touch.

### Cutting a release

```sh
git checkout main && git pull
git tag -a v1.0.0 -m "v1.0.0" && git push origin v1.0.0
gh release create v1.0.0 --generate-notes
git tag -f v1 v1.0.0 && git push -f origin v1
```

Same from `v2.x` with `v2.0.0` / `v2`. Forgetting the last step makes the release
invisible to everyone pinning the alias.

[`.gitignore` for yarn](https://yarnpkg.com/getting-started/qa#which-files-should-be-gitignored)

## migrate to yarn PnP

<https://yarnpkg.com/getting-started/migration>

```sh
yarn set version stable

# remove this from `.yarnrc.yml`
nodeLinker: node-modules

# update `.gitignore`
# yarn (for non-zero-install)
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions

# install plugins
yarn plugin import interactive-tools
yarn dlx @yarnpkg/sdks vscode
```

Select to use local version of TypeScript language server.
`.vscode/settings.json` example:

```json
{
  "eslint.nodePath": ".yarn/sdks",
  "json.schemas": [
    {
      "fileMatch": [
        "tsconfig.*.json"
      ],
      "url": "http://json.schemastore.org/tsconfig"
    }
  ],
  "search.exclude": {
    "**/.pnp.*": true,
    "**/.yarn": true
  },
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.tsdk": ".yarn/sdks/typescript/lib"
}
```
