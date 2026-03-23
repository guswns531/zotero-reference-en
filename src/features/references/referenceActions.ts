import Utils from "./utils";

export function collapseReferenceText(text: string) {
  const n = 35;
  return text.length > n ? `${text.slice(0, n)}...` : text;
}

export async function resolveReferenceURL(utils: Utils, reference: ItemBaseInfo) {
  if (reference.url) {
    return reference.url;
  }

  const DOI = (await utils.API.getTitleInfoByConnectedpapers(reference.title as string))
    ?.identifiers.DOI;
  return utils.identifiers2URL({ DOI });
}

export async function findOrCreateReferenceItem(
  utils: Utils,
  parentItem: Zotero.Item,
  reference: ItemBaseInfo,
  collections?: number[],
) {
  let refItem = reference._item || await utils.searchLibraryItem(reference);
  if (refItem) {
    return refItem;
  }

  const info = utils.refText2Info(reference.text!);
  if (Object.keys(reference.identifiers).length == 0) {
    const DOI = (await utils.API.getTitleInfoByConnectedpapers(info.title))?.identifiers.DOI as string;
    if (!utils.isDOI(DOI)) {
      return;
    }
    reference.identifiers = { DOI };
  }

  refItem = await utils.createItemByZotero(
    reference.identifiers,
    collections || parentItem.getCollections(),
  );
  return refItem;
}

export async function linkReferenceItem(
  parentItem: Zotero.Item,
  reference: ItemBaseInfo,
  refItem: Zotero.Item,
  collections?: number[],
) {
  for (const collectionID of (collections || parentItem.getCollections())) {
    refItem.addToCollection(collectionID);
    await refItem.saveTx();
  }

  reference._item = refItem;
  parentItem.addRelatedItem(refItem);
  refItem.addRelatedItem(parentItem);
  await parentItem.saveTx();
  await refItem.saveTx();
}

export async function unlinkReferenceItem(
  utils: Utils,
  parentItem: Zotero.Item,
  reference: ItemBaseInfo,
) {
  const relatedItem = utils.searchRelatedItem(parentItem, reference._item) as Zotero.Item;
  if (!relatedItem) {
    return false;
  }

  relatedItem.removeRelatedItem(parentItem);
  parentItem.removeRelatedItem(relatedItem);
  await parentItem.saveTx();
  await relatedItem.saveTx();
  return true;
}
