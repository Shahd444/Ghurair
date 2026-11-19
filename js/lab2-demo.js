"use strict";

/**
 * Ghurair Lab 02 — UI adapter only.
 * The teammate's js/lab-2.js remains unchanged and owns ALL coupon logic.
 * This file uses its existing buttons to run the original simulation.
 */
document.addEventListener("DOMContentLoaded", () => {
  const lab = document.querySelector(".race-demo");
  if (!lab) return;

  const $ = (id) => document.getElementById(id);
  const ui = window.GhurairLabUI;
  const core = {
    mode: $("modeBtn"),
    normal: $("normalBtn"),
    sequential: $("sequentialBtn"),
    concurrent: $("attackBtn"),
    status: $("modeStatus"),
  };
  const output = $("results");
  const timeline = $("timeline");
  const runButton = $("runTest");
  const resetButton = $("resetLab2");
  const modeButtons = [$("vulnerableMode"), $("fixedMode")];
  const testButtons = [...lab.querySelectorAll("[data-test]")];

  if (Object.values(core).some((el) => !el) ||
      !output || !timeline || !runButton || !resetButton) {
    console.error("Race lab: missing original DOM controls or output elements.");
    return;
  }

  let selectedTest = "concurrent";
  let running = false;

  // Illustrative code previews. Real execution remains in lab-2.js.
  const samples = {
    vulnerable: [
      "async function applyCoupon(requestId) {",
      "  if (couponUsed) return 'Rejected';",
      "  // Both concurrent calls can pass this check.",
      "  logEvent(requestId + ' → Available');",
      "  await delay(100);",
      "  // Too late: reserve after waiting.",
      "  couponUsed = true;",
      "  return 'Accepted';",
      "}",
    ],
    fixed: [
      "async function applyCoupon(requestId) {",
      "  if (couponUsed) return 'Rejected';",
      "  // Reserve synchronously before any await.",
      "  couponUsed = true;",
      "  logEvent(requestId + ' → Reserved');",
      "  await delay(100);",
      "  return 'Accepted';",
      "}",
    ],
  };

  function activeMode() {
    return core.status.textContent.trim().toLowerCase() === "fixed"
      ? "fixed" : "vulnerable";
  }

  function renderCode() {
    const fixed = activeMode() === "fixed";
    $("codeTitle").textContent = fixed ? "Fixed code" : "Vulnerable code";
    $("codeModeBadge").textContent = fixed ? "Fixed" : "Vulnerable";
    $("codeModeBadge").className =
      `code-status ${fixed ? "fixed-status" : "vulnerable-status"}`;
    $("raceModeStatus").textContent = fixed ? "Fixed" : "Vulnerable";
    $("raceModeStatus").className = `pp-status ${fixed ? "good" : "bad"}`;

    ui.renderCode($("codeSample"), samples[fixed ? "fixed" : "vulnerable"],
      fixed ? [] : [4, 6], fixed ? [3] : []);
    ui.renderExplanation($("codeExplanation"), fixed,
      "Fixed: the coupon is reserved before the asynchronous wait.",
      "Vulnerable: the coupon is reserved after the wait, allowing overlap.");
    ui.updateModes(modeButtons, fixed);
  }

  function renderSelection() {
    ui.updateChoices(testButtons, "test", selectedTest);
  }

  function updateTimelineCount() {
    const text = timeline.textContent.trim();
    const count = !text || text === "No events yet"
      ? 0 : text.split("\n").filter(Boolean).length;
    $("eventCount").textContent = `${count} ${count === 1 ? "event" : "events"}`;
  }

  function clearResults() {
    $("resultTitle").textContent = "Waiting for your test";
    $("resultStatus").textContent = "NOT RUN";
    $("resultStatus").className = "pp-status neutral";
    $("resultMessage").textContent = "Select a request type and press Run Test.";
    output.textContent = "No requests yet";
    timeline.textContent = "No events yet";
    $("timelineDetails").open = false;
    updateTimelineCount();
  }

  function lockControls(locked) {
    running = locked;
    for (const button of [...modeButtons, ...testButtons, runButton, resetButton]) {
      button.disabled = locked;
    }
  }

  function showCompletedResult(raw) {
    const accepted = (raw.match(/: Accepted/g) || []).length;
    const rejected = (raw.match(/: Rejected/g) || []).length;
    const vulnerableRace =
      selectedTest === "concurrent" && activeMode() === "vulnerable" && accepted === 2;

    let title, status, message, statusClass;
    if (vulnerableRace) {
      title = "Race condition reproduced";
      status = "VULNERABLE";
      message = "Both requests redeemed SAVE50 even though its usage limit is 1.";
      statusClass = "bad";
    } else if (selectedTest === "concurrent" && accepted === 1 && rejected === 1) {
      title = "Duplicate redemption prevented";
      status = "PROTECTED";
      message = "Only one request reserved the coupon; the other was rejected.";
      statusClass = "good";
    } else if (selectedTest === "sequential" && accepted === 1 && rejected === 1) {
      title = "Second request rejected";
      status = "COMPLETE";
      message = "Request B started after A and saw that the coupon was used.";
      statusClass = "good";
    } else if (selectedTest === "normal" && accepted === 1) {
      title = "Coupon redeemed once";
      status = "COMPLETE";
      message = "The single request successfully redeemed the coupon.";
      statusClass = "good";
    } else {
      title = "Test completed";
      status = "COMPLETE";
      message = `${accepted} accepted, ${rejected} rejected.`;
      statusClass = "neutral";
    }

    $("resultTitle").textContent = title;
    $("resultStatus").textContent = status;
    $("resultStatus").className = `pp-status ${statusClass}`;
    $("resultMessage").textContent = message;
    // The raw response and original timeline are never modified here.
  }

  // Observe the original teammate code's output without changing its logic.
  const resultsObserver = new MutationObserver(() => {
    if (!running) return;
    const raw = output.textContent.trim();
    if (/^Processing request/.test(raw) || !/Request [AB]: (Accepted|Rejected)/.test(raw)) {
      return;
    }
    lockControls(false);
    showCompletedResult(raw);
  });
  resultsObserver.observe(output, { childList: true, characterData: true, subtree: true });
  const timelineObserver = new MutationObserver(updateTimelineCount);
  timelineObserver.observe(timeline, { childList: true, characterData: true, subtree: true });

  for (const button of modeButtons) {
    button.addEventListener("click", () => {
      if (running) return;
      const target = button.id === "fixedMode" ? "fixed" : "vulnerable";
      if (activeMode() !== target) core.mode.click(); // Call original mode switch.
      renderCode();
      clearResults(); // Selecting a mode does NOT run a request.
    });
  }

  for (const button of testButtons) {
    button.addEventListener("click", () => {
      if (running) return;
      selectedTest = button.dataset.test;
      renderSelection();
      clearResults(); // Selecting a test does NOT run a request.
    });
  }

  runButton.addEventListener("click", () => {
    if (running) return;
    lockControls(true);
    $("resultTitle").textContent = "Running experiment";
    $("resultStatus").textContent = "RUNNING";
    $("resultStatus").className = "pp-status neutral";
    $("resultMessage").textContent = "The original coupon simulation is processing the request(s).";
    $("timelineDetails").open = true;
    // Original handlers reset the coupon state and clear the timeline.
    core[selectedTest].click(); // The ONLY place a test is triggered.
  });

  resetButton.addEventListener("click", () => {
    if (running) return;
    if (activeMode() !== "vulnerable") core.mode.click();
    selectedTest = "concurrent";
    renderCode();
    renderSelection();
    clearResults();
  });

  renderCode();
  renderSelection();
  clearResults(); // Never run automatically on load.
});
