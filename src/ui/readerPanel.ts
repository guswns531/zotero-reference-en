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
    "related-box",
    {
      id,
      classList: ["zotero-editpane-related"],
      namespace: "xul",
      ignoreIfExists: true,
      attributes: {
        flex: "1",
      },
      styles: {
        alignItems: "center",
      },
      children: [
        {
          tag: "box",
          namespace: "xul",
          classList: ["reference"],
          attributes: {
            flex: "1",
          },
          styles: {
            display: "flex",
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
                  classList: ["header"],
                  namespace: "html",
                  children: [
                    {
                      tag: "label",
                      id: "reference-num",
                      properties: {
                        innerText: `0 ${getString("relatedbox-number-label")}`,
                      },
                      listeners: [
                        {
                          type: "dblclick",
                          listener: () => {
                            const textArray: string[] = [];
                            relatedbox.querySelectorAll("#related-grid .box #reference-label")
                              .forEach((e: any) => textArray.push(e.textContent));
                            (new ztoolkit.ProgressWindow("Reference"))
                              .createLine({ text: "Copy all references", type: "success" })
                              .show();
                            (new ztoolkit.Clipboard())
                              .addText(textArray.join("\n"), "text/unicode")
                              .copy();
                          },
                        },
                      ],
                    },
                    {
                      tag: "button",
                      id: "refresh-button",
                      properties: {
                        innerText: getString("relatedbox-refresh-label"),
                      },
                      listeners: [
                        {
                          type: "mousedown",
                          listener: (event: any) => {
                            timer = window.setTimeout(async () => {
                              timer = undefined;
                              await onRefresh(false, event.ctrlKey || event.metaKey);
                            }, 1000);
                          },
                        },
                        {
                          type: "mouseup",
                          listener: async (event: any) => {
                            if (timer) {
                              window.clearTimeout(timer);
                              timer = undefined;
                              await onRefresh(true, event.ctrlKey || event.metaKey);
                            }
                          },
                        },
                      ],
                    },
                  ],
                },
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
