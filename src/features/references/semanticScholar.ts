import { config } from "../../../package.json";
import {
  clearSemanticScholarApiKey,
  getSemanticScholarApiKey,
  setSemanticScholarApiKey,
} from "../../platform/credentialStorage";
import { reportError } from "../../utils/errors";

const MENU_ID = `${config.addonRef}-semantic-scholar-update`;
const API_BASE = "https://api.semanticscholar.org/graph/v1";
const LOG_PREF_KEY = `${config.addonRef}.semanticScholar.logs`;
const MAX_LOG_LINES = 200;
const SEARCH_LIMIT = 5;
const PAPER_FIELDS = [
  "title",
  "abstract",
  "year",
  "publicationDate",
  "journal",
  "venue",
  "publicationVenue",
  "url",
  "externalIds",
  "authors",
].join(",");

function getTimestamp() {
  return new Date().toLocaleString("sv-SE");
}

function appendSemanticScholarLog(message: string) {
  try {
    const current = (Zotero.Prefs.get(LOG_PREF_KEY) as string) || "";
    const nextLines = [...current.split("\n").filter(Boolean), `[${getTimestamp()}] ${message}`]
      .slice(-MAX_LOG_LINES);
    Zotero.Prefs.set(LOG_PREF_KEY, nextLines.join("\n"));
  } catch (error) {
    reportError(error, "semanticScholar.appendLog");
  }
}

function clearSemanticScholarLogs() {
  Zotero.Prefs.set(LOG_PREF_KEY, "");
}

function getSemanticScholarLogs() {
  return (Zotero.Prefs.get(LOG_PREF_KEY) as string) || "";
}

function getSelectedItems() {
  return ZoteroPane.getSelectedItems()
    .map((item) => (item?.isAttachment?.() ? item.parentItem : item))
    .filter((item): item is Zotero.Item => !!item?.isRegularItem?.());
}

function splitName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  if (trimmed.includes(",")) {
    const [lastName, ...rest] = trimmed.split(",");
    return {
      firstName: rest.join(",").trim(),
      lastName: lastName.trim(),
    };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: "", lastName: parts[0] };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function mapAuthorsToCreators(authors: Array<{ name: string }> = []) {
  return authors
    .map((author) => author?.name?.trim())
    .filter(Boolean)
    .map((name) => ({
      ...splitName(name as string),
      creatorType: "author",
    }));
}

function setFieldIfSupported(item: Zotero.Item, field: string, value: string | number | undefined) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  try {
    if ((item as any).isFieldOfBase?.(field) || item.getField(field as any) !== undefined) {
      item.setField(field as any, String(value));
    }
  } catch {}
}

