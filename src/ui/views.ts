import { config } from "../../package.json";
import { initLocale, getString } from "../utils/locale";
import {
  getPopupContainer,
  getReaderInstanceKey,
  getReaderParentItem,
  getReaderPDFViewerApplication,
  getReaderWindow,
  openReaderDestinationInSplitView,
} from "../utils/zoteroCompat";
import TipUI from "../ui/tip";
import Utils from "../features/references/utils";
import LocalStorage from "../platform/localStorage";
import { loadReferencesForPanel } from "../features/references/referenceLoader";
import { buildTipTags, getTipCandidates } from "../features/references/tipInfo";
import { createReaderRelatedBox } from "../ui/readerPanel";
import { insertReferenceSearch } from "../ui/referenceSearch";
import { buildReferenceRow } from "../ui/referenceRow";
const localStorage = new LocalStorage(config.addonRef);

export default class Views {
  public utils!: Utils;
  private readerPanels = new Map<string, XUL.TabPanel>();
  private readerBoxes = new Map<string, Element>();
  private readerPanelTimer?: number;
  constructor() {
    initLocale();
    this.utils = new Utils()
    this.addStyle()
  }

  private addStyle() {
    const styles = ztoolkit.UI.createElement(document, "style", {
      namespace: "html",
      id: "reference-style",
      properties: {
        innerHTML: `
          .reference-search-box .icon {
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0.8;
          }
          .reference-search-box .icon:hover {
            opacity: 1
          }
        `
      },
    });
    document.documentElement.appendChild(styles);
  }

  private mountReaderPanel(
    panel: XUL.TabPanel | undefined,
    win: Window,
    reader: _ZoteroTypes.ReaderInstance,
  ) {
    if (!panel) {
      ztoolkit.log(
        "This reader do not have right-side bar. Adding reader tab skipped."
      );
      return;
    }
    const readerKey = getReaderInstanceKey(reader);
    this.readerPanels.set(readerKey, panel);
    const id = `${config.addonRef}-${readerKey}-extra-reader-tab-div`;
    win.setTimeout(async () => {
      panel.querySelector(`#${CSS.escape(id)}`)?.remove();
      const relatedbox = createReaderRelatedBox({
        id,
        panel,
        onRefresh: async (local, fromCurrentPage) =>
          this.refreshReferences(panel, local, fromCurrentPage),
      });
      this.readerBoxes.set(readerKey, relatedbox);
      panel.append(relatedbox);
      win.setTimeout(async () => {
        if (Zotero.Prefs.get(`${config.addonRef}.autoRefresh`)) {
          let excludeItemTypes = (Zotero.Prefs.get(`${config.addonRef}.notAutoRefreshItemTypes`) as string).split(/,\s*/);
          if (panel.getAttribute("isAutoRefresh") != "true") {
            const item = getReaderParentItem(reader);
            if (!item) {
              return;
            }
            // @ts-ignore
            const id = item.getType();
            const itemType = Zotero.ItemTypes.getTypes().find(i => i.id == id)?.name as string;
            if (excludeItemTypes.indexOf(itemType) == -1) {
              await this.refreshReferences(panel);
              panel.setAttribute("isAutoRefresh", "true");
            }
          }
        }
      });
      win.setTimeout(async () => {
        await this.loadingRelated(reader);
      });
    });
  }

  private renderReferenceSection(body: HTMLElement, item: Zotero.Item) {
    const panelKey = `item-${item.id}`;
    if (this.readerPanels.has(panelKey)) {
      return;
    }
    const panel = body as any as XUL.TabPanel;
    this.readerPanels.set(panelKey, panel);

    const id = `${config.addonRef}-${panelKey}-extra-reader-tab-div`;
    panel.querySelector(`#${CSS.escape(id)}`)?.remove();
    const relatedbox = createReaderRelatedBox({
      id,
      panel,
      onRefresh: async (local, fromCurrentPage) =>
        this.refreshReferences(panel, local, fromCurrentPage),
    });
    this.readerBoxes.set(panelKey, relatedbox);
    panel.append(relatedbox);
  }

