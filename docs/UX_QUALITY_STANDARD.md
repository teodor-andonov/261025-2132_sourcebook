# Sourcebook UX / quality standard — “Soft Precision”

**Goal:** define what “MEGA smooth, easy, beautiful and minimal” means in reviewable, testable terms.  
**Scope:** Windows Chrome desktop / Chrome Android PWA, same experience.

## Principles

1. Content first, chrome second. Resource preview area is the primary interface.
2. See a folder's contents immediately; advanced metadata is optional.
3. One universal action vocabulary across mouse, touch and keyboard.
4. Metadata does not take ownership of original files.
5. Never visually imply an action succeeded before verified persistence.
6. Every common action should have a fast path and a discoverable full path.
7. Persist user choices; don't re-ask the same thing every time.
8. Optimize perceived speed and trust as much as benchmark speed.

## Design tokens (initial proposals)

| Token | Light | Dark / behavior |
|---|---|---|
| Surface | soft near-white, not bright clinical white | near-charcoal neutral, not pure black |
| Text | high-contrast charcoal | warm-neutral near-white |
| Secondary text | subdued but readable | readable medium gray |
| Accent | restrained customizable hue | same hue, adapted contrast |
| Lines | 1px soft dividers, not card rectangles everywhere | slightly stronger local contrast |
| Spacing | 4px foundation; commonly 8/12/16/24 | identical scale |
| Radius | 6px chips / 8px controls / 10px cards | same geometry |
| Font | system UI - Windows Segoe UI / Android Roboto; later evaluate Inter | smooth native rendering |
| Icons | Lucide, stroke 2, sizes 16/18/20/24px depending context | inheriting currentColor |
| Animation | approx. 100–180ms for state transitions | reduced-motion opt-out |
| Tap target | comfortable >=44px controls on touch | never hover-only |

Avoid a fixed dense material-design look on desktop or a cartoonishly padded mobile UI. Adaptive spacing and icon targets, not different products.

## Layout: big-screen baseline

~~~text
+----------------------------------------------------------------+
| Catalog ▾ | ← → | Sources / References / Facades   Search  ⌕   |
+------------+---------------------------------------+-----------+
| SOURCES    | Gallery/list/table | Sort | Filter   | INSPECTOR |
| References |---------------------------------------|  Preview  |
|   Projects | [ image ][ image ][ image ][ image ]  |  Name     |
| COLLECTIONS [ image ][ image ][ image ][ image ]   |  Tags     |
| TAGS       | [ image ][ image ][ image ][ image ]  |  Fields   |
| SMART      |                                       |  Info     |
+------------+---------------------------------------+-----------+
| Zoom  –━━━━●━━━━+ | 152 items | 3 selected | offline/cached   |
+----------------------------------------------------------------+
~~~

The top/status bars should remain **very thin**. Main surface fills the window.

- Sidebar width is resizable, collapsible, persisted.
- Inspector width is resizable, toggled; main gallery uses freed space.
- Tabs should not multiply visible toolbars.
- Toolbar controls regroup/overflow on narrow width instead of wrapping into 3 rows.
- Mobile generally main gallery + drawer + inspector sheet, same commands.

## Fine-grained interaction design

### Gallery
- Click thumbnail area selects; double-click quick look or open based setting; tap affordances clear.
- Card text limited to useful filename + optional metadata line/badges in configured density.
- Aspect ratio toggle: square / natural-fit / crop-fill. Preserve image composition where possible.
- Inline thumbnail-size slider with continuous feedback, stable scroll anchor.
- Background of transparent images follows view theme or checker setting.
- Selection rings/tints never obscure preview image unnecessarily.
- Placeholder dimensions known before preview loads; no cumulative layout shift.

### Quick look
- Space opens, Esc closes, arrow moves to neighbors.
- Close returns exactly same selection + scroll + keyboard focus.
- Image zoom/pan supports wheel/pinch and fit-to-window.
- PDF page control uses compact overlay; no premature gigantic toolbar.
- Fallback card for unsupported/corrupted files, always path/name/open option.

### Inspector
- Top area only one hero preview, no redundant title.
- Editable title and metadata inline; auto-save safe catalog fields.
- Tags autocomplete allows keyboard return, immediate chips.
- Custom fields reveal editor on click; support mixed state for multi-select.
- Physical path and full raw filename visible without cluttering gallery.

### Tags/collections/smart folders
- User sees physical vs virtual differences via icon + action hint, not explanatory popups.
- Dragging items onto tag = attach tag; onto collection = add membership; onto physical folder = confirm exact move/copy.
- Nested tag affordance clear with indentation, search and hover/touch drag alternatives.
- Saved smart folder clearly indicates filter conditions via chips.
- View switch should not reset underlying filter/sort unintentionally.

