import { config } from "../../package.json";
import { restorePatchedProgressWindow } from "./mainWindow";
import { resetRuntime } from "../app/runtime";

export function onShutdown(): void {
  // Stop runtime timers and release UI resources before teardown.
  Zotero[config.addonInstance]?.views?.onUnload?.();
  restorePatchedProgressWindow();
  resetRuntime();
  ztoolkit.unregisterAll();
  document
    .querySelectorAll("#zotero-reference-show-hide-graph-view")
    .forEach((e) => e.remove());
  addon.data.alive = false;
  addon.data.dialog?.window?.close();
  delete Zotero[config.addonInstance];
}