  /**
   * Register the references section using Zotero 7 ItemPaneManager API.
   */
  public async onInit() {
    const sectionId = `${config.addonRef}-references-section`;

    // @ts-ignore - Zotero 7 API
    Zotero.ItemPaneManager.registerSection({
      paneID: sectionId,
      pluginID: config.addonID,
      header: {
        l10nID: `${config.addonRef}-tabpanel-reader-tab-label`,
        label: getString("tabpanel-reader-tab-label"),
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      },
      sidenav: {
        l10nID: `${config.addonRef}-tabpanel-reader-tab-label`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      },
      onInit: ({ body, item }: { body: HTMLElement; item: Zotero.Item }) => {
        this.renderReferenceSection(body, item);
      },
      onRender: ({ body, item }: { body: HTMLElement; item: Zotero.Item }) => {
        if (!body.hasChildNodes()) {
          this.renderReferenceSection(body, item);
        }
      },
      onItemChange: ({ body, item }: { body: HTMLElement; item: Zotero.Item }) => {
        body.innerHTML = "";
        this.readerPanels.delete(`item-${item.id}`);
        this.readerBoxes.delete(`item-${item.id}`);
        this.renderReferenceSection(body, item);
      },
      sectionButtons: [
        {
          type: "refresh",
          icon: "chrome://zotero/skin/16/universal/sync.svg",
          l10nID: `${config.addonRef}-tabpanel-reader-tab-label`,
          onClick: ({ body }: { body: HTMLElement }) => {
            this.refreshReferences(body as any as XUL.TabPanel);
          },
        },
      ],
    });

    // Keep the timer for reader-specific features (PDF links, related, auto-refresh)
    if (!this.readerPanelTimer) {
      this.readerPanelTimer = window.setInterval(async () => {
        const reader = this.utils.getReader();
        if (!reader) {
          return;
        }
        const readerKey = getReaderInstanceKey(reader);
        if (this.readerBoxes.has(readerKey)) {
          return;
        }
        // Find the section body for the current item
        const item = getReaderParentItem(reader);
        if (!item) return;
        const panelKey = `item-${item.id}`;
        const panel = this.readerPanels.get(panelKey);
        if (!panel) return;

        this.readerBoxes.set(readerKey, this.readerBoxes.get(panelKey)!);
        // Auto-refresh
        if (Zotero.Prefs.get(`${config.addonRef}.autoRefresh`)) {
          const excludeItemTypes = (Zotero.Prefs.get(`${config.addonRef}.notAutoRefreshItemTypes`) as string).split(/,\s*/);
          if (panel.getAttribute("isAutoRefresh") != "true") {
            // @ts-ignore
            const typeId = item.getType();
            const itemType = Zotero.ItemTypes.getTypes().find((i: any) => i.id == typeId)?.name as string;
            if (excludeItemTypes.indexOf(itemType) == -1) {
              await this.refreshReferences(panel);
              panel.setAttribute("isAutoRefresh", "true");
            }
          }
        }
        await this.loadingRelated(reader);
      }, 500);
    }
  }

  private getReaderPanel(reader = this.utils.getReader()) {
    return reader
      ? this.readerPanels.get(getReaderInstanceKey(reader))
      : undefined;
  }

  private getReaderRelatedBox(reader = this.utils.getReader()) {
    return reader
      ? this.readerBoxes.get(getReaderInstanceKey(reader))
      : undefined;
  }

