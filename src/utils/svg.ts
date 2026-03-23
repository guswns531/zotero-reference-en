const parser = new DOMParser();

/**
 * Safely insert an SVG element into a container, bypassing Zotero's innerHTML sanitizer.
 * svgString must be a complete <svg>...</svg> document string.
 */
export function setSVG(element: Element, svgString: string) {
  const doc = parser.parseFromString(svgString.trim(), "image/svg+xml");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    ztoolkit.log("SVG parse error:", errorNode.textContent);
    return;
  }
  element.appendChild(document.importNode(doc.documentElement, true));
}
