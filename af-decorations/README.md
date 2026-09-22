# Air Force Decorations and Ribbons

An eligibility checker and ribbon rack builder for every decoration and ribbon on the Air Force's Personnel Center (AFPC) Decorations and Ribbons page.

Live at **[peterbrown.space/af-decorations](https://peterbrown.space/af-decorations/)**

This is an unofficial tool. It doesn't verify entitlement. A member's DD-214, personnel records, and AFPC are the authority.

---

## Where the information comes from

### The award list

The 91 awards are the ones linked from AFPC's [Decorations and Ribbons](https://www.afpc.af.mil/Career-Management/Decorations-and-Ribbons/) page, with nothing added or dropped.

### Fact sheet text

Each award links to an AFPC fact sheet. AFPC's site blocks automated requests, so the fact sheets were read from [Wayback Machine](https://web.archive.org/) snapshots of those same URLs. Most snapshots are from 2026, and a few date back to 2023 where no newer snapshot existed. The text was collected on Sept. 22, 2026.

Each fact sheet was split into its sections: Background, Criteria, device eligibility, authorized devices, medal and ribbon descriptions, and WAPS points. These sections appear on each award as "Full AFPC fact sheet text". One section was dropped: a sample memorandum on the Nuclear Deterrence Operations Service Medal sheet, which is a template with placeholder names and SSNs.

### Ribbon images

The ribbon images are the ones AFPC uses on the Decorations and Ribbons page, also pulled through the Wayback Machine. As works of the U.S. government they're in the public domain. They were resized from 1920 px to 216 px wide and saved in `ribbons/`, named by AFPC article ID.

### Plain-language criteria (written for this tool)

These parts were written by hand from the fact sheet text. They're summaries, not AFPC wording.

- **Summary line:** a one-sentence description of each award.
- **Award type:**
  - *Decoration:* has to be officially awarded.
  - *Unit award:* your unit received it while you were assigned.
  - *Service award:* earned by meeting the requirements.
- **Checklist:** practical ways to tell whether the award belongs on your record.
  - For decorations, that's whether you received a citation or special order, or whether it was approved but is missing from your record.
  - For service and unit awards, it's the specific qualifying conditions (dates, places, time in area).
  - For all types, checking any one item adds the award to your list.
- **Awarded for:** the heroism or merit standard for each decoration, shown for reference and not as a checkbox.
- **Approval level:** stated only where the fact sheet names it. Examples: SecDef for the DDSM and DSSM, MAJCOM commander for the Air Medal, wing commander for the Aerial Achievement Medal, COMAFFOR for the Combat Action Medal. Everything else points to DAFMAN 36-2806, *Military Awards: Criteria and Procedures*.
- **Devices:** V, C, and R devices are offered only where the fact sheet authorizes them. Oak leaf cluster and service star counters appear only where the fact sheet lists them.
- **Intake filter rules:** date windows and requirements per award, such as "Korea service, 1950 to 1954" or "enlisted". They're used to hide awards that can't apply to someone's service, and they're based on the dates and conditions in each fact sheet.

If something is wrong, use **Report an error** on the award's card or page.

---

## Order of precedence

There are three layers, applied in this order.

### 1. AFPC listing order (the default)

AFPC's page lists awards in order of precedence, and `awards.js` keeps that exact order. It drives:

- the order of awards in the list and on each award page ("Position in the AFPC listing: N of 91", plus the higher and lower precedence links);
- the ribbon rack when awards are added by hand.

AFPC's listing is a good general guide, but it doesn't match official precedence in every case, and nothing corrects for that yet. The authoritative order is in DAFMAN 36-2806. Known mismatches should be fixed by reordering `awards.js` (see [Updating](#updating)).

### 2. The member's own rack (screenshot import)

When a rack is imported from a photo or screenshot, the scanner reads ribbons row by row, top to bottom and left to right as you look at it. That's the order a correctly worn rack follows, highest precedence first. That order is kept for the rack, the list, and **Copy list**. A real rack is usually the most accurate source for the awards the member actually has.

A new import replaces the previous import's order.

### 3. Mixing the two

Awards added by hand alongside an imported rack are slotted in by AFPC order. Each one goes just before the first imported ribbon that AFPC ranks lower. Hand-added awards stay in AFPC order among themselves.

### How the rack is drawn

Ribbons are drawn three to a row. When the count doesn't divide evenly, the leftover ribbons form a shorter top row, centered, holding the highest-precedence ribbons, as worn. Multiple oak leaf clusters are drawn overlapping, the way they're mounted.

### Precedence in the scanner

Because racks are worn in precedence order, the scanner uses a ribbon's neighbors to break near-ties between look-alike ribbons.

- If the two best matches score within about 20% of each other, it prefers the candidate that fits between the nearest confidently identified ribbons before and after it in AFPC order.
- Example: the Air and Space Outstanding Unit Award and the NATO Medal for Kosovo Operations look almost identical to the matcher. On a rack between the Meritorious Unit Award and the Air Force Good Conduct Medal, only the Outstanding Unit Award fits.
- Picks decided this way are marked medium confidence, and the member confirms every match before anything is added.

---

## Files

| File | What it is |
| --- | --- |
| `index.html` | The tool: intake questions, award list, rack, and the import dialog |
| `awards.js` | All award data, in AFPC order. This is the source of truth |
| `rackscan.js` | The ribbon rack scanner. Runs in the browser, so images are never uploaded |
| `ribbons/` | Ribbon images, named by AFPC article ID |
| `<award-name>/index.html` | One static page per award for search engines. Generated, don't edit by hand |
| `award.css` | Styles for the award pages |
| `og.png` | Preview image used when a link is shared |
| `tools/build-pages.js` | Generates the award pages, the award index and structured data in `index.html`, and `/sitemap.xml` |

The one-time scripts that pulled and parsed the fact sheets aren't kept in the repo. `awards.js` is now edited directly.

## Updating

After any change to `awards.js`, run from the repo root:

```
node af-decorations/tools/build-pages.js
```

This regenerates all award pages, the award index and structured data in `index.html`, and `sitemap.xml`. It also removes pages for awards that no longer exist.

To change precedence, move the award's entry within `awards.js` and run the build.

## Privacy

Nothing leaves the browser. Selections, intake answers, and unfinished answers are saved in `localStorage` under the `afdec_v1`, `afdec_answers_v1`, and `afdec_draft_v1` keys. Rack images are processed in memory and never uploaded.
