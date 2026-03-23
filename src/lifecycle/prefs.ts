import { registerPrefsScripts, registerPrefs } from "../ui/preferencesPane";

export function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

export function initializePreferencePane() {
  registerPrefs();
}
