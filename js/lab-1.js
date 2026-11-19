"use strict";

// Local IDOR demonstration. This code simulates server responses; no real API is called.
document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const ui = window.GhurairLabUI;
  const currentUserId = 1001;
  const records = {
    1001: { slip_id: 1001, owner_id: 1001, employee: "Alex Morgan", department: "Cybersecurity & GRC", net_pay: "$4,250.00", status: "Active Full-Time" },
    1002: { slip_id: 1002, owner_id: 1002, employee: "Sam Rivera", department: "Software Engineering", net_pay: "$5,100.00", status: "Active Contractor" },
    1003: { slip_id: 1003, owner_id: 1003, employee: "Jordan Blake", department: "Executive Leadership", net_pay: "$12,400.00", status: "Executive" }
  };
  // The attack payload: ask for a record that belongs to somebody else.
  const attackTargetId = 1002;
  const vectors = {
    query: { title: "URL Query Parameter", prefix: "GET /api/payroll/view?slip_id=" },
    body:  { title: "JSON Body", prefix: "POST /api/payroll/view  JSON:" },
    token: { title: "Encoded Reference", prefix: "GET /api/payroll/view?ref=" }
  };
  // Illustrative server code. The highlighted line is found by its marker comment.
  const code = {
    vulnerable: [
      "app.all('/api/payroll/view', requireLogin, (req, res) => {",
      "  // The ID may arrive in the query string, JSON body or Base64 ref",
      "  const id = extractResourceId(req);",
      "  const record = findPaySlip(id);",
      "  if (!record) {",
      "    return res.sendStatus(404);",
      "  }",
      "  return res.json(record); // BUG: no ownership check",
      "});"
    ],
    fixed: [
      "app.all('/api/payroll/view', requireLogin, (req, res) => {",
      "  // The ID may arrive in the query string, JSON body or Base64 ref",
      "  const id = extractResourceId(req);",
      "  const record = findPaySlip(id);",
      "  if (!record) {",
      "    return res.sendStatus(404);",
      "  }",
      "  if (record.owner_id !== req.session.user_id) { // FIX",
      "    return res.sendStatus(403);",
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
    const line = ui.findLine(code[mode], fixed ? "// FIX" : "// BUG");
    ui.renderCode($("codeSample"), code[mode], fixed ? [] : [line], fixed ? [line] : []);
    ui.renderExplanation($("codeExplanation"), fixed,
      "Fix: the server compares the record's owner with the logged-in user before replying, so other users' records get 403.",
      "Why it is vulnerable: the server trusts the ID in the request and returns the record without checking that it belongs to the logged-in user.");
    ui.updateModes([$("vulnerableMode"), $("fixedMode")], fixed);
    $("codeModeBadge").textContent = fixed ? "Fixed" : "Vulnerable";
    $("codeModeBadge").className = `code-status ${fixed ? "fixed-status" : "vulnerable-status"}`;
  }

  function renderVector() {
    ui.updateChoices(document.querySelectorAll("[data-vector]"), "vector", vector);
    $("payloadTitle").textContent = vectors[vector].title;
    $("requestPrefix").textContent = vectors[vector].prefix;
    $("payloadInput").value = inputFor(attackTargetId);
    const label = document.createElement("span");
    label.className = "chip-label";
    label.textContent = "Or try:";
    $("quickChips").replaceChildren(label);
    for (const record of Object.values(records)) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "quick-chip";
      chip.textContent = `${record.slip_id} ${record.owner_id === currentUserId ? "(you)" : "(other)"}`;
      chip.addEventListener("click", () => {
        $("payloadInput").value = inputFor(record.slip_id);
        resetResult();
      });
      $("quickChips").append(chip);
    }
  }

  function resetResult() {
    $("resultTitle").textContent = "No request sent yet";
    $("resultStatus").textContent = "NOT RUN";
    $("resultStatus").className = "pp-status neutral";
    $("resultMessage").textContent = "Press Send Request to see what the server returns.";
    $("statusValue").textContent = "—";
    $("ownerValue").textContent = "—";
    $("verdictValue").textContent = "—";
    $("verdictTile").className = "pp-result";
    $("responseOutput").textContent = "Nothing yet.";
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
    $("verdictValue").textContent = exploited ? "Data leaked" : verdict === "BLOCKED" ? "Blocked" :
      verdict === "AUTHORIZED" ? "Allowed (your record)" : verdict === "NOT FOUND" ? "No such record" : "Rejected";
    $("verdictTile").className = `pp-result ${exploited ? "is-bad" : verdict === "BLOCKED" ? "is-good" : ""}`.trim();
    const response = httpStatus === 200
      ? { status: 200, vector, data: record }
      : { status: httpStatus, error: httpStatus === 403 ? "Forbidden" : httpStatus === 404 ? "Record not found" : "Invalid payload" };
    $("responseOutput").textContent = JSON.stringify(response, null, 2);
    $("resultPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function sendRequest() {
    let targetId;
    try { targetId = parseId($("payloadInput").value); }
    catch { showResult(400, null, "Enter a valid payload for the selected request type.", "INVALID"); return; }
    const record = records[targetId];
    if (!record) { showResult(404, null, "The requested record does not exist.", "NOT FOUND"); return; }
    if (mode === "fixed" && record.owner_id !== currentUserId) {
      showResult(403, record, "Same payload, but the ownership check refused it. Nothing was leaked.", "BLOCKED");
    } else if (record.owner_id !== currentUserId) {
      showResult(200, record, "Another employee's private pay slip was returned. Now switch to Fixed and send the same payload.", "IDOR EXPOSED");
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
  ui.renderCode($("fixCode"), code.fixed, [], [ui.findLine(code.fixed, "// FIX")]);
  renderVector(); renderCode(); resetResult();
});
