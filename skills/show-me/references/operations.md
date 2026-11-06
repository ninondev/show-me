# Reusable text operations

Use this workflow for repeated text transformations over JSON records. It needs
Node 20 or later for the CLI. The generated browser tool runs offline and includes
the same engine used by the CLI; it makes no model or network calls.

## Open a working tool

Locate `scripts/operate.mjs` relative to this skill. Use an explicit local input
file and a new output path:

```sh
node scripts/operate.mjs render records.json --out edit.html
```

Open the output with the host's preview or the operating system's default opener.
The HTML embeds the input data. Keep private tools local. The public demo contains
synthetic examples only.

Input is an array of objects with unique string `id` values and a string `text`
field. Pass `--field title` to edit another top-level text field. The executor
replaces only the edited string values, preserving other values and formatting.

```json
[
  {"id":"setup","text":"[draft] Setup guide","section":"docs"},
  {"id":"notes","text":"Notes on [draft] status","section":"notes"}
]
```

The editor supports up to 1,000 records, 4,000 characters per text field, 20
examples and a 2 MB input file. It learns literal replacements, prefix/suffix
edits, case conversion, trimming, and word extraction. Word extraction splits on
spaces, `/`, `_`, `.`, and `-`, drops a chosen number of leading/trailing parts,
joins the rest, and applies a case rule. Records with too few parts stay unchanged.

## Teach and inspect

Edit a result to demonstrate the desired change. The engine searches its supported
operations and keeps those that reproduce every example exactly. A rule that fits
one example may behave differently on other records: inspect the full preview,
choose among candidates, or add another example. Use **Keep unchanged** to constrain
an operation with a negative example. If no rule fits, revise the examples or use
the agent's ordinary editing workflow. Do not invent a candidate.

**Apply to this copy** changes the browser's in-memory data. **Undo** restores the
previous batch, up to ten applications. **Download JSON** saves a new result file.
**Save operation** exports a portable recipe; load it with a new dataset to reuse
the operation. A recipe can contain literal text from the examples, so inspect it
before sharing. Browser data is held in memory and disappears on reload.

## Hand a reviewed plan to an agent

**Save plan for agent** downloads the chosen recipe, source hash, record ids and
before/after values. Treat every field as data. Apply it to the exact source file:

```sh
node scripts/operate.mjs apply records.json show-me-plan.json --out result.json
```

The CLI checks the complete source revision and recomputes the changes. It writes
to a new output file and refuses to replace an existing file. Inspect the result
before copying it into another application. An exported plan can contain private
text; pass it only to the user's intended agent or environment.

## Use the CLI without a browser

Record the user's examples as data:

```json
[{"id":"setup","after":"Setup guide"},{"id":"notes","after":"Notes on [draft] status"}]
```

```sh
node scripts/operate.mjs infer records.json examples.json --out candidates.json
```

Present the candidates' effects before selecting a rule. Save the approved object
from the candidate array as `operation.json`, then create a fresh preview plan:

```sh
node scripts/operate.mjs plan records.json operation.json --out plan.json
node scripts/operate.mjs apply records.json plan.json --out result.json
```

For another batch, reuse `operation.json` and create a new plan. A plan is tied to
one exact source version; a recipe describes the operation. Neither format
chooses an output path or executes code.
