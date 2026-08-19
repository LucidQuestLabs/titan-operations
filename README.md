# Titan Operations RC0

Local, source-aware Titan Operations review application governed by the accepted RC0 implementation manifest.

The implementation preserves immutable workbook evidence, typed missingness, opaque identity, explicit blocked/review-mode rules, and a presentation-only deterministic Masked Demo boundary. It does not write to the source workbook or introduce financial, scheduling, workflow, integration, or Quote semantics.

## Repository and authority boundary

Titan Operations is a dedicated product repository. It is separate from
`LucidQuestLabs/titan-quote-workstation` and
`LucidQuestLabs/titan-website-beta`.

- Titan Quote Workstation is a pattern reference only. Generic UX,
  audit/review patterns, code organization, and non-domain utilities may be
  studied, but Quote workflow, quote-to-job assumptions, estimating/pricing
  semantics, and domain authority must not transfer into Operations.
- Titan Website Beta is a presentation/pattern reference only. Branding,
  layout, typography, components, responsive behavior, and generic UI
  infrastructure may be studied, but RFQ/public-site semantics, deployment
  assumptions, operational truth, domain models, and workflows must not
  transfer into Operations.
- No sibling code or behavior is currently reused by this repository.

Operations semantics come only from the promoted Titan Operations governing
corpus. The authorized source workbook is immutable external evidence and is
not stored in Git; spreadsheet formats are ignored by repository policy.

## RC0 status

The checkpoint at `50f35ca` preserves the originally blocked candidate. The
remediated candidate at `be92bd1750c94dfdf2fe5be7163c225bbf43e11f` passed the
full Artifact 03 v0.2 rerun with disposition **RC0 VERIFIED — READY FOR OWNER
REVIEW PACKET**. Artifact 03 authorizes the owner-review packet, but Artifact
04 is intentionally not created by this remediation run.

## Commands

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm build:hosted`

## Netlify owner preview

The Netlify build is a static, Masked-Demo-only owner preview. It reads the
committed derivative at `public/data/rc0-preview.json`; it never reads the
workbook and does not receive `TITAN_RC0_WORKBOOK_PATH` or
`TITAN_RC0_MASK_KEY`.

Generate the derivative only in an authorized local session, using the exact
governed workbook and a non-committed mask key:

`pnpm generate:hosted-preview -- <authorized-workbook.xlsx>`

Generation writes the hosted payload and
`deployment/rc0-preview-data-manifest.json`. The manifest records source and
derivative hashes, counts, rule identities, masking mode, and generation
environment. The payload is derived preview data, not source authority.

In a non-interactive verification runtime where the bundled `pnpm` wrapper
attempts dependency reconciliation, run the already-locked local tools
directly: `node node_modules/vitest/vitest.mjs --run`,
`node node_modules/typescript/bin/tsc --noEmit`, and
`node node_modules/typescript/bin/tsc -p tsconfig.build.json` followed by
`node node_modules/vite/bin/vite.js build`. The configured lint gate is the
same no-emit TypeScript check; introducing a separate lint policy is outside
RC0 remediation.
