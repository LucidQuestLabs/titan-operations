# Titan Operations Change Ledger

## Purpose

Human-readable lineage for consequential changes. Git remains code-level history.

## Rules

- No silent semantic promotion.
- Business/domain meaning changes require explicit governing authority.
- Implementation/refactor changes may proceed when behavior remains governed-equivalent.
- RC0 remediation entries reference Artifact 03 findings.
- Record resulting commit SHA.

## Entries

### 2026-08-19 — Preserve blocked RC0 candidate

- **Change class:** governance-control
- **Authority/source:** Git and RC0 Remediation Master Prompt, G0–G2; Artifact 03 sections 1, 16, and 17
- **Reason:** Freeze the exact blocked candidate before remediation and establish a dedicated Operations repository.
- **Affected areas:** repository identity, `.gitignore`, all checkpointed source/config/test files
- **Behavioral impact:** none; the checkpoint preserves the blocked candidate behavior
- **Truth/governance impact:** none; Artifact 03 remains blocked and the workbook remains external
- **Verification:** 48-file fallback fingerprint matched `ED7606B526DF78EC645E383ACFA3639B04E5F0AA1F4AE3667684F13B8921A387`; remote was empty before the ordinary first push
- **Commit:** `50f35ca`
- **Status:** verified

### 2026-08-19 — Remediate Artifact 03 gaps

- **Change class:** implementation
- **Authority/source:** Git and RC0 Remediation Master Prompt, R0–R7; Artifact 03 sections 2, 10–13, 15, and 16
- **Reason:** Correct only the verified M2/M4/M5/M6 and verification-coverage deficiencies.
- **Affected areas:** normalization history, typed query/UI controls, keyboard/dialog behavior, History/Awareness coverage, Overview synthesis, browser/regression verification
- **Behavioral impact:** adds append-only normalization-history mechanics; source-qualified query/filter/sort controls; keyboard and focus behavior; 2–8 record comparison; finding provenance; and descriptive Overview context. It does not add operational conclusions or mutation.
- **Truth/governance impact:** none; no blocked or unresolved Titan semantics may be promoted
- **Verification:** R6 passed: 70 tests across 11 files; typecheck/configured lint; server compile; production build; real import of 1,716 jobs plus 7 review rows; 523 PROP findings with 0 blocked-operational findings; 1,716 masked DTOs with 0 invariant failures and 0 actionable leaks; Overview totals reconcile (1,716 status, delivery, and buyout records; 13,728 metric cells); clean rendered-browser pass; workbook SHA-256 unchanged at `E3D9522382A2BDC05A96BC3370D4886351D7180DE2DA864961C0534BD57B33A0`. Artifact 03 v0.2 independently reran the complete gate and verified this commit.
- **Commit:** `be92bd1750c94dfdf2fe5be7163c225bbf43e11f`
- **Status:** verified

### 2026-08-19 — Record Artifact 03 re-verification

- **Change class:** governance-control
- **Authority/source:** Git and RC0 Remediation Master Prompt, V; Artifact 03 v0.2
- **Reason:** Record the full rerun disposition without altering the verified implementation commit.
- **Affected areas:** repository status documentation and change ledger only; Artifact 03 remains an external Proto steps governance artifact
- **Behavioral impact:** none
- **Truth/governance impact:** authorizes Artifact 04 creation in a later run; Artifact 04 was not created here
- **Verification:** Artifact 03 v0.2 disposition is `RC0 VERIFIED — READY FOR OWNER REVIEW PACKET`; verified implementation commit `be92bd1750c94dfdf2fe5be7163c225bbf43e11f`; external Artifact 03 SHA-256 `4851089C436C2A21966045EE0E5E20A5267A46C034E0FBA431969EC6ACE12947`
- **Commit:** this final verification checkpoint
- **Status:** verified

### 2026-08-19 — Deploy and verify RC0 Netlify Masked Demo preview

- **Change class:** deployment-mechanics and governance-verification
- **Authority/source:** Artifact 05; Titan RC0 Netlify Hosted Preview Deployment Master Prompt; Hosted Verification Recovery Prompt
- **Reason:** Create a distinct Netlify-hosted candidate, preserve the Masked Demo exposure boundary, and complete the governed hosted-equivalence gate before any owner sharing.
- **Affected areas:** static hosted-data adapter and manifest; Netlify build/routing/security headers; hosted-mode lock; due-date provenance masking; hosted regression coverage; pnpm dependency-build allowlist; deployment verification documentation
- **Behavioral impact:** hosting mechanics only. The Netlify build reads the committed Masked Demo derivative, has no Internal Data path, and fails closed when the derivative is unavailable. No product or business semantics changed.
- **Truth/governance impact:** none. The workbook remains external and unchanged; blocked rules remain blocked; proposed rules remain review-mode; the derivative remains non-authoritative.
- **Hosted data:** source SHA-256 `E3D9522382A2BDC05A96BC3370D4886351D7180DE2DA864961C0534BD57B33A0`; derivative SHA-256 `6d5c2757aa289fb1049f03e5446dfd094138af108b33468ce4b447e318172444`; 1,716 qualified records; 7 review records; 523 proposed findings; 0 blocked-rule findings; 0 actionable protected-value leaks.
- **Netlify identity:** project `titan-operations-rc0-preview`; site `260250b5-9dcf-46b9-a891-55ac9887ada5`; deploy `6a85e9e75a10c20008271457`; context `production`; branch `rc0/netlify-owner-preview`.
- **Verification infrastructure:** two stopped passes identified harness-only defects (React controlled-input injection and an incorrect page-specific text assertion). The final single pass used real Chromium text insertion and page-correct assertions. No product change was made for either harness correction.
- **Verification:** 71/71 local tests, typecheck, configured lint, server compile, hosted build, deterministic regeneration, unchanged workbook hash, exact hosted derivative hash, complete rendered owner flow, deep links/refresh/query state, keyboard/modal behavior, fail-closed loading, no source maps, no console errors, and a single-origin network boundary all passed.
- **Artifact 06:** external artifact `06_RC0_HOSTED_PREVIEW_VERIFICATION.md`; SHA-256 `781F877AD293AE77C8AE0316777AC0C979FC97491733FCF167408834C7B10409`; disposition `RC0 HOSTED PREVIEW VERIFIED — READY FOR CONTROLLED OWNER SHARING`, limited to Masked Demo.
- **Deployment commits:** `fe21d60e15993d663a5e4e54dc13146cbed30e4e`, `5635d13d9cafba4b0152468a6a5fc3b470b350b0`
- **Status:** verified
