import { getString } from "../utils/locale";

type ReaderPanelOptions = {
  id: string;
  panel: XUL.TabPanel;
  onRefresh: (local: boolean, fromCurrentPage: boolean) => Promise<void>;
};

export function createReaderRelatedBox(options: ReaderPanelOptions) {
  const { id, panel, onRefresh } = options;
  let timer: number | undefined;
  let relatedbox: Element;

  relatedbox = ztoolkit.UI.createElement(
    panel.ownerDocument || document,
    "div",
    {
      id,
      classList: ["zotero-reference-box"],
      namespace: "html",
      ignoreIfExists: true,
      attributes: {
        flex: "1",
      },
      styles: {
        alignItems: "center",
      },
      children: [
        {
          tag: "div",
          namespace: "html",
          classList: ["reference"],
          styles: {
            display: "flex",
            flex: "1",
          },
          children: [
            {
              tag: "div",
              namespace: "html",
              styles: {
                flexGrow: "1",
              },
              children: [
                {
                  tag: "div",
                  namespace: "html",
                  id: "related-grid",
                  classList: ["grid"],
                  styles: {
                    overflowY: "auto",
                    alignItems: "center",
                    display: "grid",
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  );

  return relatedbox;
}
