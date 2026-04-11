# auth-verify-split verification

## Review Goals
- Verify the frontend PIN modal no longer uses `/api/learn` for auth preflight.
- Verify the dedicated auth endpoint has no AI side effects and does not create or mutate learning sessions.
- Verify `/api/search` is auth-gated.
- Verify `ACCESS_PIN` is documented in setup files.

## Evidence To Capture
- `git diff --name-only` before skeptical review
- skeptical review findings
- `git diff --name-only` after skeptical review
- exact validation commands and outcomes
