export const referenceRegex = {
  DOI: /10\.\d{4,9}\/[-\._;\(\)\/:A-z0-9><]+[^\.\]]/,
  arXiv: /arXiv[\.:](\d+\.\d+)/,
  URL: /https?:\/\/[^\s\.]+/,
};

export function getIdentifiers(text: string): ItemBaseInfo["identifiers"] {
  const targets = [
    {
      key: "DOI",
      ignoreSpace: true,
      regex: referenceRegex.DOI,
    },
    {
      key: "arXiv",
      ignoreSpace: true,
      regex: referenceRegex.arXiv,
    },
  ];

  const identifiers: any = {};
  for (const target of targets) {
    const res = (target.ignoreSpace ? text.replace(/\s+/g, "") : text).match(target.regex);
    if (res) {
      identifiers[target.key] = res.slice(-1)[0];
    }
  }
  return identifiers;
}

export function extractURL(text: string) {
  const res = text.match(referenceRegex.URL);
  if (res) {
    return res.slice(-1)[0];
  }
}

export function identifiers2URL(identifiers: ItemBaseInfo["identifiers"]) {
  let url;
  if (identifiers.DOI) {
    url = `https://doi.org/${identifiers.DOI}`;
  }
  if (identifiers.arXiv) {
    url = `https://arxiv.org/abs/${identifiers.arXiv}`;
  }
  return url;
}

export function isDOI(text: string) {
  if (!text) {
    return false;
  }
  const res = text.match(referenceRegex.DOI);
  if (res) {
    return res[0] == text && !/(cnki|issn)/i.test(text);
  }
  return false;
}

export function matchArXiv(text: string) {
  const res = text.match(referenceRegex.arXiv);
  if (res != null && res.length >= 2) {
    return res[1];
  }
  return false;
}