### Feedback
- “Added to Materials” toast with Open / Undo when valid.
- On recoverable errors, show exact failure + Retry. No generic “Something went wrong.”
- Unsaved write and sync conflict status subtle but visible.
- No infinite spinners, layout thrash, white flashes or popover clipping.

### Empty states
- No catalog: create/open, minimal.
- Empty source folder: show folder and drop/choose action.
- No search results: search scope + Clear filters.
- Permission expired: explanation + Reconnect.
- Missing synced file: metadata still visible + locate.
- No thumbnail: type icon + preview regenerate on demand.

## Input equivalence table

| Action | Desktop | Android/touch |
|---|---|---|
| Select | click / arrows | tap |
| Multi-select | Shift/Ctrl click | long press + tap |
| Context | right click | long press/overflow |
| Quick look | Space / double click | tap preview/preview action |
| Search | / or Ctrl+K | search icon + keyboard |
| Back | Alt+Left / back button | hardware/system back |
| Rename | F2 | context Rename |
| Tags | inspector/autocomplete | inspector sheet |
| Drag to collection | drag | selection + Add to collection |
| Copy/move | Ctrl/Cmd+C/X/V or context | selection actions / destination picker |
| Edit density | slider/wheel if assigned | slider/pinch optional |

## Quantified friction targets

These are target measurements, not guarantees.

| Task | Target |
|---|---|
| New catalog and first folder connected | understandable without tutorial; under 1 min for normal user |
| Open preview from gallery | 1 action |
| Tag selected file | <=2 direct interactions if inspector is open |
| Tag 20 files | select + one bulk-tag action |
| Switch between source and smart view | 1 click/tap when sidebar visible |
| Add resource from Android share | one-tap confirmation with remembered destination after first setup |
| Restore last browser state on reopening | automatic |
| Adjust card size | one slider, instant feedback |

Friction audits should note false clicks, uncertainty, dropped frames, repetitive dialogues and hidden commands.

## Performance targets and profiling

Measure actual Windows machine and Pixel 8. Release budgets:
- Warm start first shell <=1s desktop and <=2s mobile where conditions permit.
- Indexed folder navigation first visible results target <=100ms.
- 10k gallery with virtualization, ~60fps scrolling target.
- Search typical local 20k index response <=100ms.
- Thumbnail workers bounded; never freeze controls.
- Visible card focus/selection feedback within one rendered frame.
- Browser memory/cache remains within documented device limits after repeated navigation.

**Use p50 and p95** and record hardware, Chrome version, catalog size, preview cache state. No false “60fps guaranteed” release claims.

## Visual QA checklist (every milestone)

- [ ] 1280×720 and wide desktop layouts.
- [ ] Pixel 8 portrait, landscape and narrow ~390px simulated width.
- [ ] Light/dark/system theme coherence.
- [ ] Mixed image aspect ratios and transparent SVG/PNG.
- [ ] 1/100/10k items, slow previews, large filenames.
- [ ] Tabs/sidebar/inspector resized to extremes.
- [ ] Keyboard focus visible; no broken Esc/back/menu.
- [ ] Font sizes/readability and touch hit target.
- [ ] No dangling button, inert icon, overflow or clipping.
- [ ] Fast scroll and selection during active background indexing.
- [ ] Reduced-motion and high-contrast checks.
- [ ] Offline/permission revoked/metadata conflict states.

## Quality release rubric (score 0–5)

Evaluate: 1) navigation speed, 2) gallery smoothness, 3) preview quality, 4) organization efficiency, 5) data integrity, 6) Android parity, 7) discoverability, 8) offline recovery, 9) file operations trust, 10) visual restraint.

**V1 gate:** no dimension under 4 and average >=4.5 from real test sessions. The rubric is a design heuristic, not a scientific score; annotate evidence for each judgment.

## What to reject during reviews

- “It technically works” while scrolling stutters.
- Forced lengthy modal for simple tagging.
- The app modifying or renaming user files just because a source was opened.
- Disappearing metadata when folder is temporarily unavailable.
- Four parallel sidebars/drawers of overlapping information.
- An action that silently does Copy when its label says Move.
- “Trash” button that permanently deletes without warning.
- Preview generation that blocks navigation.
- Features only usable with a mouse.
- Features whose advanced settings are always visible.

**Final taste test:** Would I choose Sourcebook over File Explorer simply because browsing is more enjoyable? If not, keep refining.
