export function searchRelatedItem(
  item: Zotero.Item,
  refItem: Zotero.Item,
): Zotero.Item | undefined {
  if (!item) {
    return;
  }
  const relatedItems = item.relatedItems.map(key =>
    Zotero.Items.getByLibraryAndKey(1, key) as Zotero.Item,
  );
  if (refItem) {
    return relatedItems.find((item: Zotero.Item) => refItem.id == item.id);
  }
}

export async function searchItem(info: ItemBaseInfo) {
  if (!info) {
    return;
  }
  const s = new Zotero.Search();
  // @ts-ignore
  s.addCondition("joinMode", "any");
  if (info.identifiers.DOI) {
    s.addCondition("DOI", "is", info.identifiers.DOI);
    s.addCondition("DOI", "is", info.identifiers.DOI.toLowerCase());
    s.addCondition("DOI", "is", info.identifiers.DOI.toUpperCase());
  } else {
    if (info.title && info.title?.length > 8) {
      s.addCondition("title", "contains", info.title!);
    }
    s.addCondition("url", "contains", info.identifiers.arXiv!);
  }
  const ids = await s.search();
  const items = (await Zotero.Items.getAsync(ids)).filter(i => {
    return (
      !i.itemType.startsWith("attachment") &&
      i.isRegularItem && i.isRegularItem()
    );
  });
  if (items.length) {
    return items[0];
  }
}

export async function searchLibraryItem(
  info: ItemBaseInfo,
  cache: { [key: string]: any },
  searchItemFn: (info: ItemBaseInfo) => Promise<Zotero.Item | undefined>,
): Promise<Zotero.Item | undefined> {
  await Zotero.Promise.delay(0);
  const key = JSON.stringify(info.identifiers) + info.text + "library-item";
  if (key in cache) {
    info._item = cache[key];
    return cache[key];
  }

  const items: Zotero.Item[] = await Zotero.Items.getAll(1);
  const getPureText = (s: string) => (
    cache["getPureText" + s] ??= s.toLowerCase().match(/[0-9a-z]+/g)?.join("")!
  );
  const item = await searchItemFn(info) || items.filter(i => (
    i.isRegularItem() &&
    i.getField("title") &&
    ["journalArtical", "preprint", "book"].indexOf(i.itemType) != -1
  )).find((item: Zotero.Item) => {
    try {
      let title = item.getField("title") as string;
      if (title.split(" ").length < 4) {
        return false;
      }
      title = getPureText(title);
      const searchTitle = getPureText(info.title || info.text as string);
      if (searchTitle.length > 10 && title && searchTitle && (title?.indexOf(searchTitle) != -1 || searchTitle?.indexOf(title) != -1)) {
        return item;
      }
    } catch (e) {}
  });

  if (item) {
    info._item = item;
    cache[key] = item;
    info.title = item.getField("title") as string;
    const DOI = item.getField("DOI") as string;
    if (DOI) {
      info.identifiers = { DOI };
    }
  }
  return item;
}