  private async registerSplitButtons(reader: _ZoteroTypes.ReaderInstance) {
    let _window: any
    while (!(_window = this.utils.getReaderWindow(reader))) {
      ztoolkit.log("wait...")
      await Zotero.Promise.delay(10)
    }
    const parent = _window.document.querySelector("#toolbarViewerLeft")!
    const ref = parent.querySelector("#pageNumber") as HTMLDivElement
    const styles = {
      backgroundSize: "16px 16px",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      width: "16px"
    }
    
    ztoolkit.UI.insertElementBefore({
      tag: "div",
      classList: ["splitToolbarButton"],
      children: [
        {
          tag: "button",
          namespace: "html",
          id: "split-horizontally",
          classList: ["toolbarButton"],
          styles: {
            backgroundImage: `url(chrome://${config.addonRef}/content/icons/horizontally.png)`,
            // backgroundImage: await Zotero.File.generateDataURI(
            //   `chrome://${config.addonRef}/content/icons/horizontally.png`, 'image/png'
            // ),
            marginRight: "1px",
            ...styles
          },
          attributes: {
            title: "Split Horizontally",
            tabindex: "-1",
          },
          listeners: [
            {
              type: "click",
              listener: () => {
                reader.menuCmd("splitHorizontally")
              }
            }
          ]
        },
        {
          tag: "button",
          namespace: "html",
          id: "split-vertically",
          classList: ["toolbarButton"],
          styles: {
            backgroundImage: `url(chrome://${config.addonRef}/content/icons/split.png)`,
            // backgroundImage: await Zotero.File.generateDataURI(
            //   `chrome://${config.addonRef}/content/icons/vertically.png`, 'image/png'
            // ),
            marginLeft: "0",
            ...styles
          },
          attributes: {
            title: "Split Vertically",
            tabindex: "-1",
          },
          listeners: [
            {
              type: "click",
              listener: () => {
                reader.menuCmd("splitVertically")
              }
            }
          ]
        }
      ]
    }, ref)

    // ztoolkit.UI.appendElement({
    //   tag: "style",
    //   id: "reference-style",
    //   properties: {
    //     innerHTML: `
    //       #split-horizontally.toolbarButton::before {
    //         background-image: url("chrome://${config.addonRef}/content/icons/horizontally.png");
    //       }
    //       #split-vertically.toolbarButton::before {
    //         background-image: url("chrome://${config.addonRef}/content/icons/vertically.png");
    //       }
    //     `
    //   },
    // }, ((_window.document as Document).documentElement));
  }

  /**
   * Refresh recommended related items.
   * @param array 
   * @param node 
   * @returns 
   */
  public refreshRelated(array: ItemBaseInfo[], node: HTMLDivElement) {
    let totalNum = 0
    // @ts-ignore
    array.forEach((info: ItemBaseInfo, i: number) => {
      let {box, label} = this.addRow(node, array, i, false, false) as any
      if (!box) { return }
      box.classList.add("only-title")
      totalNum += 1;
      // let box = row.querySelector("box") as XUL.Box
    })
    return totalNum
  }

  /**
 * Only item with DOI is supported
 * @returns 
 */
  async loadingRelated(reader = this.utils.getReader()) {
    if (!Zotero.Prefs.get(`${config.addonRef}.loadingRelated`)) { return }
    ztoolkit.log("loadingRelated");
    let item = getReaderParentItem(reader) as Zotero.Item
    if (!item) { return }
    let itemDOI = item.getField("DOI") as string
    if (!itemDOI || !this.utils.isDOI(itemDOI)) {
      ztoolkit.log("Not DOI", itemDOI);
      return
    }
    let relatedbox = this.getReaderRelatedBox(reader) as any
    if (!relatedbox) {
      ztoolkit.log("Reader related box is unavailable. Skip loading related items.");
      return;
    }
    do {
      await Zotero.Promise.delay(50);
    }
    while (!relatedbox.querySelector('#related-grid'));
    
    let node = relatedbox.querySelector('#related-grid').parentNode! as HTMLDivElement
    // Already refreshed
    if (node.querySelector(".zotero-clicky-plus")) { return }
    ztoolkit.log("getDOIRelatedArray")
    let _relatedArray = (await this.utils.API.getDOIRelatedArray(itemDOI)) as ItemBaseInfo[] || []
    let func = relatedbox.refresh
    relatedbox.refresh = () => {
      func.call(relatedbox)
      // #42: add hover tips for Zotero related items
      // Convert Zotero items into a format recognized by Reference
      node.querySelectorAll(".box").forEach((e: any) => { e.nextElementSibling?.remove(); e.remove();  })
      ztoolkit.log(_relatedArray)
      let relatedArray = (item.relatedItems.map((key: string) => {
        try {
          return Zotero.Items.getByLibraryAndKey(1, key) as Zotero.Item
        } catch { }
      })
        .filter(i => i) as Zotero.Item[])
        .map((item: Zotero.Item) => {
          return {
            identifiers: { DOI: item.getField("DOI") },
            authors: [],
            title: item.getField("title"),
            text: item.getField("title"),
            url: item.getField("url"),
            type: item.itemType,
            year: item.getField("year"),
            _item: item
          } as ItemBaseInfo
        }).concat(_relatedArray)
      ztoolkit.log(relatedArray)
      this.refreshRelated(relatedArray, node)

    }
    relatedbox.refresh()
  }

