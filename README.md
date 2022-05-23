# unional/.github

[Default Community Health Files](https://docs.github.com/en/github/building-a-strong-community/creating-a-default-community-health-file)

[Starter Workflows](https://docs.github.com/en/actions/learn-github-actions/creating-starter-workflows-for-your-organization)

Use the workflow templates to create workflows for each repository.

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
