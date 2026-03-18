/**
 * Most of this code is from Zotero team's official Make It Red example[1]
 * or the Zotero 7 documentation[2].
 * [1] https://github.com/zotero/make-it-red
 * [2] https://www.zotero.org/support/dev/zotero_7_for_developers
 */

var chromeHandle;

function logBootstrap(message, error) {
  try {
    const details =
      error && (error.stack || error.message || String(error))
        ? ` :: ${error.stack || error.message || String(error)}`
        : "";
    const text = `[zoteroreference bootstrap] ${message}${details}`;
    Services.console.logStringMessage(text);
    if (error) {
      Zotero?.logError?.(error);
      console.error(text, error);
    }
  } catch {}
}

function install(data, reason) {}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  logBootstrap("startup begin");
  await Zotero.initializationPromise;

  // String 'rootURI' introduced in Zotero 7
  if (!rootURI) {
    rootURI = resourceURI.spec;
  }

  var aomStartup = Components.classes[
    "@mozilla.org/addons/addon-manager-startup;1"
  ].getService(Components.interfaces.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + "manifest.json");
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ["content", "zoteroreference", rootURI + "chrome/content/"],
  ]);

  /**
   * Global variables for plugin code.
   * The `_globalThis` is the global root variable of the plugin sandbox environment
   * and all child variables assigned to it is globally accessible.
   * See `src/index.ts` for details.
   */
  const ctx = {
    rootURI,
    process: {
      env: {},
    },
  };
  ctx._globalThis = ctx;
  try {
    Services.scriptloader.loadSubScript(
      `${rootURI}/chrome/content/scripts/zoteroreference.js`,
      ctx,
    );
    logBootstrap("subscript loaded");
  } catch (error) {
    logBootstrap("subscript load failed", error);
    throw error;
  }
}

async function onMainWindowLoad({ window }, reason) {
  logBootstrap("main window load");
  try {
    await Zotero.ZoteroReference?.hooks.onMainWindowLoad(window);
  } catch (error) {
    logBootstrap("main window load failed", error);
    throw error;
  }
}

async function onMainWindowUnload({ window }, reason) {
  logBootstrap("main window unload");
  Zotero.ZoteroReference?.hooks.onMainWindowUnload(window);
}

function shutdown({ id, version, resourceURI, rootURI }, reason) {
  logBootstrap(`shutdown reason=${reason}`);
  if (reason === APP_SHUTDOWN) {
    return;
  }

  if (typeof Zotero === "undefined") {
    Zotero = Components.classes["@zotero.org/Zotero;1"].getService(
      Components.interfaces.nsISupports,
    ).wrappedJSObject;
  }
  Zotero.ZoteroReference?.hooks.onShutdown();

  Cc["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .flushBundles();

  Cu.unload(`${rootURI}/chrome/content/scripts/zoteroreference.js`);

  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
}

function uninstall(data, reason) {}
