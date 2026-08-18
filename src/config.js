import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".salesblink");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

let permissionWarningEmitted = false;

function checkConfigPermissions() {
  if (permissionWarningEmitted) return;
  try {
    if (!existsSync(CONFIG_PATH)) return;
    const stat = statSync(CONFIG_PATH);
    const mode = stat.mode & 0o777;
    if (mode & 0o044) {
      process.stderr.write(
        "Warning: ~/.salesblink/config.json is world-readable. Run: chmod 600 ~/.salesblink/config.json\n",
      );
      permissionWarningEmitted = true;
    }
  } catch {
    // ignore
  }
}

export function readConfig() {
  try {
    if (!existsSync(CONFIG_PATH)) return {};
    checkConfigPermissions();
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return {};
  }
}

export function writeConfig(config) {
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", {
    encoding: "utf-8",
    mode: 0o600,
  });
  chmodSync(CONFIG_PATH, 0o600);
}

export function getConfigValue(key) {
  return readConfig()[key];
}

export function setConfigValue(key, value) {
  const config = readConfig();
  config[key] = value;
  writeConfig(config);
}

export function clearConfig() {
  writeConfig({});
}
