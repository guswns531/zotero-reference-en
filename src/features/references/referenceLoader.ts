import { config } from "../../../package.json";
import LocalStorage from "../../platform/localStorage";
import Utils from "./utils";

const localStorage = new LocalStorage(config.addonRef);

function resolvePanelSource(panel: XUL.TabPanel, local: boolean) {
  const source = panel.getAttribute("source");
  if (source) {
    if (local) {
      if (source == "PDF") {
        panel.setAttribute("source", "API");
      }
      if (source == "API") {
        panel.setAttribute("source", "PDF");
      }
    }
  } else {
    panel.setAttribute("source", Zotero.Prefs.get(`${config.addonRef}.prioritySource`));
  }

  return panel.getAttribute("source");
}

async function loadPDFReferences(
  utils: Utils,
  item: Zotero.Item,
  reader: _ZoteroTypes.ReaderInstance,
  local: boolean,
  fromCurrentPage: boolean,
) {
  const key = "References-PDF";
  let references = local && localStorage.get(item, key);
  if (references) {
    (new ztoolkit.ProgressWindow("[Local] PDF"))
      .createLine({ text: `${references.length} references`, type: "success" })
      .show();
    return references;
  }

  references = await utils.PDF.getReferences(reader, fromCurrentPage);
  if (Zotero.Prefs.get(`${config.addonRef}.savePDFReferences`)) {
    window.setTimeout(async () => {
      await localStorage.set(item, key, references);
    });
  }

  return references;
}

async function loadAPIReferences(utils: Utils, item: Zotero.Item, local: boolean) {
  const key = "References-API";
  let references = local && localStorage.get(item, key);
  if (references) {
    (new ztoolkit.ProgressWindow("[Local] API"))
      .createLine({ text: `${references.length} references`, type: "success" })
      .show();
    return references;
  }

  const DOI = item.getField("DOI") as string;
  const title = item.getField("title") as string;

  let popupWin;
  if (utils.isDOI(DOI)) {
    popupWin = new ztoolkit.ProgressWindow("[Pending] API", { closeTime: -1 });
    popupWin
      .createLine({ text: "Request DOI references...", type: "default" })
      .show();
    references = (await utils.API.getDOIInfoByCrossref(DOI))?.references!;
  } else {
    popupWin = new ztoolkit.ProgressWindow("[Pending] API", {
      closeTime: -1,
      closeOtherProgressWindows: true,
    });
    popupWin
      .createLine({ text: "Request title references...", type: "default" })
      .show();
    references = (await utils.API.getTitleInfoByCrossref(title))?.references!;
    if (!references) {
      popupWin.changeHeadline("[Fail] API");
      popupWin.changeLine({
        text: "No references found for title search",
        type: "fail",
      });
      popupWin.startCloseTimer(3000);
      return;
    }
  }

  if (Zotero.Prefs.get(`${config.addonRef}.saveAPIReferences`)) {
    window.setTimeout(async () => {
      references && await localStorage.set(item, key, references);
    });
  }

  popupWin.changeHeadline("[Done] API");
  popupWin.changeLine({ text: `${references.length} references`, type: "success" });
  popupWin.startCloseTimer(3000);

  return references;
}

export async function loadReferencesForPanel(
  panel: XUL.TabPanel,
  utils: Utils,
  local: boolean,
  fromCurrentPage: boolean,
) {
  const item = utils.getItem() as Zotero.Item;
  const reader = utils.getReader();
  const source = resolvePanelSource(panel, local);

  if (source == "PDF") {
    return loadPDFReferences(utils, item, reader, local, fromCurrentPage);
  }

  return loadAPIReferences(utils, item, local);
}
