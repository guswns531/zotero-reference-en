# Zotero Reference

![Reference](addon/chrome/content/icons/favicon.png)

[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-round&logo=github)](https://github.com/windingwind/zotero-plugin-template)
[![Latest release](https://img.shields.io/github/v/release/MuiseDestiny/zotero-reference)](https://github.com/MuiseDestiny/zotero-reference/releases)
![Release Date](https://img.shields.io/github/release-date/MuiseDestiny/zotero-reference?color=9cf)
[![License](https://img.shields.io/github/license/MuiseDestiny/zotero-reference)](https://github.com/MuiseDestiny/zotero-reference/blob/master/LICENSE)
![Downloads latest release](https://img.shields.io/github/downloads/MuiseDestiny/zotero-reference/latest/total?color=yellow)

If PDF parsing fails, leave feedback in [this issue](https://github.com/MuiseDestiny/zotero-reference/issues/6).

Open the preferences window before first use and configure the plugin for your workflow. The plugin does not create data on its own; it focuses on moving reference data into Zotero efficiently.

The colored dots at the top of the popup indicate different data sources. Click a dot to switch sources.

![Standard view](https://user-images.githubusercontent.com/51939531/226575476-3234f112-877a-4b6e-a110-ecc3aee72d26.png)

![Stacked view](https://user-images.githubusercontent.com/51939531/227147529-bd6b97ee-4d5e-4239-adb9-591cdc3a88cb.png)

## Usage

### Refresh

![Refresh](https://user-images.githubusercontent.com/51939531/221145006-56834b6e-e5c2-4bb4-a369-cfcf15a53349.png)

| Action | Trigger | Description |
| -- | -- | -- |
| Click | Parse or fetch references for the current PDF | The first click uses the preferred source set in preferences. Clicking refresh again switches to the next source. |
| Long press | Ignore locally cached references and parse again | If cached references exist for the current PDF, they are used by default. Long press forces a fresh parse. Works for all sources. |
| `Ctrl` + click or long press | Parse references starting from the current page and moving backward | Only applies to the PDF source. This is useful for theses and dissertations. Scroll to the page containing the final reference before using it. |
| Double-click the `31 references` text | Copy all current references to the clipboard | |

### References

![References](https://user-images.githubusercontent.com/51939531/208303590-dfe6f3cf-cd48-4afe-90a0-9cce6ff5f9cb.png)

![References list](https://user-images.githubusercontent.com/51939531/221150190-934a1c03-99ff-421a-880b-8c1b4b185898.png)

![Reference actions](https://user-images.githubusercontent.com/51939531/208303399-0dc09046-997c-4809-8639-9100001e6002.png)

| Action | Trigger | Description |
| -- | -- | -- |
| Click the blue area | Copy reference information | Identifiers such as DOI are copied together with the citation. |
| Long press the blue area | Edit the reference information | This is especially useful for Chinese references, where trimming noisy metadata can improve import success. |
| `Ctrl` + click the blue area | Open the reference URL in the system browser | Resolving the URL may take a moment. |
| Click `+` | Add the reference to every folder containing the currently opened item, and create a two-way link | |
| `Ctrl` + click `+` | Add the reference to the folder selected in the Zotero main pane, and create a two-way link | For example, the `GEE` collection in the screenshot above. |
| Click `-` | Remove the two-way link | The reference item itself is not deleted and remains in `My Library`. |

### Popup

Supported sources:

- PDF by default
- ReadPaper by title search
- Crossref by title or DOI search
- Semantic Scholar by DOI search
- arXiv by arXiv ID search

![Popup](https://user-images.githubusercontent.com/51939531/217994089-100d5d20-8a6b-42ec-ad9b-5550cf354366.png)

Text inside the popup can be selected and copied.

![Copy text](https://user-images.githubusercontent.com/51939531/217994406-64e96f4e-68bf-49bf-bda3-f6fe4a003df9.png)

### Zoom

Use `Ctrl` + mouse wheel.

![Zoom](https://user-images.githubusercontent.com/51939531/217994453-686cc320-d2bf-49dc-be73-6b95cd5cdbfb.png)

### Translation

Install [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate) first.

Then use `Ctrl` + left click to switch between the original text and the translation.

![Translation](https://user-images.githubusercontent.com/51939531/217994498-87ce1191-407f-45e1-bf97-ddd178375d07.png)

### Split-View Jump

If the main reader contains jump links such as `Fig 4`, clicking them opens the destination in the split view, either horizontal or vertical. The main reader itself does not jump, which avoids breaking back/forward navigation. This is useful for figures, formulas, and tables, but only works for PDFs that already contain jump links.

![Split view](https://user-images.githubusercontent.com/51939531/209768934-c959f54c-09d2-47e9-871c-defe42074afe.png)

To disable this feature, clear the checkbox shown below.

![Disable split view](https://user-images.githubusercontent.com/51939531/217995465-d5893305-c0d2-4c50-b4ca-42c50d2f077c.png)

### Recommended Related Items

Powered by the `readcube API`.

![Recommended related items](https://user-images.githubusercontent.com/51939531/209890021-14b421a6-f5d8-476f-801f-294a8104f95f.png)

### Preferences

- `Automatically refresh references...`: Fetch references automatically when an item is opened.
- `...except for the item types below`: Exclude item types that are typically very long, where auto-refresh may be expensive.
- `Prefer ... when retrieving references`: Choose whether the first refresh uses PDF parsing or a URL/API source.
- `In the floating window, hold Ctrl and click text to translate it`: Enable translation from popup titles using `zotero-pdf-translate`.

Even if auto-refresh is disabled, or the current item type is excluded from auto-refresh, you can still fetch references manually by clicking Refresh.

Item types must be entered in English and separated with commas:

<details>
<summary>Item Type Reference</summary>

```text
note = note
annotation = annotation
attachment = attachment
book = book
bookSection = book section
journalArticle = journal article
magazineArticle = magazine article
newspaperArticle = newspaper article
thesis = thesis
letter = letter
manuscript = manuscript
interview = interview
film = film
artwork = artwork
webpage = webpage
report = report
bill = bill
case = legal case
hearing = hearing
patent = patent
statute = statute
email = email
map = map
blogPost = blog post
instantMessage = instant message
forumPost = forum post
audioRecording = audio recording
presentation = presentation
videoRecording = video recording
tvBroadcast = TV broadcast
radioBroadcast = radio broadcast
podcast = podcast
computerProgram = software
conferencePaper = conference paper
document = document
encyclopediaArticle = encyclopedia article
dictionaryEntry = dictionary entry
preprint = preprint
```

</details>

## TODO

- [x] Add `References` to the sidebar in the main view, not only in the reader view
- [x] Support importing all references or importing multiple references at once
- [x] Add support for Chinese references, including a CNKI-based retrieval path
- [ ] Adjust reference extraction strategies for specific journals
- [ ] Use different icons for references based on Zotero item type

## Notes

1. The automatic linking feature is not compatible with the `scihub` plugin.

## Acknowledgements

This plugin is based on:

- [zotero-addon-template](https://github.com/windingwind/zotero-addon-template)

Parts of the plugin are based on:

- [jasminum](https://github.com/l0o0/jasminum)
- [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate)

Code references:

- [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate)
- [chartero](https://github.com/volatile-static/Chartero)

APIs:

- [unpaywall](https://api.unpaywall.org/)
- [crossref](https://github.com/CrossRef/rest-api-doc)
- [readpaper](https://readpaper.com/)
- [readcube](https://www.readcube.com/)

## Sponsors

<img src="https://user-images.githubusercontent.com/51939531/227145474-ca165a93-fcf2-4b47-baf4-ea6b29f43d99.png" width="50%" height="50%">

Thanks to [@leichaoL](https://github.com/leichaoL), [@JOJOdioJosita](https://github.com/JOJOdioJosita), @Xiao Chen, [@YangChunyu1999](https://github.com/YangChunyu1999), [this B23 supporter](https://b23.tv/JjHR5ON), and other anonymous sponsors for their support and kind messages.
