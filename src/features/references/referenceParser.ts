import {
  extractURL,
  getIdentifiers,
  identifiers2URL,
} from "./identifiers";

export function parseRefText(text: string): {
  year?: string;
  authors?: string[];
  title: string;
  publicationVenue?: String;
} {
  try {
    text = text.replace(/^\[\d+?\]/, "");
    text = text.replace(/\s+/g, " ");
    let title: string, titleMatch: string;
    if (/\u201c(.+)\u201d/.test(text)) {
      [titleMatch, title] = text.match(/\u201c(.+)\u201d/)!;
      if (title.endsWith(",")) {
        title = title.slice(0, -1);
      }
    } else {
      title = titleMatch = ((text.indexOf(". ") != -1 && text.match(/\.\s/g)!.length >= 2) && text.split(". ") || text.split("."))
        .sort((a, b) => b.length - a.length)
        .map((s: string) => {
          let count = 0;
          [/[A-Z]\./g, /[,\.\-\(\)\:]/g, /\d/g].forEach(regex => {
            const res = s.match(regex);
            count += (res ? res.length : 0);
          });
          return [count / s.length, s];
        })
        .filter((s: any) => s[1].match(/\s+/g)?.length >= 3)
        .sort((a: any, b: any) => a[0] - b[0])![0][1] as string;
      if (/\[[A-Z]\]$/.test(title)) {
        title = title.replace(/\[[A-Z]\]$/, "");
      }
    }
    title = title.trim();
    const splitByTitle = text.split(titleMatch);
    let authorInfo = splitByTitle[0].trim();
    const publicationVenue = splitByTitle[1].match(/[^.\s].+[^\.]/)![0].split(/[,\d]/)[0].trim();
    if (authorInfo.indexOf("et al.") != -1) {
      authorInfo = authorInfo.split("et al.")[0] + "et al.";
    }
    const currentYear = new Date().getFullYear();
    const res = text.match(/[^\d]\d{4}[^\d-]/g)?.map(s => s.match(/\d+/)![0]);
    const year = res?.find(s => Number(s) <= Number(currentYear) + 1)!;
    authorInfo = authorInfo.replace(`${year}.`, "").replace(year, "").trim();
    return { year, title, authors: [authorInfo], publicationVenue };
  } catch {
    return { title: text };
  }
}

export function parseRefTextLegacy(text: string): { year: string; authors: string[]; title: string } {
  let year;
  const _years = text.match(/[^\d]?(\d{4})[^\d]?/g) as string[];
  if (_years) {
    const years = _years
      .map(year => Number(year.match(/\d{4}/)![0]))
      .filter(year => year > 1900 && year < (new Date()).getFullYear());
    if (years.length > 0) {
      year = String(years[0]);
    }
  }
  year = year as string;
  const authors: string[] = [];
  const authorRegexs = [/[A-Za-z,\.\s]+?\.?[\.,;]/g, /[A-Z][a-z]+ et al.,/];
  authorRegexs.forEach(regex => {
    text.match(regex)?.forEach(author => {
      authors.push(author.slice(0, -1));
    });
  });
  const title = text
    .split(/[,\.]\s/g)
    .filter((e: string) => !e.includes("http"))
    .sort((a, b) => b.length - a.length)[0];
  return { title, authors, year };
}

export function refText2Info(text: string): ItemBaseInfo {
  const identifiers = getIdentifiers(text);
  return {
    identifiers,
    url: extractURL(text) || identifiers2URL(identifiers),
    authors: [],
    ...parseRefText(text),
    type: identifiers.arXiv ? "preprint" : "journalArticle",
  };
}
