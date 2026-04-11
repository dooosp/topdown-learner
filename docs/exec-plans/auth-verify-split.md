# auth-verify-split

## Goal
- Split lightweight PIN verification from `/api/learn` by adding a dedicated auth verification endpoint.
- Repoint the frontend PIN modal flow to the dedicated auth endpoint.
- Gate `/api/search` with the same auth middleware.
- Document `ACCESS_PIN` in setup files without changing other auth semantics.

## Repo Identity
- repo root: `/Users/jangtaeho/Documents/New/auth-verify-split/topdown-learner`
- expected basename: `topdown-learner`
- task branch: `fix/auth-verify-split`
- pinned base: `origin/master` at `4a3283e903ffd04ab29c7bad537e13a8672e1c68`

## Discovery
- `public/app.js` currently uses `verifyPin()` to POST `/api/learn` with `topic: "test"` and `sessionId: "verify"`.
- `server.js` centralizes PIN checks in `checkAuth`, but `/api/search` is currently unauthenticated.
- `package.json` exposes only `start` and `dev`; there are no task-specific automated test or lint scripts to rely on.
- Shared readonly flow is handled by `/shared/:id` and must remain unchanged.

## Planned Changes
1. Add a lightweight auth verification route that only calls the shared PIN middleware and returns a minimal success response.
2. Point the modal PIN verification flow at the new route and preserve the existing error text.
3. Apply the existing auth middleware to `/api/search`.
4. Update `.env.example` and `README.md` to document `ACCESS_PIN`.

## Validation Plan
- Boot the server with required env set.
- Check wrong PIN returns `401` from the new auth endpoint.
- Check correct PIN returns success from the new auth endpoint.
- Confirm `verifyPin()` no longer posts to `/api/learn`.
- Confirm `/api/search` rejects missing or wrong PIN and succeeds with the correct PIN.
- Confirm a real learning start still uses `/api/learn`.

## Scope Guardrails
- No token/session redesign.
- No change to `/api/learn` semantics beyond removing PIN-only verification misuse.
- No changes to shared readonly behavior.
