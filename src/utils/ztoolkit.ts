import { BasicTool, makeHelperTool, unregister } from "zotero-plugin-toolkit/dist/basic";
import { UITool } from "zotero-plugin-toolkit/dist/tools/ui";
import { ReaderTabPanelManager } from "zotero-plugin-toolkit/dist/managers/readerTabPanel";
import { PreferencePaneManager } from "zotero-plugin-toolkit/dist/managers/preferencePane";
import { ClipboardHelper } from "zotero-plugin-toolkit/dist/helpers/clipboard";
import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { DialogHelper } from "zotero-plugin-toolkit/dist/helpers/dialog";
import { config } from "../../package.json";

export { createZToolkit };

function ensureToolkitGlobalModules() {
  const toolkitGlobal = ((Zotero as any)._toolkitGlobal ??= {});
  const modules = {
    fieldHooks: {
      _ready: false,
      getFieldHooks: {},
      setFieldHooks: {},
      isFieldOfBaseHooks: {},
    },
    itemTree: {
      _ready: false,
      columns: [],
      renderCellHooks: {},
    },
    itemBox: {
      _ready: false,
      fieldOptions: {},
    },
    shortcut: {
      _ready: false,
      eventKeys: [],
    },
    prompt: {
      _ready: false,
      instance: undefined,
    },
    readerInstance: {
      _ready: false,
      initializedHooks: {},
    },
  } as const;

  for (const [key, defaults] of Object.entries(modules)) {
    const current = ((toolkitGlobal as any)[key] ??= {});
    for (const [moduleKey, value] of Object.entries(defaults)) {
      current[moduleKey] ??= value;
    }
  }
}

class MyToolkit extends BasicTool {
  UI = new UITool(this);
  ReaderTabPanel = new ReaderTabPanelManager(this);
  PreferencePane = new PreferencePaneManager(this);
  Clipboard = makeHelperTool(ClipboardHelper, this);
  ProgressWindow = makeHelperTool(ProgressWindowHelper, this);
  Dialog = makeHelperTool(DialogHelper, this);

  unregisterAll() {
    unregister(this);
  }
}

function createZToolkit() {
  ensureToolkitGlobalModules();
  const _ztoolkit = new MyToolkit();
  initZToolkit(_ztoolkit);
  return _ztoolkit;
}

function initZToolkit(_ztoolkit: ReturnType<typeof createZToolkit>) {
  const env = __env__;
  _ztoolkit.basicOptions.log.prefix = `[${config.addonName}]`;
  _ztoolkit.basicOptions.log.disableConsole = env === "production";
  _ztoolkit.UI.basicOptions.ui.enableElementJSONLog = __env__ === "development" && false;
  _ztoolkit.UI.basicOptions.ui.enableElementDOMLog = __env__ === "development" && false;
  _ztoolkit.basicOptions.debug.disableDebugBridgePassword =
    __env__ === "development";
  _ztoolkit.basicOptions.api.pluginID = config.addonID;
  _ztoolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/favicon.png`,
  );
  _ztoolkit.ProgressWindow.setIconURI(
    "connectedpapers",
    `chrome://${config.addonRef}/content/icons/connectedpapers.png`
  );
}
