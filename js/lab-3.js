const demoPrototype = {};

//both inherit from the same prototype
//for app settings theme language etc
const settings = Object.create(demoPrototype);
const user = Object.create(demoPrototype);

//vulnerable recursive merge
function unsafeMerge(target, source) {

    //loop through every own property in the source
    for (const key of Object.keys(source)) {

        //if the value is a nested object
        if (source[key] !== null &&
            typeof source[key] === "object" &&
            !Array.isArray(source[key])) {

            //reuse an existing object or create a new one
            target[key] = target[key] || {};

            //merge the nested object recursively
            unsafeMerge(target[key], source[key]);

        } else {

            //copy normal values
            target[key] = source[key];
        }
    }
}

//attacker-controlled JSON payload
const payload = JSON.parse(
    '{"theme":"dark","__proto__":{"isAdmin":true}}'
);

//execute the vulnerable merge
unsafeMerge(settings, payload);

console.log("=== VULNERABLE VERSION ===");
console.log("Settings theme:", settings.theme);
console.log("User isAdmin:", user.isAdmin);

console.log(
    "User owns isAdmin:",
    Object.hasOwn(user, "isAdmin")
);

//Separate prototype for fixed
const fixedDemoPrototype = {};

//Separate objects
const fixedSettings = Object.create(fixedDemoPrototype);
const fixedUser = Object.create(fixedDemoPrototype);

//dangerous property names
const blockedKeys = new Set([
    "__proto__",
    "constructor",
    "prototype"
]);

//Safe recursive merge
function safeMerge(target, source) {

    for (const key of Object.keys(source)) {

        //reject dangerous property names
        if (blockedKeys.has(key)) {
            continue;
        }

        const value = source[key];

        //handle nested objects
        if (value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)) {

            //reuse only an existing own object
            if (
                !Object.hasOwn(target, key) ||
                target[key] === null ||
                typeof target[key] !== "object" ||
                Array.isArray(target[key])
            ) {
                target[key] = Object.create(null);
            }

            //continue recursively
            safeMerge(target[key], value);

        } else {

            //copy allowed values
            target[key] = value;
        }
    }
}

//Use THE SAME payload
safeMerge(fixedSettings, payload);

//check the result
console.log("=== FIXED VERSION ===");

console.log("Settings theme:", fixedSettings.theme);
console.log("User isAdmin:", fixedUser.isAdmin);

console.log(
    "User owns isAdmin:",
    Object.hasOwn(fixedUser, "isAdmin")
);
