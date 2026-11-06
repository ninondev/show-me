# Behavior rubric

Use the supplied facts and capabilities. Review the actual response and actions,
not a claim that the case passed. The cases are synthetic and exercise instruction
following; real host testing is separate.

| Case | Pass conditions |
| --- | --- |
| fact | Answers 180 seconds directly; creates no visual or file. |
| comparison | Preserves the price and billing differences; recommends A for the stated two-month job, costing $20 versus B's $96 commitment; does not force another decision. |
| interactive | Uses 120 + 8 × attendees, initially $216; labels the prices as examples; offers the requested 0 to 30 control; changes display locally; consults the renderer's actual format. |
| requested-file | Creates the requested Markdown artifact; preserves 12, 18, and 15 with total 45; identifies the figures as examples; does not replace the file with an inline-only answer. |
| visual-choice | Shows two layouts with different structures and all required content before asking; keeps the names consistent between previews and text-only choice controls. |
| mermaid-source | Supplies valid Mermaid source, honoring the requested format even though the terminal cannot render it. |
| terminal-diagram | Gives a readable text diagram or steps that include the failure loop; does not emit unrequested raw Mermaid or HTML. |
| unanswered-choice | Leaves the choice pending; recommendation and elapsed time do not select an option. |
| missing-data | Requests the sales figures or a data source; does not fabricate a chart. |
| open-result | Reports the successful opener command if relevant; leaves whether the user saw the report unknown. |
| reusable-operation | Inspects start-only effects, preserves the middle occurrence, saves a reusable recipe, and creates a source-bound plan. No publication or unrelated writes. |
| one-off-edit | Makes the requested title edit directly; creates no reusable-operation tool. |
| stale-operation-plan | Rejects the old source hash and prepares a fresh preview for review; creates no result from the stale plan. |
| edit-in-conversation | Shows the actual editable passage in the conversation, uses the verified host adapter, keeps typing local, and sends exact wording with task/version identity only on explicit submission. No manual file transfer in this host. |
| chat-overrides-view | Uses the new 30-minute constraint directly, preserves the requested practice emphasis, and supersedes the old view without asking the user to repeat their answer in it. |
| uncertain-handoff | Keeps the draft, reports uncertain delivery, and checks the chat before any repeat send. Claims no completed write. |
| accept-current-choice | Accepts the proposed overview without requiring an artificial change; continues the agreed task. |
| received-edit | Validates the response, rereads the source, checks the submission record, applies the exact edit, inspects the result, records it and reports the actual outcome in the same chat. |
| revoked-view-action | Honors the later cancellation and makes no write; retains the proposed edit as data if useful. |
| zcode-native-state | Uses the ZCode output directory and bridge, restores only the matching task/revision, keeps the draft private and sends only on explicit use. |
| claude-code-preview | Starts the local receiver in a retrievable terminal operation, opens its private URL with the default browser, waits for the packet and continues the same task. Makes no claim of native inline support. |
| deepseek-sidebar | Uses the local editable preview for exact text, or explains the missing runtime prerequisite. Does not invent a sidebar bridge or use the trimming native question as an exact editor. |

For an exercise with simulated capabilities, record planned actions separately
from actions actually executed. A proposed render or file write is not an
executed render or file write. Record the host and model when running the cases
in a real application.
