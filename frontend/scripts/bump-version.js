const fs = require("fs");
const path = require("path");

// Resolve path to build.gradle whether run from root or frontend folder
const possiblePaths = [
  path.join(__dirname, "../android/app/build.gradle"),
  path.join(__dirname, "../../frontend/android/app/build.gradle"),
  path.join(process.cwd(), "android/app/build.gradle"),
  path.join(process.cwd(), "frontend/android/app/build.gradle"),
];

const gradlePath = possiblePaths.find((p) => fs.existsSync(p));

if (!gradlePath) {
  console.error("❌ Could not find android/app/build.gradle");
  process.exit(1);
}

let content = fs.readFileSync(gradlePath, "utf8");

// Match versionCode and versionName
const codeMatch = content.match(/versionCode\s+(\d+)/);
const nameMatch = content.match(/versionName\s+"([^"]+)"/);

if (!codeMatch) {
  console.error("❌ Could not find versionCode in build.gradle");
  process.exit(1);
}

const currentCode = parseInt(codeMatch[1], 10);
const newCode = currentCode + 1;

let currentName = nameMatch ? nameMatch[1] : "1.0.0";
let newName = currentName;

// Increment patch version (e.g., 1.0.3 -> 1.0.4)
const parts = currentName.split(".");
if (parts.length === 3 && !isNaN(parseInt(parts[2], 10))) {
  parts[2] = parseInt(parts[2], 10) + 1;
  newName = parts.join(".");
}

// Replace in content
content = content.replace(
  /versionCode\s+\d+([^\r\n]*)/,
  `versionCode ${newCode}       // <-- Auto-bumped for Play Console release`
);

if (nameMatch) {
  content = content.replace(
    /versionName\s+"[^"]+"/,
    `versionName "${newName}"`
  );
}

fs.writeFileSync(gradlePath, content, "utf8");

console.log("\n==========================================");
console.log("🚀 Android Version Auto-Bumped Successfully!");
console.log(`   • versionCode : ${currentCode} ➔ ${newCode}`);
console.log(`   • versionName : "${currentName}" ➔ "${newName}"`);
console.log(`   • File updated: ${gradlePath}`);
console.log("==========================================\n");
