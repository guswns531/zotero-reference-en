import { exit } from "process";
import { execSync } from "child_process";
import { readFileSync } from "fs";

function loadJSON(relativePath) {
  return JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), "utf-8"),
  );
}

const details = loadJSON("../package.json");
const cmd = loadJSON("./zotero-cmd.json");

const { addonID, addonName } = details.config;
const { version } = details;
const { zoteroBinPath, profilePath } = cmd.exec;

const startZotero = `"${zoteroBinPath}" --debugger --purgecaches -profile "${profilePath}"`;

const script = `
(async () => {
  Services.obs.notifyObservers(null, "startupcache-invalidate", null);
  const { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
  const addon = await AddonManager.getAddonByID("${addonID}");
  await addon.reload();
  const progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
  progressWindow.changeHeadline("${addonName} Hot Reload");
  progressWindow.progress = new progressWindow.ItemProgress(
    "chrome://zotero/skin/tick.png",
    "VERSION=${version}, BUILD=${new Date().toLocaleString()}. By zotero-plugin-toolkit"
  );
  progressWindow.progress.setProgress(100);
  progressWindow.show();
  progressWindow.startCloseTimer(5000);
})()`;

const url = `zotero://ztoolkit-debug/?run=${encodeURIComponent(script)}`;

const command = `${startZotero} -url "${url}"`;

execSync(command);
exit(0);
