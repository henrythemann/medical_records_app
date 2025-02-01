const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function installDepcheck() {
  console.log("Installing depcheck...");
  execSync("npm install --save-dev depcheck");
}

function removeDepcheck() {
  console.log("Removing depcheck...");
  execSync("npm uninstall --save-dev depcheck");
}

// Main logic wrapped in a try-finally block
(async function () {
  try {
    installDepcheck();

    // Dynamically require depcheck after installing it
    const depcheck = require("depcheck");

    const options = {
      // Use aliases dynamically loaded from Vite
      detectors: [
        depcheck.detector.importDeclaration,
        depcheck.detector.requireCallExpression,
      ],
    };

    depcheck(process.cwd(), options, (unused) => {
      console.log("Unused dependencies:", unused.dependencies);
      console.log("Unused devDependencies:", unused.devDependencies);
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    // Clean up depcheck installation
    removeDepcheck();
  }
})();
