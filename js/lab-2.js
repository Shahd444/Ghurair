// SECTION 1 — ORIGINAL TEAMMATE JAVASCRIPT (UNCHANGED)
// Wrapper only: register original click handlers after the DOM is ready.
function installOriginalRaceLab() {
let couponUsed = false;
let currentMode = "vulnerable";
let isRunning = false;

// Delay function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Execution Timeline
function logEvent(message) {
  const timeline = document.getElementById("timeline");
  timeline.textContent += message + "\n";
}

// Coupon logic: Vulnerable / Fixed
async function applyCoupon(requestId) {
  logEvent(`${requestId} → Checking coupon`);

  if (couponUsed) {
    logEvent(`${requestId} → Rejected`);
    return `${requestId}: Rejected`;
  }

  logEvent(`${requestId} → Coupon available`);

  // Fixed Mode: reserve before waiting
  if (currentMode === "fixed") {
    couponUsed = true;
    logEvent(`${requestId} → Coupon reserved`);
  }

  logEvent(`${requestId} → Waiting...`);
  await delay(100);

  // Vulnerable Mode: update after waiting
  if (currentMode === "vulnerable") {
    couponUsed = true;
  }

  logEvent(`${requestId} → Accepted`);
  return `${requestId}: Accepted`;
}

// 1. Concurrent Requests
document.getElementById("attackBtn").addEventListener("click", async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    couponUsed = false;
    document.getElementById("timeline").textContent = "";

    const results = document.getElementById("results");
    results.textContent = "Processing requests...";

    const responses = await Promise.all([
      applyCoupon("Request A"),
      applyCoupon("Request B")
    ]);

    results.textContent = responses.join("\n");
  } finally {
    isRunning = false;
  }
});

// 2. Vulnerable / Fixed Toggle
document.getElementById("modeBtn").addEventListener("click", () => {
  if (isRunning) {
    return;
  }

  if (currentMode === "vulnerable") {
    currentMode = "fixed";
  } else {
    currentMode = "vulnerable";
  }

  document.getElementById("modeStatus").textContent = currentMode;

  document.getElementById("modeBtn").textContent =
    currentMode === "vulnerable"
      ? "Switch to Fixed Mode"
      : "Switch to Vulnerable Mode";
});

// 3. Normal Request (with isRunning protection)
document.getElementById("normalBtn").addEventListener("click", async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    couponUsed = false;
    document.getElementById("timeline").textContent = "";

    const results = document.getElementById("results");
    results.textContent = "Processing request...";

    const response = await applyCoupon("Request A");

    results.textContent = response;
  } finally {
    isRunning = false;
  }
});

// 4. Sequential Requests
document.getElementById("sequentialBtn").addEventListener("click", async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    couponUsed = false;
    document.getElementById("timeline").textContent = "";

    const results = document.getElementById("results");
    results.textContent = "Processing requests...";

    const responseA = await applyCoupon("Request A");
    const responseB = await applyCoupon("Request B");

    results.textContent = responseA + "\n" + responseB;
  } finally {
    isRunning = false;
  }
});
}

