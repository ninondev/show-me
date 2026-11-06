# Show me

English | [简体中文](README.zh-CN.md)

Show me helps coding agents present useful answers and turn repeated text edits
into reusable local operations.

The skill chooses a form for each question and uses your app's existing tools.
It keeps explanations in the conversation where possible, shows visual options
before asking you to choose, and opens or embeds finished work for inspection.

## Try an edit

[Open the live demo](https://ninondev.github.io/show-me/), then click **Try an example**.
One filename edit produces a preview for the whole batch. Edit another result to
distinguish rules that fit the first example, then save the operation for another
batch.

For a useful ambiguity, choose **Draft labels** and try its example. Removing
`[draft] ` from the start and removing it everywhere both fit the first edit.
Click **Keep unchanged** on the notes record: the unwanted rule disappears.

The editor runs in your browser. It searches a small set of text operations
locally, so trying examples and reusing a saved operation make no model calls.
It supports literal replacements, prefix/suffix edits, case changes, trimming,
and word extraction. You can download the result or pass a reviewed plan to your
agent. Each plan is checked against the source version before it runs.

To make a self-contained tool with your own data, use Node 20 or later:

```sh
node skills/show-me/scripts/operate.mjs render examples/files.json --out edit.html
```

Open `edit.html` in your browser. The file embeds its input data and works offline.
See the [operation workflow](skills/show-me/references/operations.md) for input
format, supported operations, file limits, and CLI usage.

## Use it

After installation, ask your agent to use `show-me` with the current topic.

| Ask | The skill guides the agent to use |
| --- | --- |
| "How many minutes are in two hours?" | A short answer |
| "Compare these two plans by price, limits, and cancellation terms." | A table with the same criteria for both plans |
| "Show which steps depend on each other." | A diagram or numbered steps |
| "Show how the total changes when I change the number of attendees." | An interactive view with useful controls, when the app supports it |
| "Show two different layouts before I choose." | Comparable previews with different structures, followed by a choice |
| "Save this explanation as a Markdown file for my team." | The requested file |

## Install

Download this repository or clone it:

```sh
git clone https://github.com/ninondev/show-me.git
```

Copy the entire `skills/show-me/` folder into a skill directory your app reads.
Include `references/`, `scripts/`, `assets/`, `agents/`, and `LICENSE`.

- Codex: `~/.agents/skills/`
- Claude Code: `~/.claude/skills/`
- ZCode and other apps: use the skill location documented by the app.

If you already have a `show-me` skill, compare or back it up before replacing
it. Start a new session, ask the agent to load `show-me`, and check that it
found this copy.

## How it fits your app

The [host reference](skills/show-me/references/hosts.md) covers Codex, Claude,
ZCode, and terminals. The skill follows the tools available in the current
session. Inline visuals use the app's renderer; text, tables, and numbered
steps work in clients without one.

For finished work, the skill first uses the app's preview tools when they
support the artifact. Otherwise, it uses the operating system's default
application. Local HTML opened this way uses your default browser.

Keep preferences such as your preferred diagram format in your own agent
instructions. When you ask for a file, report, website, or export, that request
sets the deliverable.

## Contributing

Run the deterministic operation checks and rebuild the demo:

```sh
node --test tests/*.test.mjs
node scripts/build-demo.mjs
```

The tests cover learning from positive and negative examples, reuse on three
new batches, unchanged data, stale plans, CLI execution and safe HTML embedding.
Human effort, end-to-end model tokens and total task time still need comparison
against ordinary agent editing, including tool preparation and review.

The [evaluation cases](evals/cases.json) cover form selection, choices, exports,
and missing host capabilities. Run them with a fresh agent, then assess its
responses against the separate [rubric](evals/rubric.md). Give the rubric to
the reviewer after the exercise.

Check rendering, button actions, themes, and opening behavior in the apps
affected by your change. Report which checks you ran.

## Origin and license

Derived from [Charlie Hills's show-me](https://github.com/charlie947/show-me),
at commit [`69e488e`](https://github.com/charlie947/show-me/blob/69e488e301e8d6f43b8ddc883cb2392b1dd45264/skills/show-me/SKILL.md).
The original centers on HTML previews. This derivative draws on GPT-6's
Intelligent UI to choose a presentation for each answer, with conversation
views and interaction supplied by the app.

It retains the original's practice of showing visual choices before asking,
making alternatives structurally distinct, and checking that finished work
was presented.

MIT licensed. The original copyright notice is preserved in [LICENSE](LICENSE)
and in the installable skill folder.
