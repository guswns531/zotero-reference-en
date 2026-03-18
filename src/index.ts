import { BasicTool } from "zotero-plugin-toolkit/dist/basic";
import Addon from "./addon";
import { config } from "../package.json";
import { reportError } from "./utils/errors";

const basicTool = new BasicTool();

if (!basicTool.getGlobal("Zotero")[config.addonInstance]) {
  // Set global variables
  _globalThis.Zotero = basicTool.getGlobal("Zotero");
  defineGlobal("window");
  defineGlobal("document");
  defineGlobal("ZoteroPane");
  defineGlobal("Zotero_Tabs");
  _globalThis.addon = new Addon();
  defineGlobal("ztoolkit", () => {
    return _globalThis.addon.initToolkit();
  });
  Zotero[config.addonInstance] = addon;
  // Trigger addon hook for initialization
  Promise.resolve(addon.hooks.onStartup()).catch((error) => {
    throw reportError(error, "startup");
  });
}

function defineGlobal(
  name: Parameters<BasicTool["getGlobal"]>[0] | string,
  getter?: () => any,
) {
  Object.defineProperty(_globalThis, name, {
    get() {
      return getter ? getter() : basicTool.getGlobal(name);
    },
  });
}
