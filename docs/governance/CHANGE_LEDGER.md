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
- **Verification:** R6 passed: 70 tests across 11 files; typecheck/configured lint; server compile; production build; real import of 1,716 jobs plus 7 review rows; 523 PROP findings with 0 blocked-operational findings; 1,716 masked DTOs with 0 invariant failures and 0 actionable leaks; Overview totals reconcile (1,716 status, delivery, and buyout records; 13,728 metric cells); clean rendered-browser pass; workbook SHA-256 unchanged at `E3D9522382A2BDC05A96BC3370D4886351D7180DE2DA864961C0534BD57B33A0`. Artifact 03 rerun remains pending until the remediation commit exists.
- **Commit:** pending
- **Status:** implemented; R6 verified; Artifact 03 rerun pending
