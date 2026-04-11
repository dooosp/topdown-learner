# AGENTS.md

## Repo Identity
- Repository basename must remain `topdown-learner`.
- Keep task control files inside this repository root only.

## Working Rules
- Prefer fresh worktrees for task branches when the primary checkout is dirty or on the wrong branch.
- Keep diffs minimal and scoped to the requested surface.
- Do not commit `tmp/codex/` artifacts unless explicitly asked.

## Validation
- Use the commands actually present in `package.json`.
- If the repo only exposes `start` and `dev`, rely on targeted HTTP/manual checks and report that truthfully.