  public async pdfLinks(reader: _ZoteroTypes.ReaderInstance, panel: XUL.TabPanel) {
    let _pdfDocument: any, _window: any
    while (!((_window = getReaderWindow(reader)) && (_pdfDocument = getReaderPDFViewerApplication(reader)?.pdfDocument))) {
      await Zotero.Promise.delay(10)
    }
    // let refKeys: any = []
    const dests = await _pdfDocument._transport.getDestinations()
    // window.setTimeout(async () => {
    //   dests = await _pdfDocument._transport.getDestinations()
    //   // Analyze the href-to-reference mapping
    //   // Count citations whose totals match the reference count
    //   const statistics: any = {}
    //   Object.keys(dests).forEach(key => {
    //     let _key = key.replace(/\d/g, "")
    //     statistics[_key] ??= 0
    //     statistics[_key] += 1
    //   })
    //   // const totalNum = 36
    //   // let refKey = Object.keys(statistics).find(k => statistics[k] == totalNum)
    //   // The largest count is the most likely match, but it is not risk-free
    //   let refKey = Object.keys(statistics).sort((k1, k2) => statistics[k2]- statistics[k1])[0]
    //   Object.keys(dests).forEach(key => {
    //     if (key.replace(/\d/g, "") == refKey) {
    //       refKeys.push(key)
    //     }
    //   })
    //   // Sort by the matched number
    //   refKeys = refKeys.sort((k1: string, k2: string) => {
    //     let n1 = Number(k1.match(/\d+/)![0])
    //     let n2 = Number(k2.match(/\d+/)![0])
    //     return n1 - n2
    //   })
    // })
    let id = window.setInterval(async () => {
      try {
        _window.document
      } catch (e) {
        ztoolkit.log(e)
        window.clearInterval(id)
        return await this.pdfLinks(reader, panel)
      }
      
      _window.document
        .querySelectorAll(`section.linkAnnotation a[href^='#']:not([${config.addonRef}])`).forEach(async (a: any) => {
          const isClickLink = Zotero.Prefs.get(`${config.addonRef}.clickLink`) as boolean
          const isHoverLink = Zotero.Prefs.get(`${config.addonRef}.hoverLink`) as boolean
          let _a: any, href = a.getAttribute("href")
          if (href.indexOf("fig") >=0) {return }
          if (isClickLink) {
            _a = ztoolkit.UI.appendElement({
              tag: "a",
              namespace: "html"
            }, a.parentNode) as HTMLDivElement
            _a.setAttribute(config.addonRef, href);
            _a.setAttribute("style", "cursor: pointer;")
            a.remove()
            _a.addEventListener("click", async (event: MouseEvent) => {
              event.stopPropagation();
              event.preventDefault();
              const opened = await openReaderDestinationInSplitView(
                reader,
                Zotero.Prefs.get(`${config.addonRef}.clickLink.cmd`) as string,
                href.slice(1),
              );
              if (!opened) {
                (new ztoolkit.ProgressWindow("Reference"))
                  .createLine({
                    text: "Split view is unavailable in this Zotero reader.",
                    type: "fail",
                  })
                  .show();
              }
            })
          }
          
          let timer: undefined | number
          _a = _a || a
          if (isHoverLink) {
            let tipUI: TipUI
            _a.addEventListener("mouseenter", async (event: MouseEvent) => {
              // @ts-ignore
              const references = panel.references
              if (!references) { return }
              const destination = dests[href.slice(1)]
              if (!destination) {
                return;
              }
              const [x, y] = destination.slice(2, 4)
              // Determine refIndex
              const distances = references.map((ref: { x: number; y: number }) => (x - ref.x) ** 2 + (y - ref.y) ** 2)
              const minDistance = [...distances].sort((a: number, b: number) => a-b)[0]
              const refIndex = distances.indexOf(minDistance)
              let reference = references[refIndex]
              if (reference) {
                timer = window.setTimeout(() => {
                  timer = undefined
                  let rect = _a.getBoundingClientRect()
                  rect.y = rect.y + 40;
                  tipUI = this.showTipUI(
                    rect,
                    reference,
                    "top center"
                  )
                }, 233)
              }
            })
            _a.addEventListener("mouseleave", async () => {
              window.clearTimeout(timer)
              if (tipUI) {
                const timeout = tipUI.removeTipAfterMillisecond
                tipUI.tipTimer = window.setTimeout(async () => {
                  tipUI && tipUI.container.remove()
                }, timeout)
              }
            })
          }
        })
    }, 100)
  }

