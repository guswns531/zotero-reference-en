const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Safely insert an SVG string into an element, bypassing Zotero's innerHTML sanitizer.
 */
export function setSVG(element: Element, svgString: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<svg xmlns="${SVG_NS}">${svgString}</svg>`,
    "image/svg+xml"
  );
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    ztoolkit.log("SVG parse error:", errorNode.textContent);
    return;
  }
  // If the input was a full <svg> element, the parser wraps it; extract appropriately
  const parsed = doc.documentElement;
  // Check if the input itself was an <svg> — in that case the outer wrapper has a nested <svg>
  const innerSvg = parsed.querySelector("svg");
  if (innerSvg) {
    element.appendChild(document.importNode(innerSvg, true));
  } else {
    // Move children from the wrapper <svg> into the element
    while (parsed.firstChild) {
      element.appendChild(document.importNode(parsed.firstChild, true));
    }
  }
}
