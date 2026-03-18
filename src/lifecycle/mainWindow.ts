import { initializeRuntime } from "../app/runtime";
import { reportError } from "../utils/errors";

let originalProgressWindowShow: typeof ztoolkit.ProgressWindow.prototype.show | undefined;
let progressWindowShowPatched = false;

async function waitForZoteroUI() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
}

function patchProgressWindow() {
  if (progressWindowShowPatched) {
    return;
  }

  originalProgressWindowShow = ztoolkit.ProgressWindow.prototype.show;
  ztoolkit.ProgressWindow.prototype.show = function () {
    Zotero.ProgressWindowSet.closeAll();
    return originalProgressWindowShow!.call(this, ...arguments);
  };
  progressWindowShowPatched = true;
}

export async function onMainWindowLoad(_win: Window): Promise<void> {
  try {
    await waitForZoteroUI();
    patchProgressWindow();
    await initializeRuntime();
  } catch (error) {
    throw reportError(error, "lifecycle.mainWindowLoad");
  }
}

export async function onMainWindowUnload(_win: Window): Promise<void> {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
}

export function restorePatchedProgressWindow() {
  if (progressWindowShowPatched && originalProgressWindowShow) {
    ztoolkit.ProgressWindow.prototype.show = originalProgressWindowShow;
    progressWindowShowPatched = false;
    originalProgressWindowShow = undefined;
  }
}
