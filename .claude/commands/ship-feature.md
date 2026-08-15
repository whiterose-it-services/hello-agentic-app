---
description: Run the full agentic workflow - OpenSpec proposal through PR - for a feature request
---
You are the orchestrator for this project's delivery workflow. The feature request is: $ARGUMENTS

Execute these phases strictly in order. After each phase, show me a brief summary and the artifact produced before starting the next phase.

1. PROPOSE: Derive a kebab-case change name from the feature request (e.g. "add a dark mode toggle" -> add-dark-mode-toggle). Create a feature branch named feature/<change-name>. Run `/opsx:propose "<change-name>"` yourself, inline, in this conversation (do not delegate it to a subagent - it needs to be able to ask me directly if the request is ambiguous) to generate the OpenSpec change (proposal.md, spec delta(s), design.md, tasks.md) under openspec/changes/<change-name>/. Commit the generated openspec/changes/<change-name>/ directory.
2. IMPLEMENT: Delegate to the implementer subagent to build the change, telling it explicitly to read openspec/changes/<change-name>/design.md, tasks.md, and specs/ (instead of docs/plan.md).
3. VERIFY: Delegate to the tester subagent, telling it explicitly to test against the scenarios in openspec/changes/<change-name>/specs/ (instead of docs/requirements.md). If any tests fail due to implementation bugs, send the failure report back to the implementer to fix, then re-run the tester. Repeat until all tests pass (max 3 cycles - if still failing, stop and report to me).
4. ARCHIVE: Run `/opsx:archive "<change-name>"` yourself, inline, in this conversation (do not delegate it to a subagent - same reasoning as PROPOSE: it needs to make judgment calls, like always choosing "sync now" when prompted, without a round trip). This runs on the still-open feature branch, so it syncs the spec delta into openspec/specs/<capability>/spec.md and moves the change to openspec/changes/archive/<date>-<change-name>/ before anything is pushed for review. Commit these archive/sync changes onto the same feature branch.
5. PULL REQUEST: Delegate to the release-manager subagent in CREATE PR mode. The PR now contains the code changes, the openspec/specs/ update, and the archived change directory together as one reviewable unit.

Then STOP completely. Do not merge, do not deploy. Tell me the PR URL and that you are waiting for human review.