function setExtraField(item: Zotero.Item, label: string, value: string | undefined) {
  if (!value) {
    return;
  }

  const currentExtra = String(item.getField("extra") || "").trim();
  const lines = currentExtra ? currentExtra.split("\n").filter(Boolean) : [];
  const remaining = lines.filter((line) => !line.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  remaining.push(`${label}: ${value}`);
  item.setField("extra" as any, remaining.join("\n"));
}

function maybeSetConferencePaperType(item: Zotero.Item, data: any) {
  if (data.publicationVenue?.type !== "conference") {
    return;
  }

  try {
    const conferencePaperID = Zotero.ItemTypes.getID("conferencePaper");
    if (conferencePaperID && item.itemTypeID !== conferencePaperID) {
      item.setType(conferencePaperID);
    }
  } catch {}
}

async function requestSemanticScholar(path: string, params: Record<string, string>) {
  const apiKey = getSemanticScholarApiKey();
  if (!apiKey) {
    throw new Error("Semantic Scholar API key is not configured.");
  }

  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const response = await Zotero.HTTP.request("GET", url.toString(), {
    responseType: "json",
    headers: {
      "x-api-key": apiKey,
    },
  });
  appendSemanticScholarLog(`HTTP ${response.status} ${path} ${url.search}`);

  return response.response;
}

function unwrapPaperSearchResponse(response: any) {
  if (response?.data && Array.isArray(response.data)) {
    return response.data;
  }
  return response;
}

function normalizeTitle(title: string | undefined) {
  return String(title || "")
    .replace(/[.。]+$/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getCandidateVenue(candidate: any) {
  return candidate.publicationVenue?.name || candidate.journal?.name || candidate.venue || "";
}

function getCandidateSource(candidate: any) {
  return candidate.metadataSource || "semanticscholar";
}

async function requestJSON(url: string, headers: Record<string, string> = {}) {
  const response = await Zotero.HTTP.request("GET", url, {
    responseType: "json",
    headers,
  });
  return response.response;
}

function mapDBLPHitToCandidate(hit: any) {
  const info = hit?.info || {};
  const authors = Array.isArray(info.authors?.author)
    ? info.authors.author.map((author: any) => ({ name: author.text }))
    : info.authors?.author
      ? [{ name: info.authors.author.text }]
      : [];

  const venue = info.venue || "";
  const isConference = info.type === "Conference and Workshop Papers";
  const doi = info.doi || "";
  const arxivMatch = doi.match(/10\.48550\/ARXIV\.(.+)$/i);

  return {
    metadataSource: "dblp",
    title: String(info.title || "").replace(/[.。]+$/u, ""),
    authors,
    year: info.year ? Number(info.year) : undefined,
    publicationDate: info.year || undefined,
    venue,
    publicationVenue: venue
      ? {
          name: venue,
          type: isConference ? "conference" : undefined,
        }
      : undefined,
    journal: {
      name: venue || undefined,
      pages: info.pages || undefined,
      volume: info.volume || undefined,
    },
    url: info.ee || info.url,
    externalIds: {
      DOI: doi || undefined,
      ArXiv: arxivMatch?.[1] || undefined,
    },
  };
}

async function searchDBLPCandidates(title: string) {
  const url = `https://dblp.org/search/publ/api?${new URLSearchParams({
    q: title,
    format: "json",
    h: String(SEARCH_LIMIT),
  }).toString()}`;
  const response = await requestJSON(url);
  const hits = response?.result?.hits?.hit;
  const list = Array.isArray(hits) ? hits : hits ? [hits] : [];
  return list.map(mapDBLPHitToCandidate);
}

function mergeCandidates(searchTitle: string, semanticScholarCandidates: any[], dblpCandidates: any[]) {
  const target = normalizeTitle(searchTitle);
  const merged: any[] = [];
  const seen = new Set<string>();

  for (const candidate of [...dblpCandidates, ...semanticScholarCandidates]) {
    const normalized = normalizeTitle(candidate.title);
    if (!normalized) {
      continue;
    }
    if (normalized !== target && !normalized.includes(target) && !target.includes(normalized)) {
      continue;
    }
    const key = `${normalized}::${getCandidateVenue(candidate)}::${getCandidateSource(candidate)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(candidate);
  }

  return merged;
}

function formatCandidateLabel(candidate: any, index: number) {
  const authors = (candidate.authors || []).slice(0, 2).map((author: any) => author.name).join(", ");
  const venue = getCandidateVenue(candidate);
  const year = candidate.year || "";
  const source = getCandidateSource(candidate);
  return `${index + 1}. [${source}] ${candidate.title || "Untitled"}${year ? ` (${year})` : ""}${authors ? ` - ${authors}` : ""}${venue ? ` - ${venue}` : ""}`;
}

async function chooseCandidate(item: Zotero.Item, candidates: any[]) {
  if (candidates.length <= 1) {
    return candidates[0];
  }

  const dialogData: { [key: string]: any } = {
    selectedIndex: "",
    unloadCallback: () => {},
  };

  const dialogHelper = new ztoolkit.Dialog(2, 1)
    .addCell(0, 0, {
      tag: "div",
      namespace: "html",
      styles: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "100%",
        minWidth: "56em",
        maxHeight: "28em",
        overflowY: "auto",
      },
      children: candidates.map((candidate, index) => ({
        tag: "button",
        namespace: "html",
        id: `semantic-scholar-candidate-${index}`,
        attributes: {
          type: "button",
        },
        properties: {
          innerText: formatCandidateLabel(candidate, index),
        },
        styles: {
          textAlign: "left",
          whiteSpace: "normal",
          padding: "10px 12px",
          lineHeight: "1.4",
          cursor: "pointer",
        },
        listeners: [
          {
            type: "click",
            listener: () => {
              dialogData.selectedIndex = String(index);
              dialogData._lastButtonId = "select";
              dialogHelper.window?.close();
            },
          },
        ],
      })),
    })
    .addCell(1, 0, {
      tag: "div",
      namespace: "html",
      properties: {
        innerText: `Click the best Semantic Scholar match for:\n${item.getField("title") || item.key}`,
      },
      styles: {
        whiteSpace: "pre-wrap",
        marginTop: "8px",
        color: "#555",
      },
    })
    .addButton("Cancel", "cancel")
    .setDialogData(dialogData)
    .open("Select Semantic Scholar Match", {
      width: 900,
      centerscreen: true,
      alwaysRaised: true,
      fitContent: true,
    });

  addon.data.dialog = dialogHelper;
  await dialogData.unloadLock.promise;

  if (dialogData._lastButtonId !== "select") {
    appendSemanticScholarLog(`Selection cancelled for ${item.getField("title") || item.key}`);
    return undefined;
  }

  const index = Math.max(0, parseInt(dialogData.selectedIndex || "0", 10) || 0);
  return candidates[index];
}

async function fetchMetadataForItem(item: Zotero.Item) {
  const title = (item.getField("title") as string | undefined)?.trim();
  if (!title) {
    throw new Error("The item has no title.");
  }

  const searchTitle = title.replace(/[.。]+$/u, "").trim();
  appendSemanticScholarLog(`Searching by title: "${searchTitle}"`);
  const response = await requestSemanticScholar("/paper/search", {
    query: searchTitle,
    fields: PAPER_FIELDS,
    limit: String(SEARCH_LIMIT),
  });
  const semanticScholarCandidates = (unwrapPaperSearchResponse(response) || []).map((candidate: any) => ({
    ...candidate,
    metadataSource: "semanticscholar",
  }));
  appendSemanticScholarLog(`Semantic Scholar candidates: ${semanticScholarCandidates.length || 0}`);

  let dblpCandidates: any[] = [];
  try {
    dblpCandidates = await searchDBLPCandidates(searchTitle);
    appendSemanticScholarLog(`DBLP candidates: ${dblpCandidates.length || 0}`);
  } catch (error) {
    reportError(error, "semanticScholar.searchDBLP");
    appendSemanticScholarLog(`DBLP lookup failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const candidates = mergeCandidates(searchTitle, semanticScholarCandidates, dblpCandidates);
  appendSemanticScholarLog(`Merged candidates: ${candidates.length || 0}`);
  if (!candidates.length) {
    throw new Error("Semantic Scholar returned no candidates.");
  }

  if (semanticScholarCandidates[0]?.matchScore !== undefined) {
    appendSemanticScholarLog(`Top Semantic Scholar match score: ${semanticScholarCandidates[0].matchScore}`);
  }

  const selected = await chooseCandidate(item, candidates);
  if (!selected) {
    throw new Error("Selection cancelled.");
  }
  return selected;
}

function applyMetadataToItem(item: Zotero.Item, data: any) {
  maybeSetConferencePaperType(item, data);

  const publicationVenue = data.publicationVenue?.name || data.journal?.name || data.venue;
  setFieldIfSupported(item, "title", data.title);
  setFieldIfSupported(item, "abstractNote", data.abstract);
  setFieldIfSupported(item, "date", data.publicationDate || data.year);
  setFieldIfSupported(item, "publicationTitle", publicationVenue);
  setFieldIfSupported(item, "proceedingsTitle", publicationVenue);
  setFieldIfSupported(item, "conferenceName", publicationVenue);
  setFieldIfSupported(item, "DOI", data.externalIds?.DOI || data.DOI);
  setFieldIfSupported(item, "url", data.url || (data.externalIds?.DOI ? `https://doi.org/${data.externalIds.DOI}` : ""));
  setFieldIfSupported(item, "pages", data.journal?.pages);
  setFieldIfSupported(item, "volume", data.journal?.volume);
  setFieldIfSupported(item, "issue", data.journal?.issue);

  const creators = mapAuthorsToCreators(data.authors);
  if (creators.length > 0) {
    item.setCreators(creators as any);
  }

  if (!data.externalIds?.DOI && data.externalIds?.ArXiv) {
    setExtraField(item, "arXiv", data.externalIds.ArXiv);
  }
}

async function updateItem(item: Zotero.Item) {
  const data = await fetchMetadataForItem(item);
  if (!data?.title) {
    throw new Error("Semantic Scholar returned no usable metadata.");
  }

  appendSemanticScholarLog(
    `Matched "${item.getField("title") || item.key}" -> "${data.title}"${data.year ? ` (${data.year})` : ""}`,
  );
  applyMetadataToItem(item, data);
  await item.saveTx();
  appendSemanticScholarLog(`Saved item ${item.key}`);
}

export function initializeSemanticScholarMenu() {
  ztoolkit.Menu.unregister(MENU_ID);
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: MENU_ID,
    label: "Update Metadata from Semantic Scholar",
    commandListener: async () => {
      await updateSelectedItemsFromSemanticScholar();
    },
    getVisibility: () => getSelectedItems().length > 0,
  });
}

export async function updateSelectedItemsFromSemanticScholar() {
  const items = getSelectedItems();
  if (items.length === 0) {
    return;
  }

  appendSemanticScholarLog(`Starting update for ${items.length} item(s)`);

  const popupWin = new ztoolkit.ProgressWindow("Semantic Scholar", { closeTime: -1 })
    .createLine({ text: `Updating ${items.length} item(s)...`, type: "default" })
    .show();

  let successCount = 0;
  const failures: string[] = [];

  for (const [index, item] of items.entries()) {
    try {
      appendSemanticScholarLog(`Processing [${index + 1}/${items.length}] ${item.getField("title") || item.key}`);
      popupWin.changeLine({
        text: `[${index + 1}/${items.length}] ${item.getField("title") || item.key}`,
        type: "default",
      });
      await updateItem(item);
      successCount += 1;
      appendSemanticScholarLog(`Success: ${item.getField("title") || item.key}`);
      popupWin.changeLine({
        text: `${item.getField("title") || item.key}`,
        type: "success",
      });
    } catch (error: any) {
      reportError(error, "semanticScholar.updateSelectedItems");
      appendSemanticScholarLog(`Failed: ${item.getField("title") || item.key} - ${error?.message || String(error)}`);
      failures.push(`${item.getField("title") || item.key}: ${error?.message || String(error)}`);
      popupWin.changeLine({
        text: `${item.getField("title") || item.key}`,
        type: "fail",
      });

      const status = error?.status || error?.xmlhttp?.status;
      if (status === 401 || status === 403) {
        break;
      }
    }

    if (index < items.length - 1) {
      await Zotero.Promise.delay(1100);
    }
  }

  popupWin.changeHeadline(
    failures.length === 0
      ? `Updated ${successCount} item(s)`
      : `Updated ${successCount}/${items.length} item(s)`,
  );
  appendSemanticScholarLog(
    failures.length === 0
      ? `Completed successfully: ${successCount} item(s)`
      : `Completed with failures: ${successCount}/${items.length} item(s)`,
  );
  if (failures.length > 0) {
    popupWin.changeLine({
      text: failures[0],
      type: "fail",
    });
  }
  popupWin.startCloseTimer(5000);
}

export function loadSemanticScholarApiKeyForPreferences() {
  return getSemanticScholarApiKey();
}

export function saveSemanticScholarApiKeyForPreferences(apiKey: string) {
  return setSemanticScholarApiKey(apiKey);
}

export function clearSemanticScholarApiKeyForPreferences() {
  clearSemanticScholarApiKey();
}

export function loadSemanticScholarLogsForPreferences() {
  return getSemanticScholarLogs();
}

export function clearSemanticScholarLogsForPreferences() {
  clearSemanticScholarLogs();
}
