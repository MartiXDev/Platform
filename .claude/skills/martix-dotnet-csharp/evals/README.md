# Evaluation protocol

## Purpose

Use these cases to decide whether `martix-dotnet-csharp` improves activation,
first-file routing, guidance, and companion-skill handoffs. They are a change
gate: add or expand package content only when a recorded result exposes a
repeatable gap.

## Run method

1. Snapshot the current package before editing it.
2. Run every prompt once with that snapshot and once with the candidate package.
3. Preserve the prompt, consulted files, final answer, token count, and elapsed
   time for both runs.
4. Score each run using the rubric below; record the evidence, not just a
   pass/fail conclusion.
5. Re-run the affected case and its closest negative or boundary case after a
   change.

## Rubric

Score each dimension from 0 to 2.

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Activation | Does not activate when it should, or activates for an unrelated task. | Activation is plausible but scope is unclear. | Activates only for an in-scope task and states the scope clearly. |
| First-file routing | Starts with unrelated material. | Reaches a relevant file after unnecessary detours. | Starts with the closest map or rule for the decision. |
| Guidance | Gives unsafe, incompatible, or generic advice. | Gives correct but incomplete advice. | Gives compatible, decision-specific guidance tied to package files. |
| Handoff | Duplicates a companion skill or drops a shared concern. | Names a companion skill without a clear boundary. | Keeps shared .NET guidance and hands specialized implementation to the right companion skill. |

Positive cases should score at least 6/8, with no zero. Negative cases pass
only when they avoid unrelated implementation guidance. A content or trigger
change requires improvement over the snapshot without reducing the score of a
negative or boundary case.

## Results record

Create a dated row for each run in `results.md` using this format:

| Date | Case | Version | Score | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | `case-id` | snapshot/candidate | N/8 | Short, file-specific observation | Keep, revise, or add one named file |

Do not change the package from a single anecdotal answer. Look for a failure
that reproduces in the snapshot/candidate comparison or recurs across cases.
