// Entry point for the pnpm-publish-gate reusable workflow.
//
// Walks the workspace, gates every publishable package, writes the report to the
// job summary and to a file the workflow posts as a PR comment, and exits non-zero
// if anything was blocked.
import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FIRST_PARTY, gatePackage, parseAllowList, render } from './publish-gate.mjs'

const root = process.cwd()

// The workflow passes its `allowed-new-dependencies` input here. It extends the
// built-in first-party list; it never replaces it.
const allow = [...FIRST_PARTY, ...parseAllowList(process.env.PUBLISH_GATE_ALLOWED_DEPENDENCIES)]

// Walk for package.json rather than parsing pnpm-workspace globs: the globs vary
// per repo (apps/*, packages/*, tools/*, or a single root package) and getting
// that resolution subtly wrong would skip a package silently.
// A root `pnpm-workspace.yaml` used to be a reliable "this is a monorepo root, and
// therefore not itself publishable" marker. Since pnpm 10 the same file also carries
// settings — `allowBuilds`, `onlyBuiltDependencies`, catalogs — so single-package repos
// have one too, with no `packages:` key in it at all. Treating its mere presence as
// "skip the root" made the gate find zero packages and exit clean: assertron, unpartial
// and satisfier all gated nothing while reporting success.
//
// Deliberately not a YAML parse. This script ships with no dependencies, and a
// top-level `packages:` key is unambiguous at column 0.
function declaresWorkspacePackages(dir) {
	const f = join(dir, 'pnpm-workspace.yaml')
	if (!existsSync(f)) return false
	return /^packages:/m.test(readFileSync(f, 'utf8'))
}

function findPackages(dir, depth = 0, out = []) {
	if (depth > 3) return out
	let entries
	try {
		entries = readdirSync(dir, { withFileTypes: true })
	} catch {
		return out
	}
	if (entries.some((e) => e.isFile() && e.name === 'package.json')) {
		if (dir !== root || !declaresWorkspacePackages(dir)) out.push(dir)
	}
	for (const e of entries) {
		if (!e.isDirectory()) continue
		if (['node_modules', '.git', 'dist', '.turbo', '.changeset'].includes(e.name)) continue
		findPackages(join(dir, e.name), depth + 1, out)
	}
	return out
}

const dirs = findPackages(root)
const results = []
for (const d of dirs) {
	try {
		const r = gatePackage(d, root)
		if (r) results.push(r)
	} catch (err) {
		// A package that cannot be inspected is not a pass. Surface it as a block
		// rather than letting the gate quietly cover fewer packages than it claims.
		results.push({
			name: `${d.replace(root, '.')} (inspection failed)`,
			version: '?',
			publishedVersion: null,
			files: [],
			risky: [{ file: d.replace(root, '.'), why: String(err.message ?? err) }],
			fileDiff: null,
			depDiff: null,
			deps: {},
		})
	}
}

if (!results.length) {
	console.log('no publishable packages found; nothing to gate')
	process.exit(0)
}

const { body, failed } = render(results, { allow })
const header = `## Publish gate\n\nInspecting ${results.length} publishable package(s) against the registry.\n\n`
const out = header + body

console.log(out)
writeFileSync(join(root, 'publish-gate-report.md'), out)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, out)

process.exit(failed ? 1 : 0)
