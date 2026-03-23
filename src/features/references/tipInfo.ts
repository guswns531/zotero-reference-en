import { config } from "../../../package.json";
import Utils from "./utils";

type TipSourceConfig = {
  [key: string]: { color: string; tip?: string };
};

const sourceConfig: TipSourceConfig = {
  arXiv: {
    color: "#b31b1b",
    tip: "arXiv is a free distribution service and an open-access archive for 2,186,475 scholarly articles in the fields of physics, mathematics, computer science, quantitative biology, quantitative finance, statistics, electrical engineering and systems science, and economics. Materials on this site are not peer-reviewed by arXiv.",
  },
  readpaper: {
    color: "#1f71e0",
    tip: "ReadPaper is a scholarly reading platform that indexes nearly 200 million papers, 270 million authors, and nearly 30,000 universities and research institutions across almost every discipline. Its mission is to make research papers easier to read and understand.",
  },
  semanticscholar: {
    color: "#1857b6",
    tip: "Semantic Scholar is an artificial intelligence–powered research tool for scientific literature developed at the Allen Institute for AI and publicly released in November 2015. It uses advances in natural language processing to provide summaries for scholarly papers. The Semantic Scholar team is actively researching the use of artificial-intelligence in natural language processing, machine learning, Human-Computer interaction, and information retrieval.",
  },
  crossref: {
    color: "#89bf04",
    tip: "Crossref is a nonprofit association of approximately 2,000 voting member publishers who represent 4,300 societies and publishers, including both commercial and nonprofit organizations. Crossref includes publishers with varied business models, including those with both open access and subscription policies.",
  },
  connectedpapers: {
    color: "#35999a",
    tip: "Connected Papers is a visual tool to help researchers and applied scientists find academic papers relevant to their field of work.",
  },
  DOI: { color: "#fcb426" },
  Zotero: {
    color: "#d63b3b",
    tip: "Zotero is a free, easy-to-use tool to help you collect, organize, cite, and share your research sources.",
  },
};

async function getDefaultInfo(
  utils: Utils,
  reference: ItemInfo,
  refText: string,
  idText?: string,
) {
  const localItem = reference._item;
  let info: ItemInfo;
  if (localItem) {
    info = {
      identifiers: {},
      authors: localItem.getCreators().map((i: any) => i.firstName + " " + i.lastName),
      tags: localItem.getTags().map((i: any) => {
        const ctag: any = localItem.getColoredTags().find((ci: any) => ci.tag == i.tag);
        if (ctag) {
          return { text: i.tag, color: ctag.color };
        }
        return i.tag;
      }),
      abstract: localItem.getField("abstractNote") as string,
      title: localItem.getField("title") as string,
      year: localItem.getField("year") as string,
      primaryVenue: localItem.getField("publicationTitle") as string,
      type: "",
      source: reference.source || undefined,
    };
  } else {
    info = {
      identifiers: reference.identifiers || {},
      authors: reference.authors || [],
      type: "",
      year: reference.year || undefined,
      title: reference.title || idText || "Reference",
      tags: reference.tags || [],
      text: reference.text || refText,
      abstract: reference.abstract || refText,
      primaryVenue: reference.primaryVenue || undefined,
    };
    const url = utils.identifiers2URL(info.identifiers);
    if (url) {
      info.url = url;
    }
  }

  return info;
}

export function getTipCandidates(utils: Utils, reference: ItemInfo, idText?: string) {
  const refText = reference.text!;
  let according: string;
  let coroutines: Promise<ItemInfo | undefined>[];

  if (reference?.identifiers.arXiv) {
    according = "arXiv";
    coroutines = [
      getDefaultInfo(utils, reference, refText, idText),
      utils.API.getArXivInfo(reference.identifiers.arXiv),
    ];
  } else if (reference?.identifiers.DOI) {
    according = "DOI";
    coroutines = [
      getDefaultInfo(utils, reference, refText, idText),
      utils.API.getDOIInfoBySemanticscholar(reference.identifiers.DOI),
      utils.API.getTitleInfoByReadpaper(refText, {}, reference.identifiers.DOI),
      utils.API.getTitleInfoByConnectedpapers(reference.identifiers.DOI),
      utils.API.getDOIInfoByCrossref(reference.identifiers.DOI),
    ];
  } else {
    according = "Title";
    coroutines = [
      getDefaultInfo(utils, reference, refText, idText),
      utils.API.getTitleInfoByReadpaper(reference.title),
      utils.API.getTitleInfoByCrossref(reference.title),
      utils.API.getTitleInfoByConnectedpapers(reference.title),
    ];
  }

  const prefIndex = parseInt(
    Zotero.Prefs.get(`${config.addonRef}.${according}InfoIndex`) as string,
  );

  return { according, coroutines, prefIndex };
}

export function buildTipTags(info: ItemInfo, reference: ItemInfo) {
  const tagDefaultColor = "#59C1BD";
  const tags = (info.tags || []).map((tag: object | string) => {
    if (typeof tag == "object") {
      return { color: tagDefaultColor, ...(tag as object) };
    }
    return { color: tagDefaultColor, text: tag };
  }) as any[];

  if (info.source) {
    tags.push({
      text: info.source,
      ...sourceConfig[info.source as keyof typeof sourceConfig],
      source: info.source,
    });
  }

  if (info.identifiers.DOI) {
    const DOI = info.identifiers.DOI;
    tags.push({ text: "DOI", color: sourceConfig.DOI.color, tip: DOI, url: info.url });
  }

  if (info.identifiers.arXiv) {
    const arXiv = info.identifiers.arXiv;
    tags.push({ text: "arXiv", color: sourceConfig.arXiv.color, tip: arXiv, url: info.url });
  }

  if (reference._item) {
    tags.push({
      text: "Zotero",
      color: sourceConfig.Zotero.color,
      tip: sourceConfig.Zotero.tip,
      item: reference._item,
    });
  }

  return tags;
}
