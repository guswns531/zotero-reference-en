import { config } from "../../package.json";
import {
  clearSemanticScholarApiKeyForPreferences,
  clearSemanticScholarLogsForPreferences,
  loadSemanticScholarApiKeyForPreferences,
  loadSemanticScholarLogsForPreferences,
  saveSemanticScholarApiKeyForPreferences,
} from "../features/references/semanticScholar";


export function registerPrefs() {
  const prefOptions = {
    pluginID: config.addonID,
    src: rootURI + "chrome/content/preferences.xhtml",
    label: "Reference",
    image: `chrome://${config.addonRef}/content/icons/favicon.png`,
    // extraDTD: [`chrome://${config.addonRef}/locale/overlay.dtd`],
    // defaultXUL: true,
  };
  ztoolkit.PreferencePane.register(prefOptions);
}

export function registerPrefsScripts(_window: Window) {
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
      columns: [],
      rows: [],
    };
  } else {
    addon.data.prefs.window = _window;
  }
  const doc = addon.data.prefs!.window.document
  const input = doc.querySelector(`#${config.addonRef}-semantic-scholar-api-key`) as HTMLInputElement | null;
  const saveButton = doc.querySelector(`#${config.addonRef}-semantic-scholar-api-key-save`) as HTMLButtonElement | null;
  const clearButton = doc.querySelector(`#${config.addonRef}-semantic-scholar-api-key-clear`) as HTMLButtonElement | null;
  const status = doc.querySelector(`#${config.addonRef}-semantic-scholar-api-key-status`) as HTMLSpanElement | null;
  const logBox = doc.querySelector(`#${config.addonRef}-semantic-scholar-logs`) as HTMLTextAreaElement | null;
  const refreshLogsButton = doc.querySelector(`#${config.addonRef}-semantic-scholar-logs-refresh`) as HTMLButtonElement | null;
  const clearLogsButton = doc.querySelector(`#${config.addonRef}-semantic-scholar-logs-clear`) as HTMLButtonElement | null;

  if (!input || !saveButton || !clearButton || !status || !logBox || !refreshLogsButton || !clearLogsButton) {
    return;
  }

  const renderLogs = () => {
    logBox.value = loadSemanticScholarLogsForPreferences();
    logBox.scrollTop = logBox.scrollHeight;
  };

  input.value = loadSemanticScholarApiKeyForPreferences();
  status.textContent = input.value ? "Saved in local credential storage" : "Not set";
  status.style.color = "";
  renderLogs();

  saveButton.replaceWith(saveButton.cloneNode(true));
  clearButton.replaceWith(clearButton.cloneNode(true));
  refreshLogsButton.replaceWith(refreshLogsButton.cloneNode(true));
  clearLogsButton.replaceWith(clearLogsButton.cloneNode(true));
  const reboundSaveButton = doc.querySelector(`#${config.addonRef}-semantic-scholar-api-key-save`) as HTMLButtonElement;
  const reboundClearButton = doc.querySelector(`#${config.addonRef}-semantic-scholar-api-key-clear`) as HTMLButtonElement;
  const reboundRefreshLogsButton = doc.querySelector(`#${config.addonRef}-semantic-scholar-logs-refresh`) as HTMLButtonElement;
  const reboundClearLogsButton = doc.querySelector(`#${config.addonRef}-semantic-scholar-logs-clear`) as HTMLButtonElement;

  reboundSaveButton.addEventListener("click", () => {
    try {
      const mode = saveSemanticScholarApiKeyForPreferences(input.value);
      status.style.color = "";
      status.textContent = input.value.trim()
        ? mode === "credential"
          ? "Saved in local credential storage"
          : "Saved in local Zotero preferences"
        : "Cleared";
    } catch (error: any) {
      status.style.color = "#b00020";
      status.textContent = error?.message || "Failed to save";
    }
  });

  reboundClearButton.addEventListener("click", () => {
    try {
      input.value = "";
      clearSemanticScholarApiKeyForPreferences();
      status.style.color = "";
      status.textContent = "Cleared";
    } catch (error: any) {
      status.style.color = "#b00020";
      status.textContent = error?.message || "Failed to clear";
    }
  });

  reboundRefreshLogsButton.addEventListener("click", () => {
    renderLogs();
  });

  reboundClearLogsButton.addEventListener("click", () => {
    clearSemanticScholarLogsForPreferences();
    renderLogs();
  });
}
