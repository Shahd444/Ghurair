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