  /**
   * Handle the refresh button action.
   * @param local Whether local cached data may be used
   * @param fromCurrentPage Search references from the current page backward
   * @returns 
   */
  public async refreshReferences(panel: XUL.TabPanel, local: boolean = true, fromCurrentPage: boolean = false) {
    Zotero.ProgressWindowSet.closeAll();
    let label = panel.querySelector("label#reference-num") as XUL.Label;
    label.innerText = `${0} ${getString("relatedbox-number-label")}`;

    // clear 
    panel.querySelectorAll("#related-grid *").forEach(e => e.remove());
    panel.querySelectorAll("#zotero-reference-search").forEach(e => e.remove());

    const references = await loadReferencesForPanel(
      panel,
      this.utils,
      local,
      fromCurrentPage,
    );
    if (!references) {
      return;
    }

    const referenceNum = references.length
    // @ts-ignore
    panel.references = references
    references.forEach(async (reference: ItemBaseInfo, refIndex: number) => {
      let { box } = this.addRow(panel, references, refIndex)!;
      // @ts-ignore
      box.reference = reference
      label.innerText = `${refIndex + 1}/${referenceNum} ${getString("relatedbox-number-label")}`;
    })

    label.innerText = `${referenceNum} ${getString("relatedbox-number-label")}`;
  }

  public showTipUI(refRect: Rect, reference: ItemInfo, position: string, idText?: string) {
    let toTimeInfo = (t: string) => {
      if (!t) { return undefined }
      let info = (new Date(t)).toString().split(" ")
      return `${info[1]} ${info[3]}`
    }
    let tipUI = new TipUI()
    tipUI.onInit(refRect, position)
    const { according, coroutines, prefIndex } = getTipCandidates(
      this.utils,
      reference,
      idText,
    );
    for (let i = 0; i < coroutines.length; i++) {
      // Do not block the UI
      window.setTimeout(async () => {
        let info = await coroutines[i]
        if (!info) { return }
        const tags = buildTipTags(info, reference)
        // Add the tip entry
        tipUI.addTip(
          this.utils.Html2Text(info.title!)!,
          tags,
          [
            info.authors?.slice(0, 3).join(" / "),
            [info?.primaryVenue, toTimeInfo(info.publishDate as string) || info.year]
              .filter(e => e).join(" \u00b7 "),
            reference.description
          ].filter(s => s && s != ""),
          this.utils.Html2Text(info.abstract!)!,
          according,
          i,
          prefIndex
        )
      })
    }
    return tipUI
  }

  public addRow(node: HTMLDivElement, references: ItemBaseInfo[], refIndex: number, addPrefix: boolean = true, addSearch: boolean = true) {
    return buildReferenceRow({
      node,
      references,
      refIndex,
      utils: this.utils,
      localStorage,
      showTipUI: (refRect, reference, position, idText) =>
        this.showTipUI(refRect, reference, position, idText),
      addSearch: (searchNode) => this.addSearch(searchNode),
      addPrefix,
      addSearchBox: addSearch,
    })
  }

  public addSearch(node: HTMLDivElement) {
    insertReferenceSearch(node)
  }
}
