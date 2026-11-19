"use strict";

// Lab 02: Race Condition on a single-use coupon.
// Everything runs in the browser. The delay() below stands in for a slow
// database or payment call; no network request is ever made.
document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const ui = window.GhurairLabUI;

  // ---- Simulated shared state: coupon SAVE50 has a usage limit of 1 ----
  let couponUsed = false;
  let mode = "vulnerable";
  let selectedTest = "concurrent";
  let running = false;
  const timeline = [];

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  function log(requestId, message) { timeline.push(`${requestId} → ${message}`); }

  // ---- The two implementations that actually run ----
  // They match the code shown on the page line for line.
  const redeem = {
    async vulnerable(requestId) {
      log(requestId, "checking coupon");
      if (couponUsed) {
        log(requestId, "rejected");
        return "Rejected";
      }
      log(requestId, "coupon available");
      await delay(100);          // other request runs here
      couponUsed = true;         // BUG: marked used too late
      log(requestId, "coupon marked used");
      return "Accepted";
    },
    async fixed(requestId) {
      log(requestId, "checking coupon");
      if (couponUsed) {
        log(requestId, "rejected");
        return "Rejected";
      }
      couponUsed = true;         // FIX: reserve before waiting
      log(requestId, "coupon reserved");
      await delay(100);
      return "Accepted";
    }
  };

  // ---- Code shown to the visitor (8-15 lines each) ----
  const code = {
    vulnerable: [
      "async function redeemCoupon(requestId) {",
      "  log(requestId, 'checking coupon');",
      "  if (couponUsed) {",
      "    log(requestId, 'rejected');",
      "    return 'Rejected';",
      "  }",
      "  log(requestId, 'coupon available');",
      "  await delay(100);          // other request runs here",
      "  couponUsed = true;         // BUG: marked used too late",
      "  log(requestId, 'coupon marked used');",
      "  return 'Accepted';",
      "}"
    ],
    fixed: [
      "async function redeemCoupon(requestId) {",
      "  log(requestId, 'checking coupon');",
      "  if (couponUsed) {",
      "    log(requestId, 'rejected');",
      "    return 'Rejected';",
      "  }",
      "  couponUsed = true;         // FIX: reserve before waiting",
      "  log(requestId, 'coupon reserved');",
      "  await delay(100);",
      "  return 'Accepted';",
      "}"
    ]
  };

  const modeButtons = [$("vulnerableMode"), $("fixedMode")];
  const testButtons = [...document.querySelectorAll("[data-test]")];
  const runButton = $("runTest");
  const resetButton = $("resetLab2");

  function renderCode() {
    const fixed = mode === "fixed";
    const line = ui.findLine(code[mode], fixed ? "// FIX" : "// BUG");
    $("codeTitle").textContent = fixed ? "Fixed code" : "Vulnerable code";
    $("codeModeBadge").textContent = fixed ? "Fixed" : "Vulnerable";
    $("codeModeBadge").className = `code-status ${fixed ? "fixed-status" : "vulnerable-status"}`;
    ui.renderCode($("codeSample"), code[mode], fixed ? [] : [line], fixed ? [line] : []);
    ui.renderExplanation($("codeExplanation"), fixed,
      "Fix: the coupon is reserved before the wait, so the second request sees it as used and is rejected.",
      "Why it is vulnerable: the coupon is only marked used after the wait, so both requests pass the check first.");
    ui.updateModes(modeButtons, fixed);
  }

  function updateTimeline() {
    $("timeline").textContent = timeline.length ? timeline.join("\n") : "No events yet";
    const n = timeline.length;
    $("eventCount").textContent = `${n} ${n === 1 ? "event" : "events"}`;
  }

  function clearResults() {
    timeline.length = 0;
    $("resultTitle").textContent = "No test run yet";
    $("resultStatus").textContent = "NOT RUN";
    $("resultStatus").className = "pp-status neutral";
    $("resultMessage").textContent = "Press Run Test to see what happens.";
    $("results").textContent = "No requests yet";
    $("timelineDetails").open = false;
    updateTimeline();
  }

  function lockControls(locked) {
    running = locked;
    for (const button of [...modeButtons, ...testButtons, runButton, resetButton]) {
      button.disabled = locked;
    }
  }

  function showResult(responses) {
    const accepted = responses.filter(r => r.endsWith(": Accepted")).length;
    const rejected = responses.filter(r => r.endsWith(": Rejected")).length;
    let title, status, message, tone;
    if (selectedTest === "concurrent" && accepted === 2) {
      title = "Race condition reproduced";
      status = "VULNERABLE";
      message = "Both requests redeemed SAVE50, which can only be used once. Now switch to Fixed and run the same test.";
      tone = "bad";
    } else if (selectedTest === "concurrent" && accepted === 1 && rejected === 1) {
      title = "Duplicate redemption prevented";
      status = "PROTECTED";
      message = "Same payload, but only one request got the coupon. The other was rejected.";
      tone = "good";
    } else if (selectedTest === "sequential" && accepted === 1 && rejected === 1) {
      title = "Second request rejected";
      status = "COMPLETE";
      message = "Request B started after A finished and saw that the coupon was used. The bug only appears when requests overlap.";
      tone = "good";
    } else {
      title = "Coupon redeemed once";
      status = "COMPLETE";
      message = "The single request successfully redeemed the coupon.";
      tone = "good";
    }
    $("resultTitle").textContent = title;
    $("resultStatus").textContent = status;
    $("resultStatus").className = `pp-status ${tone}`;
    $("resultMessage").textContent = message;
    $("resultPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function runTest() {
    if (running) return;
    lockControls(true);
    couponUsed = false;                 // fresh coupon for every test
    timeline.length = 0;
    updateTimeline();
    $("resultTitle").textContent = "Running experiment";
    $("resultStatus").textContent = "RUNNING";
    $("resultStatus").className = "pp-status neutral";
    $("resultMessage").textContent = "Processing the request(s)…";
    $("results").textContent = "Processing requests...";
    $("timelineDetails").open = true;

    const handler = redeem[mode];
    const label = (id, result) => `${id}: ${result}`;
    let responses;
    try {
      if (selectedTest === "normal") {
        responses = [label("Request A", await handler("Request A"))];
      } else if (selectedTest === "sequential") {
        const a = label("Request A", await handler("Request A"));
        const b = label("Request B", await handler("Request B"));
        responses = [a, b];
      } else {
        const [a, b] = await Promise.all([handler("Request A"), handler("Request B")]);
        responses = [label("Request A", a), label("Request B", b)];
      }
      $("results").textContent = responses.join("\n");
      updateTimeline();
      showResult(responses);
    } finally {
      lockControls(false);
    }
  }

  for (const button of modeButtons) {
    button.addEventListener("click", () => {
      if (running) return;
      mode = button.id === "fixedMode" ? "fixed" : "vulnerable";
      renderCode();
      clearResults();                   // choosing a mode never runs a test
    });
  }
  for (const button of testButtons) {
    button.addEventListener("click", () => {
      if (running) return;
      selectedTest = button.dataset.test;
      ui.updateChoices(testButtons, "test", selectedTest);
      clearResults();
    });
  }
  runButton.addEventListener("click", runTest);
  resetButton.addEventListener("click", () => {
    if (running) return;
    mode = "vulnerable";
    selectedTest = "concurrent";
    renderCode();
    ui.updateChoices(testButtons, "test", selectedTest);
    clearResults();
  });

  ui.renderCode($("fixCode"), code.fixed, [], [ui.findLine(code.fixed, "// FIX")]);
  renderCode();
  ui.updateChoices(testButtons, "test", selectedTest);
  clearResults();                       // never runs automatically on load
});
