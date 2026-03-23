import { config } from "../../package.json";
import { getPopupContainer } from "../utils/zoteroCompat";
import Utils from "../features/references/utils";
import LocalStorage from "../platform/localStorage";
import {
  collapseReferenceText,
  findOrCreateReferenceItem,
  linkReferenceItem,
  resolveReferenceURL,
  unlinkReferenceItem,
} from "../features/references/referenceActions";

type ReferenceRowOptions = {
  node: HTMLDivElement;
  references: ItemBaseInfo[];
  refIndex: number;
  utils: Utils;
  localStorage: LocalStorage;
  showTipUI: (refRect: Rect, reference: ItemInfo, position: string, idText?: string) => any;
  addSearch: (node: HTMLDivElement) => void;
  addPrefix?: boolean;
  addSearchBox?: boolean;
};

export function buildReferenceRow(options: ReferenceRowOptions) {
  const {
    node,
    references,
    refIndex,
    utils,
    localStorage,
    showTipUI,
    addSearch,
    addPrefix = true,
    addSearchBox = true,
  } = options;

  let notInLibarayOpacity: string | number = Zotero.Prefs.get(`${config.addonRef}.notInLibarayOpacity`) as string;
  if (/[\d\.]+/.test(notInLibarayOpacity)) {
    notInLibarayOpacity = Number(notInLibarayOpacity);
  } else {
    notInLibarayOpacity = 1;
  }
  let reference = references[refIndex];
  let refText: string;
  if (addPrefix) {
    refText = `[${reference?.number || (refIndex + 1)}] ${reference.text}`;
  } else {
    refText = reference.text!;
  }

  const toText = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");
  if ([...node.querySelectorAll(".box label")].find((e: any) => toText(e.innerText) == toText(refText))) {
    return;
  }

  const idText = (
    reference.identifiers &&
    Object.values(reference.identifiers).length > 0 &&
    Object.keys(reference.identifiers)[0] + ": " + Object.values(reference.identifiers)[0]
  ) || "Reference";
  const item = utils.getItem()!;
  let editTimer: number | undefined;
  const rows = node.querySelector("#related-grid")!;

  const box = ztoolkit.UI.createElement(
    document,
    "div",
    {
      namespace: "html",
      classList: ["box", "zotero-clicky"],
      listeners: [
        {
          type: "click",
          listener: (event: any) => {
            event.preventDefault();
            event.stopPropagation();
          },
        },
        {
          type: "mouseup",
          listener: async (event: any) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.ctrlKey || event.metaKey) {
              window.clearTimeout(editTimer);
              if (reference._item) {
                return utils.selectItemInLibrary(reference._item);
              } else {
                const item = await utils.searchLibraryItem(reference);
                if (item) {
                  return utils.selectItemInLibrary(item);
                }
              }
              let URL = reference.url;
              if (!URL) {
                const popupWin = (new ztoolkit.ProgressWindow("Searching URL", { closeTime: -1 }))
                  .createLine({ text: `Title: ${reference.title}`, type: "default" })
                  .show();
                URL = await resolveReferenceURL(utils, reference);
                popupWin.close();
              }
              if (URL) {
                (new ztoolkit.ProgressWindow("Launching URL", { closeOtherProgressWindows: true }))
                  .createLine({ text: URL, type: "default" })
                  .show();
                Zotero.launchURL(URL);
              }
            } else {
              if (rows.querySelector("#reference-edit")) {
                return;
              }
              if (editTimer) {
                window.clearTimeout(editTimer);
                Zotero.ProgressWindowSet.closeAll();
                utils.copyText((idText ? idText + "\n" : "") + refText, false);
                (new ztoolkit.ProgressWindow("Reference"))
                  .createLine({ text: refText, type: "success" })
                  .show();
              }
            }
          },
        },
      ],
      styles: {
        alignItems: "center",
        opacity: String(notInLibarayOpacity),
        paddingTop: "1px",
        paddingBottom: "1px",
      },
      children: [
        {
          tag: "img",
          attributes: {
            src: Zotero.ItemTypes.getImageSrc(reference.type as any) as string,
          },
        },
        {
          tag: "label",
          id: "reference-label",
          properties: {
            innerText: refText,
          },
          styles: {
            width: "100%",
          },
          listeners: [
            {
              type: "mousedown",
              listener: () => {
                editTimer = window.setTimeout(() => {
                  editTimer = undefined;
                  enterEdit();
                }, 500);
              },
            },
          ],
        },
      ],
    },
  ) as XUL.Element;

  const label = ztoolkit.UI.createElement(
    document,
    "label",
    {
      id: "add-remove",
      namespace: "xul",
      attributes: {
        value: "+",
      },
      classList: [
        "zotero-clicky",
        "zotero-clicky-plus",
      ],
    },
  );

  const enterEdit = () => {
    const label = box.querySelector("#reference-label")! as XUL.Label;
    label.style.display = "none";
    const textarea = ztoolkit.UI.createElement(
      document,
      "textarea",
      {
        id: "reference-edit",
        namespace: "html",
        attributes: {
          flex: "1",
          multiline: "true",
          rows: "4",
        },
        properties: {
          value: addPrefix ? label.innerText.replace(/^\[\d+\]\s+/, "") : label.innerText,
        },
        styles: {
          width: "100%",
        },
        listeners: [
          {
            type: "blur",
            listener: async () => {
              await exitEdit();
            },
          },
        ],
      },
    ) as HTMLTextAreaElement;
    textarea.focus();
    label.parentNode!.insertBefore(textarea, label);
    const exitEdit = async () => {
      const inputText = textarea.value;
      if (!inputText) {
        return;
      }
      label.style.display = "";
      textarea.remove();
      if (inputText == reference.text) {
        return;
      }
      label.innerText = `[${refIndex + 1}] ${inputText}`;
      references[refIndex] = {
        ...reference,
        ...{ identifiers: utils.getIdentifiers(inputText) },
        ...utils.refText2Info(inputText),
        ...{ text: inputText },
      };
      reference = references[refIndex];
      utils.searchLibraryItem(reference);
      const key = `References-${node.getAttribute("source")}`;
      window.setTimeout(async () => {
        await localStorage.set(item, key, references);
      });
    };

    const id = window.setInterval(async () => {
      const active = rows.querySelector(".active");
      if (active && active != box) {
        await exitEdit();
        window.clearInterval(id);
      }
    }, 100);
  };

  const setState = (state: string = "") => {
    switch (state) {
      case "+":
        label.setAttribute("class", "zotero-clicky zotero-clicky-plus");
        label.setAttribute("value", "+");
        label.style.opacity = "1";
        break;
      case "-":
        label.setAttribute("class", "zotero-clicky zotero-clicky-minus");
        label.setAttribute("value", "-");
        label.style.opacity = "1";
        break;
      case "":
        label.setAttribute("value", "");
        label.style.opacity = ".23";
        break;
    }
  };

  const remove = async () => {
    const popunWin = new ztoolkit.ProgressWindow("Removing Item", { closeTime: -1 })
      .createLine({ text: refText, type: "default" })
      .show();
    setState();

    const removed = await unlinkReferenceItem(utils, item, reference);
    if (!removed) {
      popunWin.changeHeadline("Removed");
      (node.querySelector("#refresh-button") as XUL.Button).click();
      popunWin.startCloseTimer(3000);
      return;
    }
    setState("+");
    popunWin.changeLine({ type: "success" });
    popunWin.startCloseTimer(3000);
  };

  const add = async (collections: undefined | number[] = undefined) => {
    const popupWin = (new ztoolkit.ProgressWindow("Searching Item", {
      closeTime: -1,
      closeOtherProgressWindows: true,
    }))
      .createLine({ text: collapseReferenceText(reference.text!), type: "default" })
      .show();
    let refItem = reference._item || await utils.searchLibraryItem(reference);
    setState();
    if (refItem) {
      popupWin.changeHeadline("Existing Item");
      popupWin.changeLine({ text: collapseReferenceText(refItem.getField("title")) });
    } else {
      const info: ItemBaseInfo = utils.refText2Info(reference.text!);
      popupWin.changeHeadline("Searching DOI");
      popupWin.changeLine({ text: collapseReferenceText(`Title: ${info.title!}`) });
      const hadIdentifiers = Object.keys(reference.identifiers).length > 0;
      refItem = await findOrCreateReferenceItem(utils, item, reference, collections);
      if (!refItem) {
        setState("+");
        popupWin.changeLine({ type: "fail" });
        popupWin.startCloseTimer(3000);
        return;
      }
      popupWin.changeHeadline("Creating Item");
      popupWin.changeLine({
        text: collapseReferenceText(
          `${hadIdentifiers ? Object.keys(reference.identifiers) : "DOI"}: ${Object.values(reference.identifiers)[0]}`,
        ),
      });
      if (await utils.searchRelatedItem(item, refItem)) {
        popupWin.changeHeadline("Added Item");
        popupWin.changeLine({ type: "success" });
        popupWin.startCloseTimer(3000);
        (node.querySelector("#refresh-button") as XUL.Button).click();
        return;
      }
    }
    try {
      await linkReferenceItem(item, reference, refItem, collections);
    } catch (e: any) {
      popupWin.changeLine({ type: "fail" });
      popupWin.startCloseTimer(3000);
      setState("+");
      ztoolkit.log(e);
      return;
    }
    popupWin.changeHeadline("Adding Item");
    popupWin.changeLine({ text: collapseReferenceText(refItem.getField("title")) });
    setState("-");
    popupWin.changeLine({ type: "success" });
    popupWin.startCloseTimer(3000);
    updateRowByItem(refItem);
  };

  const updateRowByItem = (refItem: Zotero.Item) => {
    box.style.opacity = "1";
    box.querySelector("img")?.setAttribute("src", refItem.getImageSrc());
    const alreadyRelated = utils.searchRelatedItem(item, refItem);
    if (alreadyRelated) {
      setState("-");
    }
  };

  let timer: undefined | number;
  let tipUI: any;
  if (notInLibarayOpacity < 1) {
    window.setTimeout(async () => {
      const refItem = reference._item || await utils.searchLibraryItem(reference) as Zotero.Item;
      if (refItem) {
        updateRowByItem(refItem);
      }
    }, refIndex * 0);
  }

  box.addEventListener("mouseenter", () => {
    if (!Zotero.Prefs.get(`${config.addonRef}.isShowTip`)) {
      return;
    }
    box.classList.add("active");
    const timeout = parseInt(Zotero.Prefs.get(`${config.addonRef}.showTipAfterMillisecond`) as string);
    const position = Zotero.Prefs.get("extensions.zotero.layout", true) == "stacked" ? "top center" : "left";
    timer = window.setTimeout(async () => {
      const rect = box.getBoundingClientRect();
      rect.x -= 5;
      tipUI = showTipUI(rect, reference, position, idText);
      if (!box.classList.contains("active")) {
        tipUI.container.style.display = "none";
      }
    }, timeout);
  });

  box.addEventListener("mouseleave", () => {
    box.classList.remove("active");
    window.clearTimeout(timer);
    if (!tipUI) {
      return;
    }
    const timeout = tipUI.removeTipAfterMillisecond;
    tipUI.tipTimer = window.setTimeout(async () => {
      for (let i = 0; i < timeout / 2; i++) {
        if (rows.querySelector(".active")) {
          return;
        }
        await Zotero.Promise.delay(1 / 1000);
      }
      tipUI && tipUI.clear();
    }, timeout / 2);
  });

  label.addEventListener("click", async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const value = label.getAttribute("value");
    if (value == "+") {
      if (event.ctrlKey || event.metaKey) {
        const rect = box.getBoundingClientRect();
        const menuPopup = document.createElementNS(
          "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
          "menupopup",
        ) as XUL.MenuPopup;
        getPopupContainer(document).append(menuPopup);
        const collections = Zotero.Collections.getByLibrary(1);
        for (const col of collections) {
          const menuItem = Zotero.Utilities.Internal.createMenuForTarget(
            col,
            menuPopup,
            null as any,
            async (event: any, collection: any) => {
              if (event.target.tagName == "menuitem") {
                menuPopup.remove();
                await add([collection.id]);
                event.stopPropagation();
              }
            },
          );
          menuPopup.append(menuItem);
        }
        // @ts-ignore
        menuPopup.openPopupAtScreen(rect.left, rect.top + rect.height, true);
      } else {
        await add();
      }
    } else if (value == "-") {
      await remove();
    }
  });

  rows.append(box, label);
  const referenceNum = rows.childNodes.length;
  if (addSearchBox && referenceNum && !node.querySelector("#zotero-reference-search")) {
    addSearch(node);
  }
  const relatedGrid = node.querySelector("#related-grid") as HTMLDivElement;
  relatedGrid.style.maxHeight = `${document.documentElement.getBoundingClientRect().height - relatedGrid.getBoundingClientRect().top}px`;
  return { box, label };
}
