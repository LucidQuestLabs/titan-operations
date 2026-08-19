# RC0 Artifact 03 Remediation Matrix

This matrix is limited to the PARTIAL/FAIL findings in
`03_RC0_BUILD_VERIFICATION.md`. It does not authorize new Titan business
semantics.

| Artifact 03 section | Milestone | Exact deficiency | Affected files | Smallest governed correction | Tests / verification needed | Human semantic input |
|---|---|---|---|---|---|---|
| §2, §16.3 | M2 | Normalizer ID/version exists, but prior interpretations and successor relationships are not represented or tested. | `src/contracts/core.ts`, `src/import/normalizers.ts`, focused tests | Add an immutable versioned normalization history contract and deterministic append-only supersession helper that retains every prior interpretation and original source-cell references. | Start/supersede tests; immutability; deterministic IDs; reject source-evidence substitution. | No. This is persistence mechanics, not reinterpretation policy. |
| §2 M4, §11, §16.2 | M4 | Jobs UI exposes only search and raw status; buyout, delivery, metric presence/range, finding, and sort controls are absent; raw/normalized match lane is hidden. | `src/ui/main.tsx`, `src/ui/styles.css`, UI tests | Add typed URL-backed presentation filters and presence-aware sort over already-governed DTO fields; show source/normalized match lane. | Filter/sort/match-lane tests; URL state restoration; zero/non-value ordering. | No. Filters describe existing source/presence values only. |
| §2 M4, §16.2, §16 non-blocking | M4 | Arrow/Space row behavior and modal focus trap/return are absent. | `src/ui/main.tsx`, UI tests | Implement ArrowUp/ArrowDown focus movement, Space selection, Enter detail, `r` provenance, Escape close, dialog focus containment and return. | Keyboard and focus regression tests. | No. Interaction mechanics only. |
| §2 M5, §12, §16.4 | M5 | History/Awareness navigation, finding provenance, masked rendering, and mode continuity lack UI coverage. | `src/ui/main.tsx`, UI tests, browser evidence | Add deterministic UI coverage and exercise live rendered routes with authorized data. | Automated route/finding/provenance/mode tests plus R5 browser walkthrough. | No. |
| §2 M5, §16 non-blocking | M5 | Historical Explorer has a single-month filter but no governed 2–8 record canonical-field comparison. | `src/ui/main.tsx`, `src/ui/styles.css`, UI tests | Reuse row selection and render a read-only 2–8-record comparison aligned by existing canonical presentation fields, preserving presence labels. | Minimum/maximum selection tests; canonical alignment; `COLUMN_UNAVAILABLE` vs `BLANK`; no computed conclusion. | No. The promoted interface defines comparison mechanics and forbids conclusions. |
| §2 M6, §13, §16.1 | M6 | Overview omits delivery distribution/equivalent navigation, descriptive buyout source context, and visible data-quality/presence context. | `src/server/operations-api.ts`, `src/ui/main.tsx`, `src/ui/styles.css`, API/UI tests | Derive descriptive counts from qualified DTOs in the API, display them as source-qualified cards, and link to equivalent Jobs filters. Reuse `presenceReviewCount`; add no official/overdue/financial KPI. | Reconciliation tests for counts and links in Internal/Masked modes. | No. Existing source states and charter explicitly authorize descriptive context. |
| §10, §12, §15, §16.4 | M4–M6 verification | No real rendered-browser/accessibility/leak pass was completed. | No domain change; browser verification artifacts remain excluded by `.gitignore` | Exercise all required routes/modes, accessible names, URLs, provenance, keyboard and visible error surfaces against the local server. | R5 rendered-browser checklist and protected-token scan. | No; stop only if the required browser surface remains unavailable. |
| §15, §16 non-blocking | Tooling | Bundled `pnpm test` wrapper reruns install policy and fails before Vitest; lint duplicates typecheck. | `README.md`, possibly package-manager invocation documentation | Keep lockfile-local checks authoritative for this run and document the exact invocation; do not weaken dependency policy. A dedicated linter is outside this bounded remediation. | Direct Vitest, typecheck, configured lint, compile, build. | No. |

## Scope decision

All listed corrections are implementation or verification mechanics over
already-governed source/read-model fields. None requires resolving overdue,
status order, delivery requiredness, buyout cardinality, official totals,
financial meaning, notification behavior, or Quote/Estimating semantics. Any
new dependency on such meaning is a STOP condition for that item.
