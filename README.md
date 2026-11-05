# Show me

Show me helps an agent choose how to answer: a few sentences, a comparison
table, a diagram, an interactive visual, or a preview of something it built.
Explanations stay in the conversation when the host supports the right form.
Requested files and exports are still delivered as files.

This derivative takes its direction from GPT-6's Intelligent UI: choose the
presentation for each answer and use interaction where it helps understanding.
It uses the host's existing tools. Inline rendering requires a renderer in the
host application.

## Try it

After installation, ask the agent to use `show-me` with the current topic.

| Request | What to expect |
| --- | --- |
| "How many minutes are in two hours?" | A short answer |
| "Compare these two plans using price, limits, and cancellation terms." | A comparison using the supplied facts |
| "Show how the total changes when I change the number of attendees." | An interactive visual when supported, with a useful initial view |
| "Show two different layouts before I choose." | Comparable previews, followed by a choice |
| "Save this explanation as a Markdown file for my team." | The requested file |

## Install from a local checkout

The complete installable folder is `skills/show-me/`. Copy that folder,
including its `references/`, `agents/`, and `LICENSE`, into a skill directory
that your application reads.

Codex reads a shared user skill directory at `~/.agents/skills/`; Claude Code
uses `~/.claude/skills/`. For ZCode and other hosts, use the skill location
documented by the application. A renderer is optional for text and tables.

If a skill called `show-me` is already installed, compare or back it up before
replacing it. Start a new session after installation and ask the agent to load
the skill; check that it found this copy.

The [host reference](skills/show-me/references/hosts.md) covers Codex, Claude,
ZCode, and terminals. It tells the agent to consult the active tool schema and
renderer instructions. Availability depends on the client and session.

## Personal preferences

Keep personal choices in your normal agent instructions. For example, ask it
to prefer tables, use Mermaid for architecture diagrams, or open previews in
your default browser. An explicit request for a deliverable takes precedence
over the preference to keep explanations in the conversation.

The package includes no screenshot executable or additional service. Use the
host's inspection tools for the output being checked.

## Check changes

The synthetic [cases](evals/cases.json) exercise form selection, choices,
exports, and missing host capabilities. Have a fresh agent use the skill with
those cases, then compare its responses with the separate
[rubric](evals/rubric.md). Keep the rubric out of the initial exercise.

A case exercise checks how the instructions are interpreted. Check rendering,
button actions, themes, and opening behavior in each real application before
claiming that integration has been tested.

## Origin and license

Derived from [Charlie Hills's show-me](https://github.com/charlie947/show-me),
using the source at
[`69e488e`](https://github.com/charlie947/show-me/blob/69e488e301e8d6f43b8ddc883cb2392b1dd45264/skills/show-me/SKILL.md).
The original emphasizes rendering an HTML page and opening it for the user.
This version selects a presentation per answer and uses available conversation
tools, with host-specific details in a separate reference.

Retained ideas include showing visual choices before asking, distinguishing
alternatives by their structure, and checking that a finished artifact was
actually presented. GPT-6's Intelligent UI was the design reference for the
later change toward answer-specific presentation.

The original copyright notice is retained in [LICENSE](LICENSE), also included
inside the installable skill folder. This derivative is distributed under MIT.
