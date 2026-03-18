import Utils from "../utils";

const crossrefTypes: any = {
  "journal-article": "journalArticle",
  "report": "report",
  "posted-content": "preprint",
  "book-chapter": "bookSection",
};

export function mapCrossrefItem(utils: Utils, item: any): ItemInfo {
  const references: ItemBaseInfo[] = item.reference?.map((ref: any) => {
    let identifiers;
    let url: string | undefined;
    let text: string;
    let textInfo: any = {};
    if (ref.unstructured) {
      text = ref.unstructured;
      textInfo = utils.refText2Info(text);
    } else if (ref["article-title"] && ref.year && ref.author) {
      text = `${ref.author} et al., ${ref.year}, ${ref["article-title"]}`;
    } else {
      text = Object.keys(ref).map((key) => `${key}: ${ref[key]}`).join("; ");
    }

    if (ref.DOI) {
      identifiers = { DOI: ref.DOI };
      url = utils.identifiers2URL(identifiers);
    }

    return {
      identifiers: identifiers || textInfo.identifiers || {},
      title: ref["article-title"],
      authors: [ref?.author],
      year: ref.year,
      text,
      type: crossrefTypes[ref.type] || "journalArticle",
      url: textInfo?.url || url,
    } as ItemBaseInfo;
  });

  const refCount = item["is-referenced-by-count"];
  return {
    identifiers: { DOI: item.DOI },
    authors: item?.author?.map((i: any) => i.family),
    title: Array.isArray(item.title) ? item.title[0] : item.title,
    year: item.published && item.published["date-parts"][0][0],
    type: crossrefTypes[item.type] || "journalArticle",
    text: item.title[0],
    url: item.URL,
    abstract: item.abstract,
    publishDate: item.published && item.published["date-parts"][0].join("-"),
    source: item.source.toLowerCase(),
    primaryVenue: item["container-title"] ? item["container-title"][0] : [],
    references,
    tags: [
      ...(refCount && refCount > 0 ? [{
        text: refCount,
        color: "#2fb8cb",
        tip: "is-referenced-by-count",
      }] : []),
    ],
  };
}

export function mapConnectedPapersItem(item: any): ItemInfo {
  return {
    identifiers: { DOI: item.doiInfo.doi },
    authors: item?.authors?.map((i: any) => i[0].name),
    title: item.title.text,
    year: item.year.text,
    type: "journalArticle",
    text: item.title.text,
    url: item.doiInfo.doiUrl,
    abstract: item.paperAbstract.text,
    source: "connectedpapers",
    primaryVenue: item.venue.text,
    references: [],
    tags: [
      { text: item.citationStats.numCitations, tip: "citationStats.numCitations", color: "rgba(53, 153, 154, 0.5)" },
      { text: item.citationStats.numReferences, tip: "citationStats.numReferences", color: "rgba(53, 153, 154, 0.75)" },
    ],
  };
}

export function mapReadpaperItem(utils: Utils, data: any): ItemInfo {
  return {
    identifiers: {},
    title: utils.Html2Text(data.title) as string,
    year: data.year,
    publishDate: data.publishDate,
    authors: data?.authorList.map((i: any) => utils.Html2Text(i.name)),
    abstract: utils.Html2Text(data.summary) as string,
    primaryVenue: utils.Html2Text(data.primaryVenue) as string,
    tags: [
      ...(data.venueTags || []),
      ...(
        data.citationCount && data.citationCount > 0
          ? [{ text: data.citationCount, tip: "citationCount", color: "#1f71e0" }]
          : []
      ),
    ],
    source: "readpaper",
    type: "journalArticle",
  };
}

export function mapSemanticScholarItem(data: any): ItemInfo {
  return {
    identifiers: { DOI: data.DOI },
    title: data.title,
    authors: data.authors.map((i: any) => i.name),
    year: data.year,
    publishDate: data.publicationDate,
    abstract: data.abstract,
    source: "semanticscholar",
    type: "journalArticle",
    tags: data.fieldsOfStudy || [],
    primaryVenue: data.journal?.name,
    url: data.DOI ? `http://doi.org/${data.DOI}` : undefined,
  };
}

export function mapUnpaywallItem(data: any): ItemInfo {
  return {
    identifiers: { DOI: data.DOI },
    authors: data.z_authors.map((i: any) => i.family),
    title: data.title,
    year: data.year,
    type: crossrefTypes[data.genre],
    primaryVenue: data.journal_name,
    source: "unpaywall",
    publishDate: data.published_date,
    abstract: undefined,
  };
}

export function mapArxivItem(utils: Utils, data: any): ItemInfo {
  return {
    identifiers: { arXiv: data.arXiv },
    title: data.title[0].replace(/\n/g, ""),
    year: data.year,
    authors: data.author.map((e: any) => e.name[0]),
    abstract: data.summary[0].replace(/\n/g, ""),
    url: utils.identifiers2URL({ arXiv: data.arXiv }),
    type: "preprint",
    tags: data.category.map((e: any) => e["$"].term),
    publishDate: data.published && data.published[0],
    primaryVenue: data["arxiv:comment"] && data["arxiv:comment"][0]["_"].replace(/\n/g, ""),
  };
}

export function mapReadcubeBase(utils: Utils, data: any): ItemBaseInfo {
  let identifiers;
  if (data.doi && utils.regex.arXiv.test(data.doi)) {
    data.arxiv = data.doi.match(utils.regex.arXiv).slice(-1)[0];
    data.doi = undefined;
  }
  let type = "journalArticle";
  if (data.arxiv && !data.doi) {
    identifiers = { arXiv: data.arxiv };
    type = "preprint";
  } else {
    identifiers = { DOI: data.doi };
  }
  const url = utils.identifiers2URL(identifiers);
  return {
    identifiers,
    title: data.title,
    authors: data?.authors,
    year: data.year,
    type,
    text: data.title,
    url,
  };
}
