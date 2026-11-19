"use strict";

// Ghurair Lab 03: safe simulation of prototype-pollution outcomes.
// This does not call or modify the teammate's original lab-3.js.

document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const ui = window.GhurairLabUI;

  const payloads = {
    admin: {
      title: "isAdmin Payload",
      json: '{"theme":"dark","__proto__":{"isAdmin":true}}'
    },
    role: {
      title: "Role Payload",
      json: '{"theme":"dark","__proto__":{"role":"admin"}}'
    },
    debug: {
      title: "Debug Payload",
      json: '{"theme":"dark","__proto__":{"debug":true}}'
    }
  };

  // These snippets explain the concept; the interactive test below is a safe model.
  const vulnerableCode = [
    "function unsafeMerge(target, source) {",
    "  for (const key of Object.keys(source)) {",
    "    const value = source[key];",
    "    if (value && typeof value === 'object') {",
    "      target[key] = target[key] || {}; // vulnerable",
    "      unsafeMerge(target[key], value);",
    "    } else {",
    "      target[key] = value;",
    "    }",
    "  }",
    "}"
  ];

  const fixedCode = [
    "function safeMerge(target, source) {",
    "  const blocked = ['__proto__', 'constructor', 'prototype'];",
    "  for (const key of Object.keys(source)) {",
    "    if (blocked.includes(key)) continue; // blocked",
    "    const value = source[key];",
    "    if (value && typeof value === 'object') {",
    "      target[key] = Object.create(null);",
    "      safeMerge(target[key], value);",
    "    } else {",
    "      target[key] = value;",
    "    }",
    "  }",
    "}"
  ];

  let selectedPayload = "admin";
  let currentMode = "vulnerable";

  function renderCode() {
    const fixed = currentMode === "fixed";
    $("codeTitle").textContent = fixed ? "Fixed code" : "Vulnerable code";
    ui.renderCode($("codeSample"), fixed ? fixedCode : vulnerableCode,
      fixed ? [] : [4], fixed ? [3] : []);
    ui.renderExplanation($("codeExplanation"), fixed,
      "The secure version rejects dangerous keys before merging.",
      "Unsafe recursive merging may follow inherited properties.");
    ui.updateModes([$("vulnerableMode"), $("fixedMode")], fixed);
  }

  function renderPayload() {
    const selected = payloads[selectedPayload];
    $("payloadTitle").textContent = selected.title;
    $("payloadPreview").textContent = JSON.stringify(
      JSON.parse(selected.json), null, 2
    );
    ui.updateChoices(document.querySelectorAll("[data-payload]"), "payload", selectedPayload);
  }

  function resetResult() {
    $("resultTitle").textContent = "Waiting for your test";
    $("resultStatus").textContent = "NOT RUN";
    $("resultStatus").className = "pp-status neutral";
    $("resultMessage").textContent = "Select a payload and press Run Payload.";
    $("roleValue").textContent = "user";
    $("adminValue").textContent = "false";
    $("sourceValue").textContent = "Default";
    $("consoleOutput").textContent = "No payload has been executed.";
  }

  // Detect dangerous keys without accessing inherited object properties.
  function hasDangerousKey(value) {
    if (!value || typeof value !== "object") return false;
    const blocked = new Set(["__proto__", "constructor", "prototype"]);
    return Object.keys(value).some(
      key => blocked.has(key) || hasDangerousKey(value[key])
    );
  }

  function runPayload() {
    const selected = payloads[selectedPayload];
    let input;
    try {
      input = JSON.parse(selected.json);
    } catch (error) {
      $("resultTitle").textContent = "Invalid JSON";
      $("resultStatus").textContent = "ERROR";
      $("resultStatus").className = "pp-status bad";
      $("resultMessage").textContent = "The selected JSON could not be parsed.";
      $("consoleOutput").textContent = String(error);
      return;
    }

    const dangerous = hasDangerousKey(input);
    const fixed = currentMode === "fixed";
    const inherited = Object.create(null);

    // Safe model: copy attacker-controlled values into a null-prototype
    // dictionary, NOT onto the browser's Object.prototype.
    if (!fixed && dangerous) {
      let values = null;
      if (Object.hasOwn(input, "__proto__")) {
        values = input["__proto__"];
      } else if (Object.hasOwn(input, "constructor") &&
                 Object.hasOwn(input.constructor, "prototype")) {
        values = input.constructor.prototype;
      }
      if (values && typeof values === "object") {
        for (const [key, value] of Object.entries(values)) {
          inherited[key] = value;
        }
      }
    }

    const isAdmin = inherited.isAdmin === true;
    const role = inherited.role || "user";
    const debug = inherited.debug === true;
    const simulated = dangerous && !fixed;

    $("resultTitle").textContent = fixed && dangerous
      ? "Payload blocked"
      : simulated ? "Simulated prototype pollution" : "No effect";
    $("resultStatus").textContent = fixed && dangerous
      ? "BLOCKED" : simulated ? "VULNERABLE" : "NO EFFECT";
    $("resultStatus").className = simulated
      ? "pp-status bad" : "pp-status good";
    $("resultMessage").textContent = fixed && dangerous
      ? "Dangerous keys were rejected. Application values remain unchanged."
      : simulated
        ? "Attacker-controlled values are represented as inherited properties."
        : "No dangerous key was found.";
    $("roleValue").textContent = role;
    $("adminValue").textContent = String(isAdmin);
    $("sourceValue").textContent = simulated ? "Simulated inherited" : "Default";
    $("consoleOutput").textContent =
      `Payload: ${selected.title} | Mode: ${currentMode} | ` +
      `role: ${role} | isAdmin: ${isAdmin} | debug: ${debug}`;
  }

  $("vulnerableMode").addEventListener("click", () => {
    currentMode = "vulnerable";
    renderCode();
    resetResult();
  });

  $("fixedMode").addEventListener("click", () => {
    currentMode = "fixed";
    renderCode();
    resetResult();
  });

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

  renderCode();
  renderPayload();
  resetResult();
});
