# Assessment B — detector and browser evidence

Independent agent `/root/detector_review`. Target `frontend/src/App.tsx`; deterministic markup scope `frontend/src`. Assessment A findings were never supplied to this agent. No production files edited.

## CLI evidence

Command: `.agents/skills/impeccable/scripts/impeccable.cmd detect --json frontend/src`.
Actual exit code: **0**, although one warning was returned (documented contract says 2 for findings; preserve actual observed exit).
Count: **1 warning**, category `slop`, rule **overused-font**, name `Overused font`.
Location: `D:/rocketlab2026-2/frontend/src/index.css:4`, snippet `font-family: "Geist`, imported by `main.tsx`.

Full returned JSON:
```json
[
  {
    "antipattern": "overused-font",
    "name": "Overused font",
    "description": "Inter, Roboto, Fraunces, Geist, Plus Jakarta Sans, and Space Grotesk are used on so many sites they no longer feel distinctive. Each new wave of AI-generated UIs converges on the same handful of faces. Choose a face that gives your interface personality.",
    "severity": "warning",
    "category": "slop",
    "file": "D:\\rocketlab2026-2\\frontend\\src\\index.css",
    "line": 4,
    "snippet": "font-family: \"Geist",
    "importedBy": ["main.tsx"]
  }
]
```

## Browser evidence

Used own fresh Playwright Chromium page at `http://127.0.0.1:5173`, 1440×900. Native CUA browsers unavailable per supplied runtime inventory; headless fallback does **not** provide a human visible overlay. API and poster/backdrop were mocked; no live backend, login submission, writes, auth or business behavior tested.

Mutable preflight succeeded: title changed to `Assessment B preflight`, script tag appended, injected script executed (`title/script/executed` evidence in `assessment-b-preflight.json`). The page was explicitly titled `[Headless] Assessment B`, never `[Human]`.

After preflight, started impeccable live-server on port8400, injected `http://localhost:8400/detect.js` using `page.addScriptTag`, scrolled page to top, waited 2.8seconds. Injection succeeded on home, movie details, and login. `.impeccable-overlay` nodes, labels and banners were present. Saved screenshots: `assessment-b-home-overlay.png`, `assessment-b-details-overlay.png`, `assessment-b-login-overlay.png`. Complete logs and DOM evidence: `assessment-b-browser.json`; runnable workflow `assessment-b.cjs`. Browser `pageerror` count: **0**. Document scroll width1440 equals viewport1440 on all three surfaces.

| Surface | Console headline count | Actual named rule messages | Evidence |
|---|---:|---|---|
| Home | 2 | oversized-h1; overused-font; kicker-above-heading (3 names) | 92px headline,57characters,50vh; Geist96% of text; label Filme em destaque |
| Details | 3 | oversized-h1; gpt-thin-border-wide-shadow; overused-font; kicker-above-heading (4 names) | Same underlying hero; dialog1px border +100px shadow blur; Geist91% |
| Login | 3 | oversized-h1; gpt-thin-border-wide-shadow; overused-font; kicker-above-heading (4 names) | Same underlying hero; dialog1px border +100px shadow blur; Geist95% |

Console headline counts differ from named messages. Report both; do not sum into8 unique defects. Four unique rule names across surfaces; underlying hero is included behind the open native modal, so repeated hero findings do not describe three independent screens.

Source correspondence: `index.css:533` hero-title has `clamp(3rem,6.4vw,5.75rem)` and serif family; `index.css:526` hero-label; `App.tsx` hero content contains actual movie title and category label; `index.css:305` dialog shadow with border at300. CLI font definition is at4; theme uses Geist for body and Cormorant Garamond for headings.

## Context and verified hypotheses

- **overused-font** is a heuristic style warning, not evidence of inaccessible text or broken interaction. The distinctive serif headlines and restrained cinematic palette provide context the detector does not score. Replacing all body typography solely to satisfy it is not justified.
- **kicker-above-heading** points to useful factual film context (`Filme em destaque`), not empty promotional boilerplate. Treat as a contextual false positive unless Assessment A independently identifies redundant hierarchy.
- **gpt-thin-border-wide-shadow** points to native modal separation over a dark backdrop. A100px blur is present, but this is a legitimate layered surface. No readability failure was established; minor aesthetic review only, not an automatic remove-border/remove-shadow prescription.
- **oversized-h1** is the strongest concrete polish hypothesis: long film titles use92px typography and occupy50vh on desktop. CSS `overflow-wrap:anywhere` prevents horizontal overflow but can split words and expand the featured section. Evaluate whether a smaller long-title treatment would improve catalog access; do not infer a fixed-title bug from one fixture.

## Failure accounting and cleanup

- Native browser presentation/visibility API skipped: no enabled native browser surface. Headless DOM overlay and screenshots are fallback evidence; no user visible browser was opened or left available.
- Initial browser pass captured only console lines containing impeccable; reran to capture grouped rule lines. A PowerShell script rewrite temporarily corrupted fixture accented strings; corrected the fixture using explicitUTF8 and reran all three surfaces. Final JSON/screenshots contain proper Portuguese and57character title, replacing earlier60character encoding artifact. This was an evidence fixture issue, not a production encoding defect.
- First source lookup for `components/MovieDetails.tsx` failed because the component resides in `features/MovieDetails.tsx`; correct file then read. Lookup for bundled `scripts/detect.js` failed (served endpoint is dynamically supplied); no injection failure occurred.
- Live-server was started solely for critique and stopped after each browser round. Stop command: `.agents/skills/impeccable/scripts/impeccable.cmd live-server stop --keep-inject`. Both stop attempts exited0 with `Stopped live server on port8400.` Final server PID22172 was stopped. `--keep-inject` avoids rewriting the existing app HTML; injection here was ephemeral page DOM only.
- Browser closed in script finally block. Vite server was preexisting and left running. Evidence artifacts intentionally retained; no temporary production edits or test framework added.
- Questions skipped: Assessment B produces evidence for parent synthesis; targeted user questions belong to combined critique.
