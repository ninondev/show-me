---
name: show-me
description: Show explanations, comparisons, and previews in a useful form. Turn repeated text edits into a reusable local operation when the user wants to edit examples, inspect a batch, or reuse a transformation.
---

# Show me

Choose the form for this answer. Start with text; use a visual when it makes a
relationship easier to see or lets the user explore a meaningful change.

Keep explanations in the conversation when the host supports the right form.
An explicit request for a file, report, website, slide deck, or export determines
the deliverable. Use the relevant authoring workflow for that artifact, and use
this skill to present or preview it.

## Choose the form

| What the user needs | Useful form |
| --- | --- |
| A fact or short explanation | A direct answer in plain text |
| A comparison | A small table with the same criteria for each option |
| Order, dependency, or movement | Numbered steps or a compact diagram |
| A pattern in data | A chart with the units and relevant context |
| A changing relationship | A small interactive visual with useful controls |
| A layout or design choice | Visible previews at comparable proportions |
| A decision only the user can make | The host's question control, if available |
| Something already built | The actual artifact, opened or embedded as supported |
| Repeating a text transformation across records | An example-driven operation with a batch preview |

Pick the smallest form that answers the question. A list of numbers does not
automatically need a chart. Use a table or steps when the relationships are
already clear; choose Mermaid when the user requests it or a rendered diagram
would clarify the connections. Check that the host renders it first, unless
the user asked for the source.

Put the key answer beside the visual. Do not repeat its labels and values in a
second explanation. Controls should help explore the answer; the initial view
must already be useful.

## Leave a reusable operation when it earns its cost

For repeated text edits, use the bundled [operation workflow](references/operations.md).
The user edits examples, compares the rules that fit, and reviews their effect on
the whole batch. Additional examples, including records that should stay unchanged,
constrain the rule. Save the chosen operation for the next batch.

Use this branch when previewing many changes or repeating the task makes a tool
useful. Complete a small one-off edit directly. Include tool preparation and
review in any cost comparison; local execution alone does not measure total savings.

The bundled engine handles bounded text operations over JSON records. For work
outside that range, use the appropriate existing tool or build a task-specific
control with the host. Keep the user's real data and the action it will change
connected; a demonstration is not permission to modify other files or publish.

## Use the current host

Check the available tools and skill instructions. Read the matching section of
[Host capabilities](references/hosts.md) when using a renderer, a question
control, or an opener. Follow its current schema and output format.

Use an available native renderer for inline visuals. If none is available, use
a readable table, steps, or text diagram. If that cannot express what the user
needs to see, offer an opened artifact; do not present raw rendering markup as
the visual.

Keep presentation-only controls local. Use the host's documented follow-up
mechanism when a button should send a new request, and make that action clear
in the label. A display control does not authorize a separate external action.

## Help with choices

Recommend an option when the evidence supports one, with a short reason.
Ask for a choice only when the user needs to make it. A request for advice can
end with a recommendation; it does not need an extra confirmation step.

When appearance matters, show previews before asking. Use the requested number
of alternatives. Describe the distinguishing idea behind each: if the same
description fits two, change the structure before presenting them as different
directions. Use neutral colors when the choice concerns structure.

Use a question control only if its schema supports the question. Otherwise,
ask in the conversation with clearly identified options. An unanswered control
is still unanswered.

## Check the result

- Use the same source data for the visual and the prose. Keep unknown values
  unknown; label illustrative data as examples.
- Follow the host's theme and accessibility guidance. Keep labels readable,
  controls usable by keyboard, and meaning available without color alone.
- Use only resources permitted by the renderer. Prefer self-contained visuals
  when external assets add nothing.
- Inspect code and exercise interactions when the environment supports it.
  Inspect the rendered result when a preview is available and useful. Keep
  code inspection, interaction testing, and visual inspection distinct in
  claims about what was checked.
- Open or embed an existing artifact with the available tool. Report only the
  outcome observed: a successful opener command alone does not establish that
  the user saw the artifact.

Keep user-specific preferences in the user's own instructions. This skill
does not require a browser brand, a particular model, or other custom skills.

Adapted from [Charlie Hills's show-me](https://github.com/charlie947/show-me)
under [MIT](LICENSE). The answer-specific presentation was inspired by GPT-6's
Intelligent UI.