// SECTION 2 — GHURAIR UI ADDITIONS (END OF FILE)
// Calls the unchanged teammate handlers through hidden compatibility controls.
document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector(".race-demo");
  if (!root) return;
  const ui = window.GhurairLabUI;
  if (!ui) { console.error("Race Condition: load lab-engine.js before lab-2.js."); return; }
  const $ = ui.get;
  ui.ensureHiddenControls(root, [
    ["modeBtn", "button", "Switch to Fixed Mode"],
    ["modeStatus", "span", "Vulnerable"],
    ["normalBtn", "button", "Send Normal Request"],
    ["sequentialBtn", "button", "Send Sequential Requests"],
    ["attackBtn", "button", "Send Concurrent Requests"]
  ]);
  if (!ui.requireIds([
    "results", "timeline", "modeBtn", "modeStatus", "normalBtn", "sequentialBtn", "attackBtn",
    "vulnerableMode", "fixedMode", "runTest", "resetLab2", "codeTitle", "codeSample",
    "codeExplanation", "codeModeBadge", "fixCode", "resultTitle", "resultStatus",
    "resultMessage", "timelineDetails", "eventCount"
  ], "Race Condition")) return;
  installOriginalRaceLab();

  const controls = { mode: $("modeBtn"), normal: $("normalBtn"),
    sequential: $("sequentialBtn"), concurrent: $("attackBtn") };
  const modeButtons = [$("vulnerableMode"), $("fixedMode")];
  const testButtons = [...root.querySelectorAll("[data-test]")];
  const results = $("results"), timeline = $("timeline");
  let selectedTest = "concurrent", running = false;

  const previews = {
    vulnerable: [
      "async function applyCoupon(requestId) {",
      "  if (couponUsed) return `${requestId}: Rejected`;",
      "  logEvent(`${requestId} → Coupon available`);",
      "  await delay(100);",
      "  couponUsed = true; // BUG: reserve after await",
      "  return `${requestId}: Accepted`;",
      "}"
    ],
    fixed: [
      "async function applyCoupon(requestId) {",
      "  if (couponUsed) return `${requestId}: Rejected`;",
      "  couponUsed = true; // FIX: reserve before await",
      "  logEvent(`${requestId} → Coupon reserved`);",
      "  await delay(100);",
      "  return `${requestId}: Accepted`;",
      "}"
    ]
  };
  const explanations = {
    fixed: "Fixed: the coupon is reserved before the first asynchronous wait.",
    vulnerable: "Vulnerable: the coupon is reserved after the wait, allowing concurrent redemptions."
  };
  const activeMode = () => $("modeStatus").textContent.trim().toLowerCase() === "fixed" ? "fixed" : "vulnerable";
  const renderCode = () => ui.renderMode(activeMode(), previews, explanations);
  const renderSelection = () => ui.updateChoices(testButtons, "test", selectedTest);
  function updateEventCount() {
    const events = timeline.textContent.trim();
    const count = !events || events === "No events yet" ? 0 : events.split("\n").filter(Boolean).length;
    $("eventCount").textContent = `${count} ${count === 1 ? "event" : "events"}`;
  }
  function clearResults() {
    ui.resetResult({ title: "Waiting for your test", message: "Choose a request type and press Run Test." });
    ui.setText({ results: "No requests yet", timeline: "No events yet" });
    $("timelineDetails").open = false;
    updateEventCount();
  }
  function lockControls(value) {
    running = value;
    for (const button of [...modeButtons, ...testButtons, $("runTest"), $("resetLab2")]) button.disabled = value;
  }
  function showCompletedResult(text) {
    const accepted = (text.match(/: Accepted/g) || []).length;
    const rejected = (text.match(/: Rejected/g) || []).length;
    let result;
    if (selectedTest === "concurrent" && accepted === 2) {
      result = ["Race condition reproduced", "VULNERABLE", "Both requests redeemed SAVE50 despite its usage limit of one.", "bad"];
    } else if (selectedTest === "concurrent" && accepted === 1 && rejected === 1) {
      result = ["Duplicate redemption prevented", "PROTECTED", "Only one request was accepted; the other was rejected.", "good"];
    } else if (selectedTest === "sequential" && accepted === 1 && rejected === 1) {
      result = ["Second request rejected", "COMPLETE", "Request B started after A finished and correctly found the coupon used.", "good"];
    } else if (selectedTest === "normal" && accepted === 1) {
      result = ["Coupon redeemed once", "COMPLETE", "The normal request successfully used the coupon.", "good"];
    } else {
      result = ["Test completed", "COMPLETE", `${accepted} accepted, ${rejected} rejected.`, "neutral"];
    }
    const [title, status, message, tone] = result;
    ui.showResult({ title, status, message, tone });
    updateEventCount();
    // Keep preview and results in the same viewport: no automatic scrolling.
  }

  // The teammate's code writes the result after its async request(s) finish.
  new MutationObserver(() => {
    if (!running) return;
    const text = results.textContent.trim();
    if (!/^Request A: (Accepted|Rejected)(?:\nRequest B: (Accepted|Rejected))?$/.test(text)) return;
    const count = text.split("\n").length;
    if ((selectedTest === "normal" && count !== 1) ||
        (selectedTest !== "normal" && count !== 2)) return;
    showCompletedResult(text);
    lockControls(false);
  }).observe(results, { childList: true, characterData: true, subtree: true });
  new MutationObserver(updateEventCount).observe(timeline, {
    childList: true, characterData: true, subtree: true
  });

  ui.bindModes(wanted => {
    if (running) return;
    if (activeMode() !== wanted) controls.mode.click();
    renderCode(); clearResults();
  });
  ui.bindChoices("test", selected => {
    if (running) return;
    selectedTest = selected; renderSelection(); clearResults();
  }, root);
  $("runTest").addEventListener("click", () => {
    if (running) return;
    lockControls(true);
    ui.showResult({ title: "Running experiment", status: "RUNNING",
      message: "Processing the selected request(s)…" });
    $("timelineDetails").open = true;
    controls[selectedTest].click();  // The ONLY path to execute a request.
  });
  $("resetLab2").addEventListener("click", () => {
    if (running) return;
    if (activeMode() !== "vulnerable") controls.mode.click();
    selectedTest = "concurrent"; renderCode(); renderSelection(); clearResults();
  });
  ui.renderFixedCode(previews.fixed);
  renderCode(); renderSelection(); clearResults();
});
