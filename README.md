# Ghurair — Interactive Web Security Labs

An educational static website with three browser-only lab simulations: **IDOR**, **Race Condition**, and **Prototype Pollution**. The output is fully self-contained except for the optional Google Fonts request. **No npm packages or backend are needed to run the website.**

## Start

From the repository root:

```bash
python -m http.server 8000
```

Then visit **http://localhost:8000/pages/index.html**. The page paths and local asset links are intentionally compatible with this folder layout.

## Test and coverage (requires Node.js 22+)

```bash
npm test
npm run lint
npm run coverage
npm run verify
```

`npm run coverage` enforces **>=90% statement/line and branch coverage on every modified JavaScript file** using Node's built-in V8 coverage report. No dependencies or installation step is necessary.

## File map (all 15 uploaded files reviewed)

| Uploaded file | Project file | Purpose / status |
| --- | --- | --- |
| `index(6).html` | `pages/index.html` | Main lab directory; unchanged |
| `lab-1(7).html` | `pages/lab-1.html` | **Repaired**: incorrect duplicate Race Condition page replaced with the IDOR lab UI |
| `lab-2(9).html` | `pages/lab-2.html` | Race Condition UI; shared engine linked ahead of both existing JS scripts |
| `lab-3(10).html` | `pages/lab-3.html` | Prototype Pollution UI; shared engine linked ahead of safe adapter |
| `footer(8).css` | `stylesheet/footer.css` | Footer styles; unchanged |
| `global(6).css` | `stylesheet/global.css` | Base styles and design tokens; unchanged |
| `labs(10).css` | `stylesheet/labs.css` | Shared lab styles; unchanged |
| `styles(7).css` | `stylesheet/styles.css` | Header, hero and landing cards; unchanged |
| `app(2).js` | *deleted* | Unreferenced comment-only placeholder; verified no HTML or JS imports use it |
| `lab-1(3).js` | `js/lab-1.js` | IDOR simulation; repeated presentation functions extracted |
| `lab-2(7).js` | `js/lab-2.js` | **Unchanged, byte for byte**: original teammate coupon implementation |
| `lab2-demo(1).js` | `js/lab2-demo.js` | Race UI adapter; repeated presentation functions extracted |
| `lab-3(7).js` | `js/lab-3.js` | **Unchanged, byte for byte**: original prototype demonstration, intentionally not loaded into the website |
| `lab3-demo(6).js` | `js/lab3-demo.js` | Safe prototype simulation; repeated presentation functions extracted |
| `lab-engine(2).js` | `js/lab-engine.js` | Placeholder converted into shared UI utility module |

## Behavior protection

- **IDOR**: request type (query/body/Base64), manual execution, authorized vs exposed vs blocked, 400/403/404 handling, quick-record choices and reset remain available.
- **Race Condition**: original coupon logic is untouched. The visual adapter calls its original hidden buttons only after **Run Test**; vulnerable/concurrent accepts two, fixed/concurrent accepts one, sequential rejects the second. Switching mode or selecting a test never runs it automatically.
- **Prototype Pollution**: selected payloads are simulated using a null-prototype dictionary. `Object.prototype` is not modified by the on-page script. The separate original demonstrator is retained as a source artifact but is **not** loaded by `pages/lab-3.html` because it demonstrates intentionally unsafe mutation.
- **Page layout**: stylesheets and navigation labels were kept intact. The repeated static Header/Footer markup is intentionally retained; extracting it would introduce client-side rendering or a build dependency and would not be behavior-neutral for a static site.

## QA limitations

The tests run Node with a lightweight DOM/MutationObserver test double; they are **not a full real-browser or screenshot regression suite**. CSS was separately parsed for syntax errors and markup checked for IDs, paths, and loading order. Run a manual smoke test in Chrome or Firefox before deployment, especially on mobile widths. No production server/database/transaction is involved in any lab.

For the complete QA trace and coverage figures, see [`docs/TEST_RESULTS.md`](docs/TEST_RESULTS.md).
