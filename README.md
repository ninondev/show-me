# Show me

English | [简体中文](README.zh-CN.md)

Show me helps coding agents put useful views inside the conversation, then
continue the task from what you edit, choose or adjust.

A short question still gets a short answer. When a view helps, it starts with
the content you are already discussing. Edit a passage in place, choose between
real previews, or move a control and see the result change. Keep talking whenever
you prefer; the agent carries the context forward.

## Try the interaction

[Open the examples](https://ninondev.github.io/show-me/). Edit the wording, choose
a study-plan view, or adjust a session's duration. Each example has a local
receiver that checks your input and updates the sample. The page makes no model
calls and contains synthetic data.

Inside a supported chat host, an explicit action sends your changes to the
current conversation. The agent checks the task and source version, does the
agreed work, and reports what happened. Typing and exploring stay local.

Codex and ZCode show the editor in the conversation. In DeepSeek Harness,
a chart arrives as an HTML attachment. Click the file card to see it in the
right sidebar. For tasks that need your exact edits back, the
[host guide](skills/show-me/references/hosts.md) covers the separate local
editor for Claude Desktop's Code tab and the experimental DeepSeek route.

## Use it

After installing, ask your agent to use `show-me` on the current task.

| Ask | Useful response |
| --- | --- |
| “How many minutes are in two hours?” | A direct answer |
| “Compare these two plans by price, limits and cancellation.” | A comparison using the same criteria |
| “This paragraph is close. Let me fix a few words.” | The actual passage, editable in the conversation |
| “Show me both layouts before I choose.” | Comparable previews with a visible choice |
| “What changes if I only have an hour?” | A control beside the result it changes |
| “Use my changes and finish the file.” | The agent resumes the task and reports the actual result |
| “Save this explanation for my team.” | The requested file |

The skill guides the agent's choices. The small optional handoff helper validates
text edits, choices and numbers; it leaves the layout and execution to the task.
See [conversation handoffs](skills/show-me/references/conversation.md) for the
snapshot format and receiving workflow.

## Install

Download this repository or clone it:

```sh
git clone https://github.com/ninondev/show-me.git
```

Copy the entire `skills/show-me/` folder into a skill directory your app reads,
including `references/`, `scripts/`, `assets/`, `agents/` and `LICENSE`.

- Codex: `~/.agents/skills/`
- Claude Code: `~/.claude/skills/`
- ZCode and DeepSeek Harness: follow the
  [app-specific installation and capability notes](skills/show-me/references/hosts.md).
  For ZIP import, use the release package with `SKILL.md` at its root.

If `show-me` is already installed, compare or back it up before replacing it.
Start a new session and ask the agent to load this copy. The optional scripts
need Node 20 or later; the presentation guidance does not require Node.

## How it fits your app

The skill uses the active host's renderer, question controls and follow-up API.
Read the [host reference](skills/show-me/references/hosts.md) for the route your
app supports. In a client without interactive views or a waiting local command,
the conversation continues with text, tables or native questions.

Finished files open in the host's preview when supported, otherwise in the
operating system's default application. Local HTML uses the default browser.
An explicit request for a file, report, website or export sets the deliverable.

## Batch edits

The [batch text example](https://ninondev.github.io/show-me/operations.html) learns
bounded transformations from examples and previews their effect on a whole batch.
Save an operation to reuse it without model calls. This is an optional workflow
for repeated text tasks; [its guide](skills/show-me/references/operations.md)
covers JSON input, supported transformations and CLI execution.

## Contributing

```sh
node --test tests/*.test.mjs
node scripts/build-demo.mjs
```

Tests cover handoff validation, uncertain delivery, repeated submission, local
receivers, draft persistence, host isolation and the batch-operation engine. The [evaluation cases](evals/cases.json)
and [rubric](evals/rubric.md) cover the agent's behavior. Exercise host integration
in a real conversation and distinguish sending a response from completing work.

To compare effort or cost, include preparing the view, reviewing it and continuing
the task. Total human time and model-token savings have not been measured.

## Origin and license

Derived from [Charlie947's show-me](https://github.com/charlie947/show-me),
at commit [`69e488e`](https://github.com/charlie947/show-me/blob/69e488e301e8d6f43b8ddc883cb2392b1dd45264/skills/show-me/SKILL.md).
The original centers on HTML previews. This derivative draws on GPT-6's
Intelligent UI to choose a presentation for each answer, with conversation
views and interaction supplied by the app.

It retains the original's practice of showing visual choices before asking,
making alternatives structurally distinct, and checking that finished work
was presented.

MIT licensed. The original copyright notice is preserved in [LICENSE](LICENSE)
and in the installable skill folder.
