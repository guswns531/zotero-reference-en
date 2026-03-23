import Utils from "./utils"
var xml2js = require('xml2js')
import Requests from "../../platform/requests";
import {
  mapArxivItem,
  mapConnectedPapersItem,
  mapCrossrefItem,
  mapReadpaperItem,
  mapSemanticScholarItem,
  mapUnpaywallItem,
} from "./sources/mappers";

class API {
  public utils: Utils;
  public requests: Requests;
  constructor(utils: Utils) {
    this.utils = utils
    this.requests = new Requests()
  }

  // For DOI
  async getDOIBaseInfo(DOI: string): Promise<ItemBaseInfo | undefined> {
    const routes: any = {
      semanticscholar: `https://api.semanticscholar.org/graph/v1/paper/${DOI}?fields=title,year,authors`,
      unpaywall: `https://api.unpaywall.org/v2/${DOI}?email=ZoteroReference@polygon.org`
    }
    for (let route in routes) {
      let response = await this.requests.get(routes[route])
      if (response) {
        response.DOI = DOI
        return (
          route == "semanticscholar"
            ? mapSemanticScholarItem(response)
            : mapUnpaywallItem(response)
        ) as ItemBaseInfo
      }
    }
  }

  /**
   * From semanticscholar API
   * @param DOI 
   */
  async getDOIInfoBySemanticscholar(DOI: string): Promise<ItemInfo | undefined> {
    const api = `https://api.semanticscholar.org/graph/v1/paper/${DOI}?fields=title,authors,abstract,year,journal,fieldsOfStudy,publicationVenue,publicationDate`
    let response = await this.requests.get(api)
    if (response) {
      response.DOI = DOI
      if (!response.abstract) {
        // The abstract may be too long, so fetch it from the web page
        let text = await this.requests.get(
          `https://www.semanticscholar.org/paper/${response.paperId}`,
          "text/html"
        )
        let parser = ztoolkit.getDOMParser()
        let doc = parser.parseFromString(text, "text/html")
        const abstract = doc.head.querySelector("meta[name=description]")?.getAttribute("content")
        if (!abstract?.startsWith("Semantic Scholar")) {
          response.abstract = abstract
        }
      }
      return mapSemanticScholarItem(response)
    }
  }

  async getDOIInfoByCrossref(DOI: string): Promise<ItemInfo | undefined> {
    const api = `https://api.crossref.org/works/${DOI}/transform/application/vnd.citationstyles.csl+json`
    let response = await this.requests.get(api)
    if (response) {
      response.DOI = DOI
      let info: ItemInfo = mapCrossrefItem(this.utils, response)
      return info
    }
  }

  // async getDOIRelatedArray(DOI: string): Promise<ItemBaseInfo[] | undefined> {
  //   const api = `https://services.readcube.com/reader/related?doi=${DOI}`
  //   let response = await this.requests.get(api)
  //   if (response) {
  //     let arr: ItemBaseInfo[] = response.map((i: any) => {
  //       return this.BaseInfo.readcube(i) as ItemBaseInfo
  //     })
  //     return arr
  //   }
  // }


  async getDOIRelatedArray(DOI: string, limit: number = 20): Promise<ItemBaseInfo[] | undefined> {
    let res = await this.requests.get(
      `https://rest.connectedpapers.com/id_translator/doi/${DOI}`,
      "json",
      {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 e/107.0.0.0 Safari/537.36"
      }
    )
    const api = `https://www.semanticscholar.org/api/1/paper/${res.paperId}/related-papers?limit=20&recommenderType=relatedPapers`
    // const api = `https://www.semanticscholar.org/api/1/search/paper/${res.paperId}/citations`
    let response = await this.requests.get(api, "json", {
      cookie: "aws-waf-token=fcf9f43b-d494-44a8-8806-da20c50d9457:AQoAaIgZ+Q0AAAAA:z/ZtlDV2Oz/Ymw+RFbJ0vnEAl1/wBKTH6I4/INUou3Qqkm00bibIWkYKq0w3qq4yxB2EtdBTtRT7Q2MBPjx17WmPmcVznf7mTMTwFQjmJOB2VgQeoBzsmuzVlI/l/NBlyTFdH8xEKYYWbXB8R5oK9o7JxolugTzDKvLX4Pc57cdkbCA5A6AIExi/Wm16"
    })
    ztoolkit.log(response)
    if (response) {
      let arr: ItemInfo[] = response.papers.map((i: any) => {
        let info: ItemInfo = {
          title: i.title.text,
          identifiers: {},
          year: i.year.text,
          text: i.title.text,
          type: "journalArticle",
          authors: i.authors.map((e: any) => e[1].text),
          abstract: i.paperAbstract?.text || i?.paperAbstractTruncated
        }
        if (i.citationContexts?.length > 0) {
          let descriptions: string[] = []
          i.citationContexts.slice(0, 1).forEach((ctx: any) => {
            try {
              descriptions.push(
                `${ctx.intents.length > 0 ? ctx.intents[0].id : "unknown"}: ${i.citationContexts[0].context.text}`
              )
            } catch {
              ztoolkit.log(ctx)
            }
          })
          info.description = descriptions.join("\n")
        }
        return info
      })
      return arr
    }
  }

