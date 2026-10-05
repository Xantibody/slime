# Root causes

Slite shows Japanese text twice after an IME conversion in more than one
place, and each place has its own cause. This page records what was found for
each, how it was confirmed, and what Slime does about it, so the next report
can be matched against a known cause before anyone starts debugging.

| Where              | What the user sees               | Cause                                        | Fix in Slime                                |
| ------------------ | -------------------------------- | -------------------------------------------- | ------------------------------------------- |
| Document body      | `大変だ体現だ体現`, display only | Slate's mark placeholder keeps a copy        | `src/ime-fix.ts`, `src/mark-placeholder.ts` |
| Database row title | `テストテスト`, saved as such    | Slite blurs the input on the composing Enter | `src/composing-keydown.ts`                  |

## Document body: the mark placeholder keeps a copy

When marks (bold, italic, …) are pending, Slate renders a
`data-slate-mark-placeholder` span declared `data-slate-length="0"`, which may
only ever hold a zero-width character. During composition the browser writes
the composing text into that span; on commit Slate inserts the text as a real
leaf, and the placeholder keeps its copy. React can write the committed text
back into the placeholder a frame or more after `compositionend`.

The stored document is correct; only the DOM shows the duplicate.

Slime parks `editor.marks` for the length of a composition so the placeholder
is not rendered in the first place, and a `MutationObserver` restores the
placeholder's zero-width-only invariant whenever text appears in it outside
composition. `e2e/slate-ime-fixture.html` replays the DOM copied from a page
saved while the bug was showing.

## Database row title: Slite blurs the input on the composing Enter

A database (collection) row title is edited in a plain `<input>`
(`data-test-id="databaseNoteLinkTextInput"`), rendered inside a
`contenteditable="false"` block of the Slate editor. Slite's input component
and the row-title cell both handle Enter by calling `blur()` and moving to the
next record, and neither checks `KeyboardEvent.isComposing`.

So the Enter that confirms a conversion ends the edit instead:

1. The user presses Enter to confirm the conversion.
2. Slite's keydown handler calls `blur()` on the input mid-composition.
3. Losing focus makes the browser commit the composing text itself, firing
   `compositionend`.
4. The IME, still holding the conversion, sends its own commit, which arrives
   as an `input` event with `inputType: "insertText"` and the same text.

Unlike the body bug this one is saved: the title becomes `テストテスト` (an
earlier sample read `TEストをを素体素体`). Other IMEs show the same `blur()` as
the caret leaving the field during conversion.

### How it was confirmed

The cause was narrowed down from a reproduction in the user's browser, with
logging listeners pasted into the DevTools console:

- The extra `input` event has no `beforeinput` before it, and `isTrusted` is
  `true`; the stack shows no page script inserting the text.
- The same IME in a bare `data:text/html,<input>` page neither duplicates nor
  loses the caret, which rules out the IME and the browser on their own.
- A `console.trace` in a `compositionend` listener shows Slite's input keydown
  handler (`onInputKeyDown` of the shared input hook) beneath every
  `compositionend` that was followed by a duplicate, and beneath none of the
  others.
- Slite's bundle contains no `execCommand("insertText")` or similar for this
  input; the only `execCommand` call is Slate's `indent`.

### The fix

A keydown pressed during composition belongs to the IME. Slime stops such
keydowns in the capture phase on `document`, before any page handler, when the
target is an `<input>` or `<textarea>`. The default action is left alone, so
the browser and the IME still commit normally, and an Enter outside
composition still ends the edit.

The Slate editor's own contenteditable is left out: Slate tracks composition
itself and reads composing keydowns to keep that state in sync.

## Investigating the next report

- Save the Slite page (complete) while the bug is visible, or right after.
  The editor's lazily loaded chunks are not saved; they are public under
  `https://assets.slite.com/app/stable/<chunk>.js`, named in DevTools stacks.
- Log `compositionstart`, `compositionupdate`, `compositionend`, `beforeinput`
  and `input` on `document` in the capture phase. An `input` event after
  `compositionend` without a `beforeinput` means the composition was ended
  early by something else.
- `console.trace` in a `compositionend` listener names the script that ended
  the composition, if a script did.
- Compare against a bare `data:text/html,<input>` page with the same IME and
  browser before suspecting either of them.
