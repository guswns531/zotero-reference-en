import { initializePreferencePane } from "./prefs";
import { onMainWindowLoad } from "./mainWindow";
import { reportError } from "../utils/errors";

async function waitForZoteroUI() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
}

export async function onStartup() {
  try {
    await waitForZoteroUI();
    addon.initToolkit();
    initializePreferencePane();
    await onMainWindowLoad(window);
  } catch (error) {
    throw reportError(error, "lifecycle.startup");
  }
}
