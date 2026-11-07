# Host capabilities

Use the tools exposed in the current task. A renderer, a question control and a
page-to-agent bridge are separate capabilities. Read the current host contract
before calling one; a product name alone does not establish an API.

## Codex

Read the bundled `visualize` skill for its output directory, fragment format,
styles and rendering directive. The editable-answer example uses `--host codex`.
Its adapter calls `window.openai.sendFollowUpMessage({prompt, title})` and saves
drafts through `setWidgetState`, in `privateContent` with `modelContent: null`.
State updates arrive through `openai:set_globals`.

Use `request_user_input_async` for a native choice when available, or
`request_user_input` when the current mode supports it. Show visual options
separately if the question control only accepts text.

## ZCode

Read ZCode's bundled `visualize` skill. Render with `--host zcode` into the
visualization directory supplied for that task, then emit the documented
`::visualize` JSON reference in a completed assistant reply. An arbitrary
project path or an exported browser page does not provide the inline bridge.

The adapter uses `window.zcode.sendFollowUpMessage({prompt, title})`,
`widgetState`, `setWidgetState` and `zcode:set_globals`. Drafts stay in private
state, below the host's 16 KiB limit. Saves run in order so a delayed save of
“sending” cannot overwrite “sent”. A rejected send leaves delivery uncertain;
the documented contract does not distinguish cancellation from send failure.
Keep the draft and check the chat before sending again.

Use `AskUserQuestion` for a native choice when exposed. Install the complete
skill through the app's supported skill workflow and confirm that the task
can read it. Do not assume that a directory readable by another app is readable
inside ZCode's sandbox.

In ZCode 3.17.2, a synthetic task exercised the inline editor, draft restoration
after leaving and reopening the task, the native send-confirmation dialog, and
an exact-text update by the originating agent. A separate check delayed state
saving by 1.5 seconds before handoff: the confirmation still opened. Cancelling
it preserved the draft and left the source unchanged; the view kept delivery
uncertain because the bridge rejected with no documented cancellation code.

## Claude Desktop: Code tab

