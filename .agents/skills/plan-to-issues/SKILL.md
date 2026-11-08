---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Every issue here carries the shape below (decided 2026-11-08 for plan morning-digest;
   ADR 0002 names the parts). Ask the human only if a plan needs more than this.

   ```md
   Source: plan.md § <n>          ← first line, exactly; the reviewer sorts on it

   ## Scope
   <what to build, in the plan's words, plus the repo rules that bind it (ADR numbers)>

   ## Done when
   <the plan's "Done when", checkable>

   ## Blocked by
   <#n, #m — real issue numbers, or —>
   ```

   Title: `<part>: <what>` (e.g. `Digest page: GET /digest/:night`). Label: `plan:<plan name>`
   from the plan's frontmatter (`--label plan:morning-digest`). An issue whose "Done when"
   depends on someone outside the lane (a reviewer, a host, a human) stays open until they
   confirm; "sent" is not "seen". The clean-up issue is blocked by it.
5. Create each issue in dependency order, so blocked-by can cite real numbers:

   ```sh
   gh issue create --title "<title>" --body-file <tmp.md>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

A commit message with `closes #n` closes the issue on push, before any comment. Then post the
closing comment with `gh issue comment <n> -b "<closing comment>"`; a closed issue without it
is not done.

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
