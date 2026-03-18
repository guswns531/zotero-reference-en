import { onStartup } from "./lifecycle/startup";
import {
  onMainWindowLoad,
  onMainWindowUnload,
} from "./lifecycle/mainWindow";
import { onShutdown } from "./lifecycle/shutdown";
import { onPrefsEvent } from "./lifecycle/prefs";

export default {
  onStartup,
  onShutdown,
  onPrefsEvent,
  onMainWindowLoad,
  onMainWindowUnload
};