Use the Code task's own tools. Ordinary Claude chat and Cowork have different
[visual capabilities](https://support.claude.com/en/articles/13979539-custom-visuals-in-chat-and-cowork).
If `show_widget` is actually exposed, read its instructions and use its stated
bridge. The bundled editor's Code adapter instead uses a one-shot local receiver:

```sh
node scripts/conversation.mjs serve snapshot.json --host claude-code
```

Start it with the task's terminal tool and retain the operation id. Open the
printed private URL in the app's browser preview. Where `preview_start` requires a named
`.claude/launch.json` entry, merge a URL-only entry using its current schema;
preserve existing entries. Read the terminal output until the receiver returns
`SHOW_ME_RESPONSE`, then validate and continue the same task. Do not finish the
agent turn while the only route back is that waiting terminal operation.

In the inspected 4.16336.0 Code session, `mcp__terminal__run_in_terminal` and
`mcp__terminal__read_terminal` supplied the live terminal route. Check the actual tool
schema for polling and timeout arguments. In-app browser preview was disabled
in that installation; the exact-text round trip was exercised through a separate
browser and the original Code task. With preview unavailable, use `--open` to
open the system's default browser. Keep ordinary choices in `AskUserQuestion`.

See the [Desktop guide](https://code.claude.com/docs/en/desktop) for the app's
project and preview workflow.

## DeepSeek Harness Desktop

With the filesystem skill provider enabled, copy the complete `show-me` folder
to the project's `.dsh/skills/` directory, or to `~/.dsh/skills/` for all projects.
The project root is the nearest ancestor containing `.git`, or the task's working
directory when none exists. Confirm `/show-me` appears in the task's skill menu
and loads this copy; a custom provider configuration can change these roots.

For a chart, diagram or visual comparison, write a self-contained HTML file
in the task workspace. Give it a descriptive name and leave it in place after
delivery. In the user's session, call `present` with the file you just wrote.
For example, if you created `route-comparison.html`, the tool takes:

```json
{"files":[{"path":"route-comparison.html","description":"Two routes compared by distance and elevation"}]}
```

DeepSeek Harness 0.2.1-rc.5 puts a file card at the end of the turn. Clicking the
card opens the HTML in the right sidebar. The card points to the source file,
so only announce the attachment after `present` succeeds. Relative paths start
at the session's working directory. Pass a regular file the session can access.
A missing file, a directory or a symlink as the final path component will fail.

Put the chart and its labels in the page body, outside scripts and `<noscript>`,
so they remain visible when Coding Tools are off. With Coding Tools on, scripts can run inside the preview.
The sidebar has no documented way to send edits to the task or store a draft.

For a choice or a short comment, use the root agent's `ask_user_question` tool.
Its schema takes `questions` with `id`, `question`, optional `header`, `options`
and `multi_select`. Answers contain `id`, `selected` labels and optional `custom`
text. A skipped question does not approve anything. The native text input trims
leading and trailing whitespace, so use the editable preview for exact text.
Check whether the active schema exposes timed questions; only that mode supplies
the stable call id used for draft restoration. A pending result is still waiting.

If the user needs the visual to make a choice, finish delivering the attachment
first. Ask for the choice in the next turn, when the card is visible.

For exact edits, start the local receiver in the task's command tool:

```sh
node scripts/conversation.mjs serve snapshot.json --host deepseek --open
```

Keep its output retrievable and wait for the returned packet in that same task.
The browser runs the editor; DeepSeek's sidebar remains the native file viewer.
Do not inject a made-up `window.deepseek` API or route a Blob iframe to the
loopback receiver.

This route is experimental. Package inspection, local transport tests and a
browser check cover the editor and receiver. A live DeepSeek task retrieving
the packet and applying the exact edit has not yet been exercised.

## The local preview contract

`serve` requires Node 20 or later on the desktop computer. It binds a random port
on `127.0.0.1`, protects the page with an unguessable path, holds one task snapshot,
and returns one validated response to
its original command. It closes after submission or 15 minutes without one.
`--open` uses the OS default browser; it installs no service or browser extension.
A remote container's loopback address is not the desktop's loopback address.
Do not expose this receiver on the network to work around that difference.

Drafts stay in that preview tab's session storage and survive a refresh while
the receiver is running. Typing does not send a request. Only **Use this** sends
the response, checked against the original task and revision. The receiver
returns data; the agent checks the live source and performs the agreed work.
Closing a tab does not approve or cancel the task. Stop the waiting operation
when the user cancels the task, and retain proposed edits when resolving a
source conflict.

A successful acknowledgement means the waiting command received the packet.
The chat reports the actual result after execution. If delivery is uncertain,
keep the draft and check that command before creating another view.

## Real-app checks

For each app, exercise the path with synthetic content in a separate folder:
edit without submitting; refresh or reopen and check the draft; submit once;
confirm the original task receives it; validate, reread and modify the synthetic
target; then compare the exact result, including whitespace. Also check an
expired receiver and a stale source. Test native question cancellation using
that tool's real return value.

Automated adapter tests cover transport and protocol behavior. Record the app
version and whether an actual task resumed; a browser test by itself does not
establish that a desktop agent retrieves background command output.

## Opening finished artifacts

Prefer the host's supported preview. Otherwise use the OS default application:

| System | Example |
| --- | --- |
| macOS | `open '/absolute/path/result.html'` |
| Linux | `xdg-open '/absolute/path/result.html'` |
| Windows PowerShell | `Start-Process -FilePath 'C:\work\result.html'` |

Pass the actual path as one properly quoted argument. If no opener is available,
provide a usable link. Report whether the artifact was actually viewed separately
from whether the opener exited successfully.
