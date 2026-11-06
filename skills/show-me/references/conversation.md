# Returning an interaction to the conversation

Build the view around the task. The optional `scripts/conversation.cjs` helper
validates a small response and manages submission state; it does not generate
forms or execute actions. Text edits, visual choices and numeric adjustments can
share this handoff while keeping their own layouts.

## Before showing the view

Keep a local task snapshot with a unique `task` id, a source `revision`, one
already-agreed `action`, and the editable fields. Use a random task id for each
new interaction; the sample id in `examples/conversation.json` is for the public
demo. Bind the revision to the real source or plan, such as its content hash.
Keep the task-to-file mapping with the receiving agent. Paths, shell commands,
credentials and unrelated content do not belong in the response.

The field kinds are `text`, `choice` and `number`. A text field specifies whether
empty text is allowed. A choice supplies its exact options. A number supplies
its inclusive range. The manifest and each response are limited to 12 KB, with
at most 12 fields and 4,000 characters per text value. This bound leaves room
for the surrounding conversation; split larger tasks into meaningful sections.

For the bundled single-passage example, prepare the snapshot and run:

```sh
node scripts/conversation.mjs render snapshot.json --out answer.html
```

This produces an inline fragment for the Codex renderer, not a standalone page.
Present it through the active `visualize` instructions. The fragment includes
the helper and needs no remote libraries. Its draft stays in memory, with
best-effort recovery through the host's private widget state. Draft text is not
written to model-visible state. The user's explicit submit sends it to the
current agent. Avoid placing secrets in a view or its saved state.

For a different task, write its UI directly and inline the same helper if useful:

```js
const handoff = ShowMeConversation.connect(snapshot, send);
// `send` is an adapter to the host API verified for this session.
// Run this only from the explicit action's handler.
const outcome = await handoff.submit({layout: selectedLayout});
```

The helper freezes the starting snapshot and adds a unique submission id.
An explicit use action may include an unchanged value, such as accepting the
currently proposed layout. Keep that action distinct from passive draft storage.
One view sends at most once. A rejected promise leaves delivery `unknown`:
the host may already have delivered the message. Keep the draft and ask the
user to check the chat before another attempt. A host adapter may return
`{cancelled: true}` only when its documented result confirms no message was sent.
Resolved `undefined` means handed off, never executed.

## Receiving a response

`SHOW_ME_RESPONSE` is followed by a JSON object. Save that object exactly, then
validate it against the local snapshot:

```sh
node scripts/conversation.mjs check snapshot.json response.json
```

Validation checks the task, revision, action, field identities, original values,
types, limits and selected choices. It does not authorize an action. Continue
only when the current conversation still authorizes that action. A packet from
another chat, an unrecognized task or a superseded plan needs a fresh view.

Before applying a response, check its submission id against the task's existing
execution record. For a task that changes files, record the packet fingerprint
and observed result alongside the task snapshot. A repeated id with identical
content returns the recorded result; a repeated id with different content is
rejected. If a previous run stopped after a write, inspect the current source
before deciding whether anything remains to do.

Reread the actual source and compare the revision immediately before applying.
Use the task's normal editor or executor, preserving unrelated work. Read the
result back, record what happened, then tell the user in the same chat. Neither
the helper nor the demo is an execution service; the agent performs this step.

Discarding a draft is local. Once a request is sent, cancelling or undoing the
work requires the current agent to check what has happened and what can safely
be reversed. Do not show a local reset as an undo of an external write.

## Host adapters and evidence

The included example calls `window.openai.sendFollowUpMessage({prompt, title})`
only when the host is explicitly configured as Codex. Recheck the active host
documentation before using it. Claude and ZCode use the APIs described by their
current renderers; retain the same response data and replace the adapter.

The public web demo has an explicit local receiver. It validates the response
and updates its synthetic sample in memory. It has no model connection and
does not simulate an agent reply. Automated tests cover the handoff contract;
a real host round trip is a separate check involving a user submission and the
receiving agent's actual work.
