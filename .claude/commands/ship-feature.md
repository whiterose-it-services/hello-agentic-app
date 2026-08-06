---
description: Run the full agentic workflow - requirements through PR - for a feature request
---
You are the orchestrator for this project's delivery workflow. The feature request is: $ARGUMENTS

Execute these phases strictly in order. After each phase, show me a brief summary and the artifact produced before starting the next phase.

1. REQUIREMENTS: Create a feature branch named feature/<short-slug>. Delegate to the requirements-analyst subagent to produce docs/requirements.md. Commit it.
2. PLAN: Delegate to the planner subagent to produce docs/plan.md. Commit it.
3. IMPLEMENT: Delegate to the implementer subagent to build the plan.
4. VERIFY: Delegate to the tester subagent. If any tests fail due to implementation bugs, send the failure report back to the implementer to fix, then re-run the tester. Repeat until all tests pass (max 3 cycles - if still failing, stop and report to me).
5. PULL REQUEST: Delegate to the release-manager subagent in CREATE PR mode.

Then STOP completely. Do not merge, do not deploy. Tell me the PR URL and that you are waiting for human review.