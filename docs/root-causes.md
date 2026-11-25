# Root causes

Slite shows Japanese text twice after an IME conversion in more than one
place, and each place has its own cause. This page records what was found for
each, how it was confirmed, and what Slime does about it, so the next report
can be matched against a known cause before anyone starts debugging.

| Where                                              | What the user sees               | Cause                                        | Fix in Slime (`src/feature/fix/`)        |
| -------------------------------------------------- | -------------------------------- | -------------------------------------------- | ---------------------------------------- |
| Document body                                      | `大変だ体現だ体現`, display only | Slate's mark placeholder keeps a copy        | `editor-marks.ts`, `mark-placeholder.ts` |
| Database row title                                 | `テストテスト`, saved as such    | Slite blurs the input on the composing Enter | `form-field.ts` (keys)                   |
| Search page                                        | `kおうdおう`, conversion breaks  | Slite writes the previous query back         | `form-field.ts` (value writes)           |
| Document body, Google Japanese Input before v1.0.0 | Duplicate display                | Not established                              | None known                               |

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

### Why earlier fixes fell short

The body fix reached its current shape in three steps, each one closing a gap
the previous release left open. A report against an old version may be one of
these gaps rather than a new cause.

| Release | What it did                                             | Gap a user could still hit                                                  |
| ------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| v1.0.0  | Parked `editor.marks` during composition                | A placeholder already in the DOM kept receiving the composing text          |
| v1.1.1  | Reset placeholders once, a frame after `compositionend` | React wrote the committed text back later than that frame                   |
| v1.2.0  | Repairs placeholders on every mutation                  | (closed) The first version also missed a page already broken when it loaded |

The last gap was found by running the e2e harness against a saved page: the
guard only reacted to mutations, so a duplicate on screen before the extension
loaded stayed there. The guard now sweeps once when it starts.

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

## Search page: the stale query ends the conversion

Unlike the rows above, nothing is shown twice here: the conversion breaks
after every letter. A page saved while it happened held
`kおうdおうsいtえ▽▽nnkn gあ dえkいtあnい` in the search input, typed with an
SKK-style IME. Each consonant is left as a letter and each vowel becomes kana
on its own, so the composition was being committed after every keystroke.

The search page (`data-test-id="searchPage"`) renders its input
(`data-test-id="search-input"`) as a controlled React input whose value is the
URL's `q`. Typing calls `setQuery`, which only navigates to the new URL
(`replace`, `flushSync`). The page's store learns the new `q` in the screen
controller's `useLayoutEffect` (`applyUrlState`), so each keystroke runs two
commits:

1. The route renders with the store still holding the previous `q`, and React
   writes that stale value into the input.
2. The layout effect updates the store, and React writes the new value.

Outside composition this goes unnoticed while typing at the end of the query;
typing in the middle moves the caret to the end. During composition the write
in step 1 replaces the composing text, and Chrome ends the conversion without
firing `compositionend`.

The search modal is not affected: its controller keeps the query in its own
store and updates it synchronously in `setQuery`. The search fields in
settings for channels, user groups and members follow the search page's
pattern (`navigate` with `flushSync`, the query learned in `applyUrlState`),
so they should break the same way; the fix covers them too, but no user report
has confirmed them.

### How it was confirmed

- The input component, `setQuery` and the `useLayoutEffect` that calls
  `applyUrlState` were read in Slite's public chunks (React 19.3).
- Logging composition and `input` events in the user's browser showed no
  `compositionend` at all: each `compositionstart` followed an `input` with
  `isComposing: true`, and the IME's next keystroke arrived as a plain
  `input`.
- Chrome's IME emulation (DevTools Protocol `Input.imeSetComposition`) on a
  page that writes the previous value back on `input` gives the same event
  sequence and leaves `kここ` for `こ`. Writing only `defaultValue`, which
  React also does, leaves the conversion intact.
- `e2e/slate-ime-fixture.html` replays the two writes against a real input.

### The fix

While an `<input>` or `<textarea>` is composing, its value belongs to the IME.
Slime replaces the field's `value` property on `compositionstart` with one
that reads as before and drops writes, and puts the original back on
`compositionend`. React DOM keeps its value tracker as an own `value` property
on the field, so that property is what gets saved and restored. The browser's
own composition updates do not go through the setter. The guard is also
released on `focusout`, since Chrome ends a composition without
`compositionend` when the field moves in the DOM.

The stale write in step 1 is dropped. The write in step 2 carries the same
text the input already holds, so React skips it. Search still runs on the
composing text, as it did before.

## Google Japanese Input before v1.0.0: cause not established

Before the first release, Google Japanese Input still showed the duplicate on
both Chrome and Firefox. The commit that reported it fixed (8312e8e) changed
how the composition listeners were registered, passing an arrow function
instead of the handler itself.

That change does not alter behaviour: the handlers are closures returned by
`createIMEFix` and never read `this`, so both forms call the same code. Whatever
stopped the duplicate at the time is unknown; a reload that picked up a fresh
build is a plausible explanation. If Google Japanese Input shows a duplicate
again, treat it as unexplained rather than as a known, fixed cause.

## Ruled out

Hypotheses that were checked and dropped while investigating the row title,
recorded so they are not checked again:

| Hypothesis                                                         | Why it was dropped                                                                                       |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| The collection's page title (`textarea#NOTE_TITLE_ID`) is affected | It is a plain textarea outside Slate, and Slime never writes to it; v1.1.1 and v1.2.0 behave identically |
| Upgrading Slime to v1.2.0 fixes the row title                      | Neither version had any handling for form fields                                                         |
| Slime causes the row title duplicate                               | Slime appears in none of the stacks, and makes no DOM writes in that path                                |
| A Slite script inserts the second copy                             | The second `input` is trusted with no script on its stack, and the bundle has no matching call           |
| Slate's `selectionchange` handler steals focus mid-composition     | `selectionchange` fires on every conversion, duplicated or not; only the Enter `blur()` correlates       |
| The IME or the browser alone                                       | A bare `data:text/html,<input>` page with the same IME and browser does not duplicate                    |

The caret leaving the row title during conversion with a different IME is
attributed to the same `blur()`, but that was not confirmed separately.

## Investigating the next report

- Save the Slite page (complete) while the bug is visible, or right after.
  The editor's lazily loaded chunks are not saved; they are public under
  `https://assets.slite.com/app/stable/<chunk>.js`, named in DevTools stacks.
  The CDN sends them brotli-compressed whatever the request asks for, so fetch
  them with `curl --compressed`.
- Log `compositionstart`, `compositionupdate`, `compositionend`, `beforeinput`
  and `input` on `document` in the capture phase. An `input` event after
  `compositionend` without a `beforeinput` means the composition was ended
  early by something else.
- `console.trace` in a `compositionend` listener names the script that ended
  the composition, if a script did.
- Compare against a bare `data:text/html,<input>` page with the same IME and
  browser before suspecting either of them.