  /**
   * Deprecated API path.
   */
  async _getDOIRelatedArray(DOI: string, limit: number = 20): Promise<ItemBaseInfo[] | undefined> {
    let res = await this.requests.get(
      `https://rest.connectedpapers.com/id_translator/doi/${DOI}`,
      "json",
      {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 e/107.0.0.0 Safari/537.36"
      }
    )
    const api = `https://www.semanticscholar.org/api/1/search/paper/${res.paperId}/citations`
    let response = await this.requests.post(api, {
      "page": 1,
      "pageSize": 20,
      "sort": "relevance",
      "authors": [],
      "coAuthors": [],
      "venues": [],
      "yearFilter": null,
      "requireViewablePdf": false,
      "fieldsOfStudy": [],
      "useS2FosFields": true
    })
    ztoolkit.log(response)
    if (response) {
      let arr: ItemInfo[] = response.results.map((i: any) => {
        let info: ItemInfo = {
          title: i.title.text,
          identifiers: {},
          year: i.year,
          text: i.title.text,
          type: "journalArticle",
          authors: i.authors.map((e: any) => e[1].text),
        }
        if (i.citationContexts?.length > 0) {
          let descriptions: string[] = []
          i.citationContexts.slice(0, 1).forEach((ctx: any) => {
            try {
              descriptions.push(
                `${ctx.intents.length > 0 ? ctx.intents[0].id : "unknown"}: ${i.citationContexts[0].context.text}`
              )
            } catch {
              ztoolkit.log(ctx)
            }
          })
          info.description = descriptions.join("\n")
        }
        return info
      })
      return arr
    }
  }
  // For arXiv
  async getArXivInfo(arXiv: string) {
    const api = `https://export.arxiv.org/api/query?id_list=${arXiv}`
    let response = await this.requests.get(
      api,
      "application/xhtml+xml"
    )
    if (response) {
      let data = (await xml2js.parseStringPromise(response))?.feed?.entry[0]
      if (data) {
        data.arXiv = arXiv
        return mapArxivItem(this.utils, data)
      }
    }
  }

  // For title
  /**
   * From crossref
   * @param title 
   * @returns 
   */
  async getTitleInfoByCrossref(title: string): Promise<ItemInfo | undefined> {
    const api = `https://api.crossref.org/works?query=${title}`
    let response = await this.requests.get(api)
    if (response) {
      const skipTypes = ["component"]
      let item = response.message.items.filter((e: any) => skipTypes.indexOf(e.type) == -1)[0]
      let info = mapCrossrefItem(this.utils, item) as ItemInfo
      return info
    }
  }

  async getTitleInfoByConnectedpapers(text: string): Promise<ItemInfo | undefined> {
    let title = text
    if (this.utils.isDOI(text)) {
      let DOI = text
      let res = await this.requests.get(
        `https://rest.connectedpapers.com/id_translator/doi/${DOI}`
      )
      title = res.title
    }
    const api = `https://rest.connectedpapers.com/search/${escape(title)}/1`
    let response = await this.requests.post(api)
    if (response) {
      if (response?.results?.length) {
        let item = response.results[0]
        let info = mapConnectedPapersItem(item) as ItemInfo
        return info
      }
    }
  }
  
  async getTitleInfoByReadpaper(title: string, body: object = {}, doi: string | undefined = undefined): Promise<ItemInfo|undefined> {
    const api = "https://readpaper.com/api/microService-app-aiKnowledge/aiKnowledge/paper/search"
    let _body = {
      keywords: title,
      page: 1,
      pageSize: 1,
      searchType: Number(Object.values(body).length > 0)
    }
    body = { ..._body, ...body }

    let response = await this.requests.post(api, body)
    if (response && response?.data?.list?.[0]) {
      let data = response?.data?.list?.[0]
      // Verify the DOI
      if (doi) {
        // Fetch the DOI for the paperId
        let _res = await this.requests.post(
          "https://readpaper.com/api/microService-app-aiKnowledge/aiKnowledge/paper/getPaperDetailInfo",
          { paperId: data.id }
        )
        ztoolkit.log(doi, _res.data.doi)
        if (_res.data.doi.toUpperCase() != doi.toUpperCase()) {
          return
        }
      }
      let info = mapReadpaperItem(this.utils, data) as ItemInfo
      if (doi) { info.identifiers = { DOI: doi }}
      return info
    }
  }

}

export default  API
