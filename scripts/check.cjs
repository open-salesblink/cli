const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function check(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      check(p);
    } else if (entry.name.endsWith(".js")) {
      const result = spawnSync(process.execPath, ["--check", p], { stdio: "inherit" });
      if (result.status !== 0) process.exit(result.status || 1);
    }
  }
}

check("src");
