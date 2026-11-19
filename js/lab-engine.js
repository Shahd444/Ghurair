// Shared lab behavior belongs here: mode switching, payloads, results, and reset.
"use strict";

/**
 * Shared, presentation-only helpers for Ghurair's three browser-based labs.
 * No lab business logic, API calls, or automatic tests live in this file.
 * Keep the educational simulators independent of these DOM utilities.
 */
(function registerLabUI(global) {
  function renderCode(container, lines, dangerLines = [], safeLines = []) {
    container.replaceChildren();
    lines.forEach((line, index) => {
      const span = document.createElement("span");
      span.className = "pp-line";
      if (dangerLines.includes(index)) span.classList.add("pp-danger");
      if (safeLines.includes(index)) span.classList.add("pp-safe");
      span.textContent = `${String(index + 1).padStart(2, "0")}  ${line}`;
      container.append(span);
    });
  }

  function updateModes(buttons, fixed) {
    for (const button of buttons) {
      const selected = button.id === (fixed ? "fixedMode" : "vulnerableMode");
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  }

  function updateChoices(buttons, attribute, selectedValue) {
    for (const button of buttons) {
      const selected = button.dataset[attribute] === selectedValue;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  }

  function renderExplanation(container, fixed, safeText, vulnerableText) {
    const dot = document.createElement("span");
    dot.className = fixed ? "pp-dot safe" : "pp-dot";
    const explanation = document.createElement("span");
    explanation.textContent = fixed ? safeText : vulnerableText;
    container.replaceChildren(dot, explanation);
  }

  // Index of the first code line containing `marker` (e.g. "// BUG"), or -1.
  // Lets each lab highlight its key line by marker instead of a hard-coded number.
  function findLine(lines, marker) {
    return lines.findIndex(line => line.includes(marker));
  }

  global.GhurairLabUI = Object.freeze({
    findLine,
    renderCode,
    updateModes,
    updateChoices,
    renderExplanation
  });
})(window);
