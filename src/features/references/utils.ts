import API from "./api"
import PDF from "./pdfParser";
import {
  extractURL,
  getIdentifiers as getReferenceIdentifiers,
  identifiers2URL as identifiersToURL,
  isDOI as isReferenceDOI,
  matchArXiv as matchReferenceArXiv,
  referenceRegex,
} from "./identifiers";
import {
  parseRefText as parseReferenceText,
  parseRefTextLegacy,
  refText2Info as toReferenceInfo,
} from "./referenceParser";
import {
  searchItem as searchLibraryItemByFields,
  searchLibraryItem as searchLibraryItemInLibrary,
  searchRelatedItem as searchRelatedLibraryItem,
} from "./libraryMatch";


class Utils {
  API: API;
  PDF: PDF;
  private lock?: _ZoteroTypes.PromiseObject;
  private cache: { [key: string]: any } = {};
  public regex = referenceRegex
  constructor() {
    this.API = new API(this);
    this.PDF = new PDF(this);
  }

  public getIdentifiers(text: string): ItemBaseInfo["identifiers"] {
    return getReferenceIdentifiers(text)
  }

  private extractURL(text: string) {
    return extractURL(text)
  }

  public parseRefText(text: string): { year?: string, authors?: string[], title: string, publicationVenue?: String } {
    return parseReferenceText(text)
  }

  public _parseRefText(text: string): { year: string, authors: string[], title: string } {
    return parseRefTextLegacy(text)
  }

  public identifiers2URL(identifiers: ItemBaseInfo["identifiers"]) {
    return identifiersToURL(identifiers)
  }

  public refText2Info(text: string): ItemBaseInfo {
    return toReferenceInfo(text)
  }

  async createItemByZotero(identifiers: ItemBaseInfo["identifiers"], collections: number[]) {
    var translate = new Zotero.Translate.Search();
    translate.setIdentifier(identifiers);
    let translators = await translate.getTranslators();
    translate.setTranslator(translators);
    let libraryID = ZoteroPane.getSelectedLibraryID();
    return (await translate.translate({
      libraryID,
      collections,
      saveAttachments: true
    }))[0]
  }

  public searchRelatedItem(item: Zotero.Item, refItem: Zotero.Item): Zotero.Item | undefined {
    return searchRelatedLibraryItem(item, refItem)
  }

  public async searchItem(info: ItemBaseInfo) {
    return searchLibraryItemByFields(info)
  }

  /**
   * Search the local library and attach the matching Zotero item for a reference.
   * @param info 
   * @returns 
   */
  public async searchLibraryItem(info: ItemBaseInfo): Promise<Zotero.Item | undefined> {
    return searchLibraryItemInLibrary(info, this.cache, (candidate) => this.searchItem(candidate))
  }

  public selectItemInLibrary(item: Zotero.Item) {
    Zotero_Tabs.select('zotero-pane');
    ZoteroPane.selectItem(item.id);
  }

  public getItemType(item: Zotero.Item) {
    if (!item) { return }
    return Zotero.ItemTypes.getName(
      item.getField("itemTypeID" as any) as number
    )
  }

  public isDOI(text: string) {
    return isReferenceDOI(text)
  }

  public matchArXiv(text: string) {
    return matchReferenceArXiv(text)
  }

  public Html2Text(html: string): string | null {
    if (!html) { return "" }
    let text
    try {
      let span: HTMLSpanElement | null = document.createElement("span")
      span.innerHTML = html
      text = span.innerText || span.textContent
      span = null
    } catch (e) {
      text = html
    }
    if (text) {
      text = text
        .replace(/<([\w:]+?)>([\s\S]+?)<\/\1>/g, (match, p1, p2) => p2)
        .replace(/\n+/g, "")
    }
    // ztoolkit.log(text)
    return text
  }

  public getReader() {
    return Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)
  }

  public getReaderAttachmentItem(reader = this.getReader()): Zotero.Item | undefined {
    if (!reader) {
      return;
    }
    const attachmentID = reader.itemID || (reader as any)._itemID || reader._item?.id;
    return (attachmentID && Zotero.Items.get(attachmentID)) || reader._item;
  }

  public getReaderParentItem(reader = this.getReader()): Zotero.Item | undefined {
    const attachmentItem = this.getReaderAttachmentItem(reader);
    return attachmentItem?.parentItem || attachmentItem;
  }

  public getReaderWindow(reader = this.getReader()): Window | undefined {
    const frameWindow =
      reader?._iframeWindow ||
      (reader as any)?._internalReader?._lastView?._iframeWindow;

    return (frameWindow as any)?.wrappedJSObject || frameWindow || reader?._window;
  }

  public getReaderPDFViewerApplication(reader = this.getReader()) {
    return this.getReaderWindow(reader as _ZoteroTypes.ReaderInstance)?.PDFViewerApplication;
  }

  public getReaderKey(reader = this.getReader()): string {
    return reader?.tabID || (reader as any)?._instanceID || String(reader?.itemID || "reader");
  }

  public copyText = (text: string, show: boolean = true) => {
    (new ztoolkit.Clipboard()).addText(text, "text/unicode").copy();
    if (show) {
      (new ztoolkit.ProgressWindow("Copy"))
        .createLine({ text: text, type: "success" })
        .show()
    }
  }

  public getItem(): Zotero.Item | undefined {
    return this.getReaderParentItem();
  }

  public abs(v: number) {
    return v > 0 ? v : -v
  }
}

export default Utils
