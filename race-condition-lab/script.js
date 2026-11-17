let couponUsed = false;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logEvent(message) {
  const timeline = document.getElementById("timeline");

  timeline.textContent += message + "\n";
}

async function applyCoupon(requestId) {
  logEvent(`${requestId} → Checking coupon`);

  if (couponUsed) {
    logEvent(`${requestId} → Rejected`);
    return `${requestId}: Rejected`;
  }

  logEvent(`${requestId} → Coupon available`);
  logEvent(`${requestId} → Waiting...`);

  await delay(100); // Race Window

  couponUsed = true;

  logEvent(`${requestId} → Accepted`);
  return `${requestId}: Accepted`;
}

document.getElementById("attackBtn").addEventListener("click", async () => {
  couponUsed = false;
	document.getElementById("timeline").textContent = "";

  const results = document.getElementById("results");
  results.textContent = "Processing requests...";

  const responses = await Promise.all([
    applyCoupon("Request A"),
    applyCoupon("Request B")
  ]);

  results.textContent = responses.join("\n");
});
