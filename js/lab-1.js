"use strict";

// Local IDOR demonstration. This code simulates server responses; no real API is called.
document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const ui = window.GhurairLabUI;
  const currentUserId = 1001;
  const records = {
    1001: { slip_id: 1001, owner_id: 1001, employee: "Yazan Kalbouneh", department: "Cybersecurity & GRC", net_pay: "$4,250.00", status: "Active Full-Time" },
    1002: { slip_id: 1002, owner_id: 1002, employee: "Hamza Almuhisen", department: "Software Engineering", net_pay: "$5,100.00", status: "Active Contractor" },
    1003: { slip_id: 1003, owner_id: 1003, employee: "Marcus Sterling", department: "Executive Leadership", net_pay: "$12,400.00", status: "Executive" }
  };
  const vectors = {
    query: { title: "URL Query Parameter", prefix: "GET /api/payroll/view?slip_id=" },
    body:  { title: "JSON Body", prefix: "POST /api/payroll/view  JSON:" },
    token: { title: "Encoded Reference", prefix: "GET /api/payroll/view?ref=" }
  };
  const code = {
    vulnerable: [
      "app.all('/api/payroll/view', (req, res) => {",
      "  const id = extractResourceId(req);",
      "  const record = findPaySlip(id);",
      "  if (!record) return res.sendStatus(404);",
      "  // Missing: ownership authorization",
      "  return res.json(record); // VULNERABLE",
      "});"
    ],
    fixed: [
      "app.all('/api/payroll/view', (req, res) => {",
      "  const id = extractResourceId(req);",
      "  const record = findPaySlip(id);",
      "  if (!record) return res.sendStatus(404);",
      "  if (record.owner_id !== req.session.user_id) {",
      "    return res.sendStatus(403); // PROTECTED",
      "  }",
      "  return res.json(record);",
      "});"
    ]
  };
  let vector = "query";
  let mode = "vulnerable";

  function encode(id) { return btoa(String(id)); }
  function inputFor(id) {
    return vector === "query" ? String(id) :
      vector === "body" ? JSON.stringify({ slip_id: id }) : encode(id);
  }
  function renderCode() {
    const fixed = mode === "fixed";
    $("codeTitle").textContent = fixed ? "Fixed code" : "Vulnerable code";
    ui.renderCode($("codeSample"), code[mode],
      fixed ? [] : [5], fixed ? [4, 5] : []);
    ui.renderExplanation($("codeExplanation"), fixed,
      "The server verifies resource ownership before disclosing a record.",
      "The server looks up the requested record but does not verify ownership.");
    ui.updateModes([$("vulnerableMode"), $("fixedMode")], fixed);
  }

  function renderVector() {
    ui.updateChoices(document.querySelectorAll("[data-vector]"), "vector", vector);
    $("payloadTitle").textContent = vectors[vector].title;
    $("requestPrefix").textContent = vectors[vector].prefix;
    $("payloadInput").value = inputFor(1001);
    $("quickChips").replaceChildren();
    for (const record of Object.values(records)) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "quick-chip";
      chip.textContent = `${record.slip_id} ${record.owner_id === currentUserId ? "(You)" : "(Other user)"}`;
      chip.addEventListener("click", () => {
        $("payloadInput").value = inputFor(record.slip_id);
        resetResult();
      });
      $("quickChips").append(chip);
    }
  }

  function resetResult() {
    $("resultTitle").textContent = "Waiting for your request";
    $("resultStatus").textContent = "NOT RUN";
    $("resultStatus").className = "pp-status neutral";
    $("resultMessage").textContent = "Choose a record and click Send Request.";
    $("statusValue").textContent = "—";
    $("ownerValue").textContent = "—";
    $("verdictValue").textContent = "Not run";
    $("responseOutput").textContent = "No request has been executed.";
    $("consoleOutput").textContent = "No request has been executed.";
  }

  function parseId(raw) {
    let value = raw.trim();
    if (vector === "body") {
      const data = JSON.parse(value);
      if (!data || typeof data !== "object" || !Object.hasOwn(data, "slip_id")) throw Error("Missing slip_id");
      value = String(data.slip_id);
    } else if (vector === "token") {
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) throw Error("Invalid Base64 token");
      value = atob(value);
    }
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw Error("Invalid record ID");
    return Number(value);
  }

  function showResult(httpStatus, record, message, verdict) {
    const exploited = verdict === "IDOR EXPOSED";
    $("resultTitle").textContent = verdict === "AUTHORIZED" ? "Authorized access" :
      exploited ? "IDOR vulnerability demonstrated" :
      httpStatus === 403 ? "Unauthorized request blocked" :
      httpStatus === 404 ? "Record not found" : "Invalid request";
    $("resultStatus").textContent = `HTTP ${httpStatus}`;
    const tone = exploited || httpStatus === 400 ? "bad" :
      verdict === "BLOCKED" || httpStatus === 200 ? "good" : "neutral";
    $("resultStatus").className = `pp-status ${tone}`;
    $("resultMessage").textContent = message;
    $("statusValue").textContent = String(httpStatus);
    $("ownerValue").textContent = record ? `#${record.owner_id}` : "—";
    $("verdictValue").textContent = verdict;
    const response = httpStatus === 200
      ? { status: 200, vector, data: record }
      : { status: httpStatus, error: httpStatus === 403 ? "Forbidden" : httpStatus === 404 ? "Record not found" : "Invalid payload" };
    $("responseOutput").textContent = JSON.stringify(response, null, 2);
    $("consoleOutput").textContent = `${vectors[vector].title} | ${mode} | HTTP ${httpStatus} | ${verdict}`;
  }

  function sendRequest() {
    let targetId;
    try { targetId = parseId($("payloadInput").value); }
    catch { showResult(400, null, "Enter a valid payload for the selected request type.", "INVALID"); return; }
    const record = records[targetId];
    if (!record) { showResult(404, null, "The requested record does not exist.", "NOT FOUND"); return; }
    if (mode === "fixed" && record.owner_id !== currentUserId) {
      showResult(403, record, "Ownership check denied access to another user's record.", "BLOCKED");
    } else if (record.owner_id !== currentUserId) {
      showResult(200, record, "Vulnerable mode exposed another employee's private pay slip.", "IDOR EXPOSED");
    } else {
      showResult(200, record, "You are permitted to access your own record.", "AUTHORIZED");
    }
  }

  document.querySelectorAll("[data-vector]").forEach(button => {
    button.addEventListener("click", () => { vector = button.dataset.vector; renderVector(); resetResult(); });
  });
  $("vulnerableMode").addEventListener("click", () => { mode = "vulnerable"; renderCode(); resetResult(); });
  $("fixedMode").addEventListener("click", () => { mode = "fixed"; renderCode(); resetResult(); });
  $("sendRequest").addEventListener("click", sendRequest);
  $("payloadInput").addEventListener("keydown", event => { if (event.key === "Enter") sendRequest(); });
  $("resetLab").addEventListener("click", () => {
    vector = "query"; mode = "vulnerable"; renderVector(); renderCode(); resetResult();
  });
  renderVector(); renderCode(); resetResult();
});
