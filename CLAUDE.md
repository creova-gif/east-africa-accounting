# CLAUDE.md — east-africa-accounting

## Project Overview
Part of the CREOVA multi-vertical portfolio. See this repo's README for product-specific details.

## Technology Stack
React, Vite, TypeScript.

## CI
Build-only (`npm ci && npm run build`). No lint or test scripts exist yet — do not claim test coverage that isn't there.

## AI Agent Rules
- This repo has not had a deep security/backend audit in this engagement. Before adding backend-dependent features, verify directly whether a real, reachable Supabase project (or other backend) is actually connected — several repos in this portfolio reference project IDs that turned out to be paused or nonexistent.
- Before adding a new "Live"/"Active" status label to any UI, confirm the underlying data is real — this portfolio has a documented history of demo-mode features being mislabeled as live.

## Definition of Done
Build passes. Any new backend dependency is verified as real and reachable, not assumed.
