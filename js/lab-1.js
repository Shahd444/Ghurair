
// IDOR Lab - Interactive Security Simulation

"use strict";

// Simulated database: no real user information.
const profiles = {
    1001: {
        id: 1001,
        name: "Alice",
        email: "alice@example.test",
        role: "Student"
    },
    1002: {
        id: 1002,
        name: "Bob",
        email: "bob@example.test",
        role: "Student"
    },
    1003: {
        id: 1003,
        name: "Charlie",
        email: "charlie@example.test",
        role: "Admin"
    }
};

// The authenticated user is always Alice.
const currentUser = {
    id: 1001,
    name: "Alice"
};

let securityMode = "vulnerable";

// DOM elements
const profileInput = document.getElementById("profile-id");
const vulnerableBtn = document.getElementById("vulnerable-btn");
const fixedBtn = document.getElementById("fixed-btn");
const modeStatus = document.getElementById("mode-status");
const runBtn = document.getElementById("run-payload");
const tryFixedBtn = document.getElementById("try-fixed");

const resultStatus = document.getElementById("result-status");
const resultMessage = document.getElementById("result-message");
const resultData = document.getElementById("result-data");

const payloadButtons = document.querySelectorAll(
    "[data-profile]"
);

// Validate the simulated profile identifier.
function parseProfileId(value) {
    const raw = String(value).trim();

    if (!/^\d+$/.test(raw)) {
        return null;
    }

    const id = Number(raw);

    return Number.isSafeInteger(id) && id > 0
        ? id
        : null;
}

// Vulnerable implementation: no ownership check.
function getVulnerableProfile(requestedId) {
    const id = parseProfileId(requestedId);

    if (id === null) {
        return {
            status: 400,
            message: "Invalid profile ID."
        };
    }

    const profile = profiles[id];

    if (!profile) {
        return {
            status: 404,
            message: "Profile not found."
        };
    }

    return {
        status: 200,
        message: "Profile retrieved successfully.",
        profile
    };
}

// Fixed implementation: checks resource ownership.
function getFixedProfile(requestedId) {
    const id = parseProfileId(requestedId);

    if (id === null) {
        return {
            status: 400,
            message: "Invalid profile ID."
        };
    }

    if (id !== currentUser.id) {
        return {
            status: 403,
            message: "Access denied. You do not own this profile."
        };
    }

    const profile = profiles[id];

    if (!profile) {
        return {
            status: 404,
            message: "Profile not found."
        };
    }

    return {
        status: 200,
        message: "Authorized profile retrieved.",
        profile
    };
}

// Clear the previous simulation result.
function resetResult() {
    resultStatus.textContent = "Ready";

    resultMessage.textContent =
        "Select a profile and run the payload.";

    resultMessage.className = "";
    resultData.textContent = "";
}

// Switch between vulnerable and fixed behavior.
function setSecurityMode(mode) {
    securityMode = mode;

    const isFixed = mode === "fixed";

    vulnerableBtn.classList.toggle("active", !isFixed);
    fixedBtn.classList.toggle("active", isFixed);

    vulnerableBtn.setAttribute(
        "aria-pressed",
        String(!isFixed)
    );

    fixedBtn.setAttribute(
        "aria-pressed",
        String(isFixed)
    );

    modeStatus.textContent = isFixed
        ? "Fixed"
        : "Vulnerable";

    modeStatus.className = isFixed
        ? "mode-badge mode-fixed"
        : "mode-badge mode-vulnerable";

    resetResult();
}

// Display the result safely using textContent.
function displayResult(response, requestedId) {
    resultStatus.textContent =
        `${response.status} ${
            response.status === 200 ? "OK" :
            response.status === 403 ? "Forbidden" :
            response.status === 404 ? "Not Found" :
            "Bad Request"
        }`;

    resultData.textContent = "";

    if (response.status !== 200) {
        resultMessage.textContent = response.message;
        resultMessage.className = "result-error";
        return;
    }

    const unauthorized =
        requestedId !== currentUser.id;

    if (unauthorized) {
        resultMessage.textContent =
            "IDOR demonstrated: another user's profile was exposed.";

        resultMessage.className = "result-error";
    } else {
        resultMessage.textContent =
            "Your own profile was accessed successfully.";

        resultMessage.className = "result-success";
    }

    resultData.textContent = JSON.stringify(
        response.profile,
        null,
        2
    );
}

// Execute the same payload in either security mode.
function runPayload() {
    const requestedId = parseProfileId(profileInput.value);

    const response = securityMode === "vulnerable"
        ? getVulnerableProfile(profileInput.value)
        : getFixedProfile(profileInput.value);

    displayResult(response, requestedId);
}

// Payload selection.
payloadButtons.forEach(button => {
    button.addEventListener("click", () => {
        profileInput.value = button.dataset.profile;

        payloadButtons.forEach(item => {
            item.classList.remove("selected");
        });

        button.classList.add("selected");
        resetResult();
    });
});

// Update selected payload when input changes.
profileInput.addEventListener("input", () => {
    payloadButtons.forEach(button => {
        button.classList.toggle(
            "selected",
            button.dataset.profile === profileInput.value
        );
    });

    resetResult();
});

// Security mode controls.
vulnerableBtn.addEventListener("click", () => {
    setSecurityMode("vulnerable");
});

fixedBtn.addEventListener("click", () => {
    setSecurityMode("fixed");
});

// Execute payload.
runBtn.addEventListener("click", runPayload);

// Test fixed implementation.
tryFixedBtn.addEventListener("click", () => {
    setSecurityMode("fixed");

    document.getElementById("simulation").scrollIntoView({
        behavior: window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches ? "auto" : "smooth"
    });
});

// Initial state.
setSecurityMode("vulnerable");
