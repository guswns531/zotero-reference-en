import { config } from "../../package.json";
import Views from "../ui/views";
import ConnectedPapers from "../features/graph/connectedpapers";
import { reportError } from "../utils/errors";

let initialized = false;

export async function initializeRuntime() {
  try {
    if (initialized) {
      return Zotero[config.addonInstance]?.views as Views | undefined;
    }

    const views = new Views();
    await views.onInit();
    Zotero[config.addonInstance].views = views;

    await new ConnectedPapers(views).init();

    initialized = true;
    return views;
  } catch (error) {
    throw reportError(error, "app.runtime");
  }
}

export function resetRuntime() {
  initialized = false;
}
