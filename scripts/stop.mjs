import process from "process";
import { execSync } from "child_process";
import { readFileSync } from "fs";

function loadJSON(relativePath) {
  return JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), "utf-8"),
  );
}

const cmd = loadJSON("./zotero-cmd.json");
const { killZoteroWindows, killZoteroUnix } = cmd;

try {
  if (process.platform === "win32") {
    execSync(killZoteroWindows);
  } else {
    execSync(killZoteroUnix);
  }
} catch (e) {
  console.error(e);
}
