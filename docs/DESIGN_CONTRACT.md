# Sourcebook — Minimal Utility Design Contract

**Accepted product direction, 27 October 2026.**

Sourcebook should be an unusually capable **visual file utility**, not a decorated dashboard.

## Visual rules

- Neutral surfaces only: light/dark gray, white and black; no tinted panels or colorful folder icons.
- Exactly **one highlight color** at a time, applied to focused, selected and active states. Muted blue by default; adjustable in Settings, persisted per browser/device.
- Rounded corners stay, but restrained: approximately 6–8px standard.
- Compact spacing, toolbars, buttons and filenames. Show more resources per screen; maintain touch targets on mobile.
- Prefer familiar Lucide icons before or instead of labels where the meaning remains clear. Add accessible labels and tooltip titles for icon-only actions.
- No unnecessary badges, instructional annotations, marketing copy, gradients, large headers or permanent dashboard panels.
- Content is the hero. Resizable/collapsible navigation and inspector; do not cover mobile gallery by default.
- No surprise file mutations when browsing or saving metadata.

## Tags first

The first polished editable property is a **tag**. Avoid constructing a generic custom-properties database until this interaction works brilliantly.

- A selected file displays tags as small neutral hashtag pills, e.g. \`#Timber\`.
- A full hierarchical path such as \`Architecture / Facades / Timber\` is available through the pill tooltip and tag picker.
- Typing slash-separated paths creates nested tags; existing tags appear as selectable suggestions.
- Tags have stable catalog-local IDs and parent links, stored in \`tags.json\`.
- Resource metadata stores \`tagIds\` in \`resources/*.json\`, so future tag renames/reparenting won't require rewriting every resource record.
- Sidebar shows the nested hierarchy with indentation. Selecting a tag filters the **currently browsed folder** and includes descendants. Full catalog-wide tag browsing is later work.
- Older resource records containing plain string \`tags\` remain readable. Their tags convert to stable IDs on explicit save.
- Tags aren't metadata colors: use the active accent only to indicate UI selection/focus, not permanent different colors for every tag.
- Keep "Save" explicit while the prototype lacks robust write queue / undo. Later aim for low-friction auto-save after safe transactional catalog writes.

## Minimal automatic information

Name, file extension/type, path, size, file timestamps and dimensions are *derived from files* and need no custom property system. Show essential bits contextually; keep raw filename and catalog ID in a collapsed "File information" area.

Optional notes can remain. Dates can be displayed when efficiently derived, without becoming editable user-defined fields.

## Non-goals in this stage

Typed custom schemas, manual ratings, tag colors, elaborate forms, kanban, AI-tagging, relationships, arbitrary ontology editors. These remain candidates after nested tag creation, discovery, saving and filtering are stable.

## Acceptance examples

- Tag \`Image.jpg\` with \`Architecture / Facades / Timber\` in the inspector; card shows \`#Timber\` pill.
- Add a sibling \`Architecture / Roofs\` without duplicating the root.
- Tag two files with different descendants; filter on \`Architecture\` and both appear; filter on \`Facades\` shows only its branch.
- Reload catalog and recover hierarchy / resource IDs from \`tags.json\` and \`resources/\`.
- Open older catalog records with plain \`tags\` and retain all labels during migration.
- Set accent to a custom hex color in Settings; navigation and selection adopt it without recoloring the neutral surfaces.
- Use one 1440×900 screenshot viewport for desktop visual review; real browser captures with fixture data, not mockups.

## Cross-references

[ULTRA Roadmap](ROADMAP_V1_ULTRA.md) · [Implementation status](IMPLEMENTATION_STATUS.md) · [1440×900 screenshots](../screenshots/README.md)
