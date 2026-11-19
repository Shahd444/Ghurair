"use strict";

// Lab 03: Prototype Pollution.
// The two merge functions below REALLY run on the visitor's payload. They run
// on an isolated sandbox prototype, never on the page's real Object.prototype,
// so the demo is safe: nothing outside the lab object can be changed.
document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const ui = window.GhurairLabUI;

  // Attacker-controlled JSON. JSON.parse() turns "__proto__" into a normal own key.
  const payloads = {
    admin: { title: "Payload: make everyone an admin", json: '{"theme":"dark","__proto__":{"isAdmin":true}}' },
    role:  { title: "Payload: change everyone's role",    json: '{"theme":"dark","__proto__":{"role":"admin"}}' },
    debug: { title: "Payload: turn on debug mode",   json: '{"theme":"dark","__proto__":{"debug":true}}' }
  };

  // ---- The two implementations that actually run ----
  // They match the code shown on the page line for line.
  function vulnerableMerge(target, source) {
    for (const key of Object.keys(source)) {
      const value = source[key];
      if (value && typeof value === "object") {
        target[key] = target[key] || {};   // BUG: key may be "__proto__"
        vulnerableMerge(target[key], value);
      } else {
        target[key] = value;
      }
    }
  }

  const BLOCKED = ["__proto__", "constructor", "prototype"];
  function fixedMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (BLOCKED.includes(key)) continue; // FIX: skip dangerous keys
      const value = source[key];
      if (value && typeof value === "object") {
        target[key] = Object.hasOwn(target, key) ? target[key] : {};
        fixedMerge(target[key], value);
      } else {
        target[key] = value;
      }
    }
  }

  // ---- Code shown to the visitor (8-15 lines each) ----
  const code = {
    vulnerable: [
      "function merge(target, source) {",
      "  for (const key of Object.keys(source)) {",
      "    const value = source[key];",
      "    if (value && typeof value === 'object') {",
      "      target[key] = target[key] || {};   // BUG: key may be '__proto__'",
      "      merge(target[key], value);",
      "    } else {",
      "      target[key] = value;",
      "    }",
      "  }",
      "}"
    ],
    fixed: [
      "const BLOCKED = ['__proto__', 'constructor', 'prototype'];",
      "",
      "function merge(target, source) {",
      "  for (const key of Object.keys(source)) {",
      "    if (BLOCKED.includes(key)) continue; // FIX: skip dangerous keys",
      "    const value = source[key];",
      "    if (value && typeof value === 'object') {",
      "      target[key] = Object.hasOwn(target, key) ? target[key] : {};",
      "      merge(target[key], value);",
      "    } else {",
      "      target[key] = value;",
      "    }",
      "  }",
      "}"
    ]
  };

  let selectedPayload = "admin";
  let currentMode = "vulnerable";

  function renderCode() {
    const fixed = currentMode === "fixed";
    const line = ui.findLine(code[currentMode], fixed ? "// FIX" : "// BUG");
    $("codeTitle").textContent = fixed ? "Fixed code" : "Vulnerable code";
    ui.renderCode($("codeSample"), code[currentMode], fixed ? [] : [line], fixed ? [line] : []);
    ui.renderExplanation($("codeExplanation"), fixed,
      "Fix: the merge skips __proto__, constructor and prototype, so attacker input can never reach the shared prototype.",
      "Why it is vulnerable: for the key \"__proto__\", target[key] already exists (it is the shared prototype), so the merge writes attacker values straight into it.");
    ui.updateModes([$("vulnerableMode"), $("fixedMode")], fixed);
    $("codeModeBadge").textContent = fixed ? "Fixed" : "Vulnerable";
    $("codeModeBadge").className = `code-status ${fixed ? "fixed-status" : "vulnerable-status"}`;
  }

  function renderPayload() {
    ui.updateChoices(document.querySelectorAll("[data-payload]"), "payload", selectedPayload);
  }

  function resetResult() {
    $("resultTitle").textContent = "No payload run yet";
    $("resultStatus").textContent = "NOT RUN";
    $("resultStatus").className = "pp-status neutral";
    $("resultMessage").textContent = "Press Run Payload. Then check the normal user below.";
    $("roleValue").textContent = "user";
    $("adminValue").textContent = "false";
    $("debugValue").textContent = "false";
    $("consoleOutput").textContent = "Runs on a sandbox, never on the page's real Object.prototype.";
    for (const id of ["roleTile", "adminTile", "debugTile"]) $(id).className = "pp-result";
  }

  function runPayload() {
    const fixed = currentMode === "fixed";
    const selected = payloads[selectedPayload];
    const input = JSON.parse(selected.json);

    // Sandbox: one shared prototype, like Object.prototype but isolated.
    const sandboxProto = {};
    const settings = Object.create(sandboxProto);
    const user = Object.create(sandboxProto);      // a different object, same prototype

    (fixed ? fixedMerge : vulnerableMerge)(settings, input);

    // What the application would now see on an ordinary user object.
    const role = user.role || "user";
    const isAdmin = user.isAdmin === true;
    const debug = user.debug === true;
    const polluted = isAdmin || role !== "user" || debug;
    const inherited = Object.keys(sandboxProto).length > 0 && !Object.hasOwn(user, "isAdmin");
    const globalIntact = !("isAdmin" in Object.prototype) && !("role" in Object.prototype) &&
      !("debug" in Object.prototype);

    $("resultTitle").textContent = polluted ? "Prototype polluted" : "Payload blocked";
    $("resultStatus").textContent = polluted ? "VULNERABLE" : "BLOCKED";
    $("resultStatus").className = polluted ? "pp-status bad" : "pp-status good";
    $("resultMessage").textContent = polluted
      ? "A normal user that never set these values now has them, because the payload changed the shared prototype. Now switch to Fixed and run the same payload."
      : "Same payload, but the __proto__ key was skipped. The normal user is unchanged.";
    $("roleValue").textContent = role;
    $("adminValue").textContent = String(isAdmin);
    $("debugValue").textContent = String(debug);
    $("roleTile").className = role !== "user" ? "pp-result is-bad" : "pp-result";
    $("adminTile").className = isAdmin ? "pp-result is-bad" : "pp-result";
    $("debugTile").className = debug ? "pp-result is-bad" : "pp-result";
    $("consoleOutput").textContent =
      `Normal setting still merged (theme = ${settings.theme}). ` +
      `Page's real Object.prototype untouched: ${globalIntact}.` +
      (polluted ? ` The user inherited the change from the shared prototype: ${inherited}.` : "");
    $("resultPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  $("vulnerableMode").addEventListener("click", () => { currentMode = "vulnerable"; renderCode(); resetResult(); });
  $("fixedMode").addEventListener("click", () => { currentMode = "fixed"; renderCode(); resetResult(); });
  document.querySelectorAll("[data-payload]").forEach(button => {
    button.addEventListener("click", () => {
      if (!Object.hasOwn(payloads, button.dataset.payload)) return;
      selectedPayload = button.dataset.payload;
      renderPayload();
      resetResult();
    });
  });
  $("runPayload").addEventListener("click", runPayload);
  $("resetLab").addEventListener("click", () => {
    selectedPayload = "admin";
    currentMode = "vulnerable";
    renderPayload();
    renderCode();
    resetResult();
  });

  ui.renderCode($("fixCode"), code.fixed, [], [ui.findLine(code.fixed, "// FIX")]);
  renderCode();
  renderPayload();
  resetResult();
});
