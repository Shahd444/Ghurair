
// Payloads are raw JSON strings.
// JSON.parse creates an own "__proto__" property from these strings.
const payloads = {
    admin: '{"theme":"dark","__proto__":{"isAdmin":true}}',
    role: '{"theme":"dark","__proto__":{"role":"admin"}}',
    debug: '{"theme":"dark","__proto__":{"debug":true}}'
};

let selectedPayload = "admin";
let selectedMode = "vulnerable";

//vulnerable recursive merge
function unsafeMerge(target, source) {
    for (const key of Object.keys(source)) {

        if (
            source[key] !== null &&
            typeof source[key] === "object" &&
            !Array.isArray(source[key])
        ) {
            //vulnerable line: does not protect against "__proto__"
            target[key] = target[key] || {};

            unsafeMerge(target[key], source[key]);

        } else {
            target[key] = source[key];
        }
    }
}

//fixed recursive merge
const blockedKeys = new Set([
    "__proto__",
    "constructor",
    "prototype"
]);

function safeMerge(target, source) {
    for (const key of Object.keys(source)) {

        //reject dangerous property names
        if (blockedKeys.has(key)) {
            continue;
        }

        const value = source[key];

        if (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            //reuse only an existing own object
            if (
                !Object.hasOwn(target, key) ||
                target[key] === null ||
                typeof target[key] !== "object" ||
                Array.isArray(target[key])
            ) {
                target[key] = Object.create(null);
            }

            safeMerge(target[key], value);

        } else {
            target[key] = value;
        }
    }
}

//run the selected payload
function runPrototypeLab(mode, payloadText) {
    //fresh prototype and objects for every execution
    const demoPrototype = {};

    const settings = Object.create(demoPrototype);
    const user = Object.create(demoPrototype);

    //parse the attacker-controlled JSON
    let payload;

    try {
        payload = JSON.parse(payloadText);
    } catch {
        return "Invalid JSON payload.";
    }

    //execute the selected version
    if (mode === "vulnerable") {
        unsafeMerge(settings, payload);
    } else {
        safeMerge(settings, payload);
    }

    //find the injected property inside the payload
    const injectedProperties = payload["__proto__"];

    const propertyName =
        injectedProperties &&
        typeof injectedProperties === "object"
            ? Object.keys(injectedProperties)[0]
            : null;

    if (!propertyName) {
        return "No test property found in the payload.";
    }

    //check whether the shared prototype was modified
    const polluted = Object.hasOwn(
        demoPrototype,
        propertyName
    );

    //check whether the user inherits the property
    const inherited =
        !Object.hasOwn(user, propertyName) &&
        propertyName in user;

    const value = user[propertyName];

    return {
        mode,
        theme: settings.theme,
        property: propertyName,
        value: value === undefined ? "undefined" : value,
        polluted,
        inherited,
        userOwnsProperty: Object.hasOwn(user, propertyName)
    };
}

//update the displayed result
const payloadDisplay = document.getElementById("payload-display");
const resultOutput = document.getElementById("result-output");

function updatePayloadDisplay() {
    payloadDisplay.textContent = payloads[selectedPayload];
}

function runSelectedPayload() {
    const result = runPrototypeLab(
        selectedMode,
        payloads[selectedPayload]
    );

    resultOutput.textContent =
        typeof result === "string"
            ? result
            : [
                `Mode: ${result.mode}`,
                `Settings theme: ${result.theme}`,
                `Tested property: ${result.property}`,
                `User value: ${result.value}`,
                `Prototype polluted: ${result.polluted}`,
                `User inherits property: ${result.inherited}`,
                `User owns property: ${result.userOwnsProperty}`
            ].join("\n");
}

//payload button events
document.querySelectorAll("[data-payload]").forEach(button => {
    button.addEventListener("click", () => {
        selectedPayload = button.dataset.payload;
        updatePayloadDisplay();
        runSelectedPayload();
    });
});

//version button events
document.querySelectorAll("[data-mode]").forEach(button => {
    button.addEventListener("click", () => {
        selectedMode = button.dataset.mode;

        document.querySelectorAll("[data-mode]").forEach(btn => {
            btn.setAttribute(
                "aria-pressed",
                btn.dataset.mode === selectedMode ? "true" : "false"
            );
        });

        runSelectedPayload();
    });
});

//run button
document
    .getElementById("run-button")
    .addEventListener("click", runSelectedPayload);

//initial display
updatePayloadDisplay();
runSelectedPayload();
