export {
  getPopupContainer,
  getReaderInstanceKey,
  getReaderItem,
  getReaderItemID,
  getReaderParentItem,
  getReaderWindow,
  getReaderPDFViewerApplication,
  openReaderDestinationInSplitView,
  waitForReaderPDFViewerApplication,
};

type ReaderLike = _ZoteroTypes.ReaderInstance & Record<string, any>;

function getReaderInstanceKey(reader?: ReaderLike): string {
  return String(reader?._instanceID ?? "unknown-reader");
}

function getReaderItemID(reader?: ReaderLike): number | undefined {
  const unsafeReader = reader as any;
  const itemID =
    unsafeReader?.itemID
    ?? unsafeReader?._itemID
    ?? unsafeReader?._item?.id;
  return typeof itemID === "number" ? itemID : undefined;
}

function getReaderItem(reader?: ReaderLike): Zotero.Item | undefined {
  const itemID = getReaderItemID(reader);
  if (!itemID) {
    return (reader as any)?._item;
  }
  try {
    return Zotero.Items.get(itemID) as Zotero.Item | undefined;
  } catch {
    return (reader as any)?._item;
  }
}

function getReaderParentItem(reader?: ReaderLike): Zotero.Item | undefined {
  const item = getReaderItem(reader);
  if (!item) {
    return;
  }
  return item.isAttachment?.() ? item.parentItem ?? undefined : item;
}

function getReaderWindow(reader?: ReaderLike): Window | undefined {
  const unsafeReader = reader as any;
  const candidates = [
    unsafeReader?._iframeWindow?.wrappedJSObject,
    unsafeReader?._iframeWindow,
    unsafeReader?._internalReader?._iframeWindow?.wrappedJSObject,
    unsafeReader?._internalReader?._iframeWindow,
    unsafeReader?._internalReader?._lastView?._iframeWindow?.wrappedJSObject,
    unsafeReader?._internalReader?._lastView?._iframeWindow,
  ];
  return candidates.find(
    (candidate): candidate is Window =>
      !!candidate && typeof candidate.document !== "undefined",
  );
}

function getReaderPDFViewerApplication(reader?: ReaderLike): any {
  const unsafeReader = reader as any;
  const readerWindow = getReaderWindow(reader) as any;
  const candidates = [
    readerWindow?.PDFViewerApplication,
    unsafeReader?._iframeWindow && unsafeReader._iframeWindow.PDFViewerApplication,
    unsafeReader?._internalReader?._iframeWindow &&
      unsafeReader._internalReader._iframeWindow.PDFViewerApplication,
    unsafeReader?._internalReader?._lastView?._iframeWindow &&
      unsafeReader._internalReader._lastView._iframeWindow.PDFViewerApplication,
  ];
  return candidates.find((candidate) => !!candidate?.pdfViewer);
}

async function waitForReaderPDFViewerApplication(
  reader?: ReaderLike,
  timeoutMs: number = 5000,
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const app = getReaderPDFViewerApplication(reader);
    if (app) {
      return app;
    }
    await Zotero.Promise.delay(50);
  }
}

async function openReaderDestinationInSplitView(
  reader: ReaderLike | undefined,
  command: string,
  destination: string,
): Promise<boolean> {
  if (!reader || !destination) {
    return false;
  }
  const readerWindow = getReaderWindow(reader) as any;
  if (!readerWindow) {
    return false;
  }
  const unsafeReader = reader as any;
  if (
    !readerWindow.secondViewIframeWindow?.PDFViewerApplication?.pdfViewer
    && typeof unsafeReader?.menuCmd === "function"
  ) {
    await unsafeReader.menuCmd(command);
    const startedAt = Date.now();
    while (
      Date.now() - startedAt < 5000
      && !readerWindow.secondViewIframeWindow?.PDFViewerApplication?.pdfViewer
    ) {
      await Zotero.Promise.delay(100);
    }
    await Zotero.Promise.delay(250);
  }
  const secondApp = readerWindow.secondViewIframeWindow?.PDFViewerApplication;
  const linkService =
    secondApp?.pdfViewer?.linkService ?? secondApp?.linkService;
  if (typeof linkService?.goToDestination !== "function") {
    return false;
  }
  await linkService.goToDestination(destination);
  return true;
}

function getPopupContainer(doc: Document = document): Element {
  return (
    doc.querySelector("popupset")
    ?? doc.querySelector("#mainPopupSet")
    ?? doc.documentElement
  );
}
