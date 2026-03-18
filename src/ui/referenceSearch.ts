export function insertReferenceSearch(node: HTMLDivElement) {
  const searchBoxHeight = 10;
  const searchBox = ztoolkit.UI.insertElementBefore({
    tag: "div",
    id: "zotero-reference-search",
    classList: ["reference-search-box"],
    styles: {
      height: `${searchBoxHeight}px`,
      padding: "5px",
      borderRadius: "5px",
      border: "1px solid #e0e0e0",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      margin: ".5em 1em",
      opacity: "0.8",
    },
    children: [
      {
        tag: "div",
        styles: {
          width: `${searchBoxHeight}px`,
          height: `${searchBoxHeight}px`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        },
        properties: {
          innerHTML: `<svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="${searchBoxHeight}" height="${searchBoxHeight}"><path d="M1005.312 914.752l-198.528-198.464A448 448 0 1 0 0 448a448 448 0 0 0 716.288 358.784l198.4 198.4a64 64 0 1 0 90.624-90.432zM448 767.936A320 320 0 1 1 448 128a320 320 0 0 1 0 640z" fill="#5a5a5a"></path></svg>`,
        },
      },
      {
        tag: "input",
        styles: {
          outline: "none",
          border: "none",
          width: "100%",
          margin: "0 5px",
        },
        listeners: [
          {
            type: "focus",
            listener: () => {
              searchBox.style.opacity = "1";
              searchBox.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.5)";
            },
          },
          {
            type: "blur",
            listener: () => {
              searchBox.style.opacity = "0.8";
              searchBox.style.boxShadow = "";
            },
          },
          {
            type: "keyup",
            listener: async () => {
              const keyword = inputNode.value as string;
              clearNode.style.display = keyword.length > 0 ? "" : "none";
              const keywords = keyword.split(/[ ,，]/).filter((e: any) => e);
              node.querySelectorAll("#related-grid *").forEach((e: any) => e.style.display = "");
              if (keywords.length == 0) {
                return;
              }
              node.querySelectorAll("#related-grid .box").forEach((box: any) => {
                const content = (box.querySelector("#reference-label") as any).textContent;
                let isAllMatched = true;
                for (let i = 0; i < keywords.length; i++) {
                  isAllMatched = isAllMatched && content.toLowerCase().indexOf(keywords[i].toLowerCase()) >= 0;
                }
                if (isAllMatched) {
                  box.style.display = "";
                  box.nextElementSibling.style.display = "";
                } else {
                  box.style.display = "none";
                  box.nextElementSibling.style.display = "none";
                }
              });
            },
          },
        ],
      },
      {
        tag: "div",
        classList: ["icon", "clear"],
        styles: {
          width: `${searchBoxHeight}px`,
          height: `${searchBoxHeight}px`,
          display: "none",
        },
        properties: {
          innerHTML: `<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="${searchBoxHeight}" height="${searchBoxHeight}"><path d="M512.288 1009.984c-274.912 0-497.76-222.848-497.76-497.76s222.848-497.76 497.76-497.76c274.912 0 497.76 222.848 497.76 497.76s-222.848 497.76-497.76 497.76zM700.288 368.768c12.16-12.16 12.16-31.872 0-44s-31.872-12.16-44.032 0l-154.08 154.08-154.08-154.08c-12.16-12.16-31.872-12.16-44.032 0s-12.16 31.84 0 44l154.08 154.08-154.08 154.08c-12.16 12.16-12.16 31.84 0 44s31.872 12.16 44.032 0l154.08-154.08 154.08 154.08c12.16 12.16 31.872 12.16 44.032 0s12.16-31.872 0-44l-154.08-154.08 154.08-154.08z" fill="#5a5a5a" p-id="5698"></path></svg>`,
        },
        listeners: [
          {
            type: "click",
            listener: async () => {
              inputNode.value = "";
              clearNode.style.display = "none";
              node.querySelectorAll("#related-grid *").forEach((e: any) => e.style.display = "");
            },
          },
        ],
      },
    ],
  }, node.querySelector(".grid")!) as HTMLDivElement;

  const inputNode = searchBox.querySelector("input") as HTMLInputElement;
  const clearNode = searchBox.querySelector(".clear") as HTMLInputElement;

  return searchBox;
}
