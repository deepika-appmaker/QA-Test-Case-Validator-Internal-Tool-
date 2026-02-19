# QA Test Case Validator

An internal AI-powered tool that validates software test cases against SOP (Standard Operating Procedure) standards. Upload a CSV of test cases, run AI analysis, and get instant quality scores, improvement suggestions, and rewritten test cases.

## What It Does

- **CSV Upload & Parsing** — Upload test cases via CSV with columns for Test Case ID, Description, Expected Result, Priority, and Module.
- **Local Rule Engine** — Automatically flags test cases with missing expected results, no action verbs, and near-duplicate descriptions.
- **AI-Powered Analysis** — Uses Google Gemini to evaluate each test case for business logic correctness, SOP structure compliance, expected result clarity, and language precision. Returns a 0–100 quality score with reasoning.
- **AI Rewrite Suggestions** — Automatically generates SOP-compliant rewrites for test cases that fail analysis.
- **Module Summary** — Generates an AI-powered summary with average score, rewrite rate, automation readiness level, and top recurring issues.
- **Per-Row Re-Analysis** — Re-analyze individual test cases after editing them inline.
- **Google Sign-In** — Authenticated access via Firebase Auth (Google provider).

```
