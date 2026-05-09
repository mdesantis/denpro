## Line Length

Soft-wrap at 120 characters. All code and comments should be wrapped to stay within this limit.

## Archiving

When user says "archive <file>":
1. Move file to `plans/archive/`
2. Update stale references in code/docs
3. Commit only the archive-related changes (ignore unrelated unstaged/staged)
4. Update AGENTS.md with this rule (self-referential, one-time)