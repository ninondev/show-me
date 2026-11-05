# Host capabilities

Read only the section that matches the active tools. Product names identify
likely integrations; the current tool list and documentation determine what
is available. Rendering and follow-up APIs can change independently of this
skill.

## Codex

If the bundled `visualize` skill is available, follow it for inline rendering,
file placement, theme rules, and the content reference in the reply. Use its
current syntax instead of reconstructing it from a remembered example.

For a choice, use `request_user_input_async` when available, or
`request_user_input` when the current mode supports it. Read the tool schema;
not every question control supports images or previews. Show visual options
separately if needed, then use the same names in the question.

For controls that start a new turn, use the follow-up API documented by the
active visualization runtime, such as `window.openai.sendFollowUpMessage`.
Pass the arguments required by that runtime. Keep sliders, filters, and other
display changes inside the visual unless the user requests a follow-up.

## Claude

When `show_widget` is exposed, read its associated instructions before using
it. Follow that renderer's rules for inline content and follow-up actions.
Use `AskUserQuestion` if it is present and its schema fits the choice. The
names and namespaces of these tools may vary between environments.

If there is no inline renderer, use the supported conversation formats. When
the task needs a visual artifact, use an available preview or opener. Create
an Artifact or standalone page when that is the requested deliverable or the
user accepts that presentation.

## ZCode

When ZCode exposes its `visualize` skill, read it for the current rendering
directive, allowed file location, styles, and interaction API. Use
`AskUserQuestion` when available and appropriate.

Use the active runtime's documented mechanism for a button that starts a new
request, such as `window.zcode.sendFollowUpMessage`. Keep local display changes
within the visual. Check whether the current model and tools can inspect
images before attempting visual review; model names alone are not evidence
of that capability.

## Terminals and other hosts

Use the formats the current client can display. Plain text, numbered steps,
small tables, and text diagrams work without an inline HTML renderer. Some
clients add richer rendering; verify that capability before using it.

When the user requests Mermaid or HTML source, provide that source. When they
want to see a diagram, use a rendered view or a readable alternative.

## Opening an artifact

Prefer the host's preview, file, or browser tool when it supports the artifact.
Otherwise use the operating system's default application:

| System and shell | Example |
| --- | --- |
| macOS shell | `open '/absolute/path/result.html'` |
| Linux shell | `xdg-open '/absolute/path/result.html'` |
| Windows PowerShell | `Start-Process -FilePath 'C:\work\result.html'` |

These are examples, not paths to create. Pass the actual path as one argument
with the shell's proper quoting. Respect the current tool permissions. If no
opener is available, provide a usable link and say that it was not opened.

For images and other media, use the host's supported embed or display tool
when possible. Never claim an artifact was viewed from an opener's exit code.
