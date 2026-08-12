#!/usr/bin/env python3
"""Turn the Unitywater SPS condition assessment template into a fillable one.

The Word template that gets handed around is written for a person: guidance
prose where the answer goes, `SPS-XXXXXX` wherever the station number belongs,
empty table cells waiting for a pen. This script rewrites it into the same
document with machine-fillable tokens in those places, and emits the schema
that describes them so the field app and the template can never drift apart.

Two outputs, both committed:

    public/sps/template.docx   the tokenised template the browser fills in
    public/sps/schema.js       every field, asset and photo group, in order

Token vocabulary (all substituted client side by public/sps/docx.js):

    {{f:ID}}       inline text, replaced in place inside its run
    {{shd:ID}}     a cell fill colour (six hex digits, or `auto`)
    {{para:ID}}    whole paragraph, replaced by zero or more paragraphs
    {{list:ID}}    whole paragraph, replaced by a bulleted list
    {{img:ID}}     whole paragraph, replaced by a centred inline image
    {{photos}}     whole paragraph, replaced by the Appendix 1 photo tables

Run with no arguments from anywhere:  python3 tools/sps-template/build.py
"""

from __future__ import annotations

import copy
import json
import re
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent / "source" / "SPS_Condition_Assessment_Template.docx"
OUT_DIR = ROOT / "public" / "sps"
OUT_DOCX = OUT_DIR / "template.docx"
OUT_SCHEMA = OUT_DIR / "schema.js"

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"

# Every prefix the template declares, so ElementTree round-trips the document
# with the prefixes `mc:Ignorable` names rather than inventing ns0, ns1, ...
NAMESPACES = {
    "wpc": "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
    "cx": "http://schemas.microsoft.com/office/drawing/2014/chartex",
    "mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
    "o": "urn:schemas-microsoft-com:office:office",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
    "v": "urn:schemas-microsoft-com:vml",
    "wp14": "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "w10": "urn:schemas-microsoft-com:office:word",
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "w14": "http://schemas.microsoft.com/office/word/2010/wordml",
    "w15": "http://schemas.microsoft.com/office/word/2012/wordml",
    "w16cex": "http://schemas.microsoft.com/office/word/2018/wordml/cex",
    "w16cid": "http://schemas.microsoft.com/office/word/2016/wordml/cid",
    "w16": "http://schemas.microsoft.com/office/word/2018/wordml",
    "w16sdtdh": "http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash",
    "w16se": "http://schemas.microsoft.com/office/word/2015/wordml/symex",
    "wpg": "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
    "wpi": "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
    "wne": "http://schemas.microsoft.com/office/word/2006/wordml",
    "wps": "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
}


# ---------------------------------------------------------------------------
# small helpers over the WordprocessingML tree
# ---------------------------------------------------------------------------


def text_of(node) -> str:
    """Flatten every w:t under a node, the way Word would read it aloud."""
    out = []
    for n in node.iter():
        if n.tag == W + "t":
            out.append(n.text or "")
        elif n.tag == W + "tab":
            out.append("\t")
    return "".join(out)


def slug(label: str, taken: set[str] | None = None, prefix: str = "") -> str:
    """A stable id from a human label: `Riser Pipework / Bends` -> `riser_pipework_bends`."""
    norm = unicodedata.normalize("NFKD", label)
    norm = "".join(c for c in norm if not unicodedata.combining(c))
    norm = re.sub(r"\(.*?\)", " ", norm)  # parenthetical asides are noise in an id
    norm = re.sub(r"[^a-zA-Z0-9]+", "_", norm).strip("_").lower()
    norm = re.sub(r"_+", "_", norm)
    words = [w for w in norm.split("_") if w][:6]
    base = (prefix + "_" if prefix else "") + "_".join(words)
    if taken is None:
        return base
    candidate, n = base, 2
    while candidate in taken:
        candidate = f"{base}_{n}"
        n += 1
    taken.add(candidate)
    return candidate


def cells(row):
    return row.findall(W + "tc")


def rows(tbl):
    return tbl.findall(W + "tr")


def first_run_props(p):
    """The rPr of the first run in a paragraph, so a token keeps the cell's look."""
    for r in p.findall(W + "r"):
        rpr = r.find(W + "rPr")
        if rpr is not None:
            return rpr
    return None


def set_paragraph_text(p, text: str, keep_rpr=None):
    """Replace everything a paragraph says with one run, keeping its pPr."""
    rpr = keep_rpr if keep_rpr is not None else first_run_props(p)
    for child in list(p):
        if child.tag != W + "pPr":
            p.remove(child)
    run = ET.SubElement(p, W + "r")
    if rpr is not None:
        run.append(rpr)
    t = ET.SubElement(run, W + "t")
    t.set(XML_SPACE, "preserve")
    t.text = text
    return p


def tokenise_cell(tc, token: str, prefix_text: str = "") -> None:
    """Collapse a table cell down to a single paragraph holding one token."""
    paragraphs = tc.findall(W + "p")
    keep = paragraphs[0]
    for extra in paragraphs[1:]:
        tc.remove(extra)
    set_paragraph_text(keep, prefix_text + token)


def cell_shading_token(tc, token: str) -> None:
    """Add a w:shd whose fill the browser rewrites, in schema-legal position.

    CT_TcPr is a sequence: cnfStyle, tcW, gridSpan, hMerge, vMerge, tcBorders,
    shd, ... Everything the template puts in these cells sorts before shd, so
    appending is correct — but assert it rather than trust it.
    """
    tcpr = tc.find(W + "tcPr")
    if tcpr is None:
        tcpr = ET.Element(W + "tcPr")
        tc.insert(0, tcpr)
    allowed_before = {W + n for n in ("cnfStyle", "tcW", "gridSpan", "hMerge", "vMerge", "tcBorders")}
    for child in tcpr:
        assert child.tag in allowed_before, f"unexpected {child.tag} before w:shd"
    shd = ET.SubElement(tcpr, W + "shd")
    shd.set(W + "val", "clear")
    shd.set(W + "color", "auto")
    shd.set(W + "fill", token)


def merge_root_tags(original: str, generated: str) -> str:
    """Keep the template's root tag, plus any namespace ElementTree hoisted onto it.

    `mc:Ignorable` names prefixes, so every declaration in the original has to
    survive even where nothing in the tree uses it. ElementTree, meanwhile,
    lifts namespaces that were declared deeper down (`a:`, `pic:` on the
    drawings) up to the root. Losing either half leaves an unbound prefix.
    """
    declared = dict(re.findall(r'xmlns:([\w.-]+)="([^"]*)"', original))
    additions = [
        f' xmlns:{prefix}="{uri}"'
        for prefix, uri in re.findall(r'xmlns:([\w.-]+)="([^"]*)"', generated)
        if prefix not in declared
    ]
    return original[:-1].rstrip() + "".join(additions) + ">"


def mark_repeatable(tc, base: str) -> None:
    """Tag a row's label so the browser can clone the whole row.

    A station can have two sluice valves, or three wells worth of opening
    measurements, and the template has one row for each. `{{n:base}}` sits
    after the label: empty on the original row, ` (2)` on a copy. Finding the
    token is how docx.js locates the `w:tr` to duplicate.
    """
    paragraph = tc.findall(W + "p")[-1]
    runs = paragraph.findall(W + "r")
    rpr = runs[-1].find(W + "rPr") if runs else None
    run = ET.SubElement(paragraph, W + "r")
    if rpr is not None:
        run.append(copy.deepcopy(rpr))
    t = ET.SubElement(run, W + "t")
    t.set(XML_SPACE, "preserve")
    t.text = "{{n:%s}}" % base


def block_paragraph(style: str, token: str):
    """A bare paragraph carrying a block token, for the browser to swap out."""
    p = ET.Element(W + "p")
    ppr = ET.SubElement(p, W + "pPr")
    ET.SubElement(ppr, W + "pStyle").set(W + "val", style)
    run = ET.SubElement(p, W + "r")
    t = ET.SubElement(run, W + "t")
    t.set(XML_SPACE, "preserve")
    t.text = token
    return p


# ---------------------------------------------------------------------------
# field classification — what kind of control the app should draw
# ---------------------------------------------------------------------------

YES_NO_HINTS = ("do any ", "do ladders", "in place", "suitable for reuse", "rail safe")
MEASUREMENT_HINT = re.compile(r"\b(diameter|depth|length|width|level|mm)\b", re.I)


def classify(label: str, existing: str) -> dict:
    """Pick an input type from the row label and whatever hint text is there."""
    low = label.lower()
    field: dict = {"type": "text"}
    hint = existing.strip()

    if any(h in low for h in YES_NO_HINTS) or low.endswith("?"):
        field["type"] = "text"
        field["choices"] = ["Yes", "No", "N/A"]
    elif MEASUREMENT_HINT.search(label):
        field["type"] = "text"
    else:
        field["type"] = "textarea"

    # Hint text in the template ("XXXX mm", "Maximo - XX/XX/XXXX (ID:XXXXXXX)")
    # is a worked example, not a value. Keep it as placeholder guidance.
    if hint and hint not in {"", "-"}:
        field["placeholder"] = hint
        if "X" in hint and field["type"] == "textarea":
            field["type"] = "text"
    return field


# ---------------------------------------------------------------------------
# the build
# ---------------------------------------------------------------------------


class Builder:
    def __init__(self) -> None:
        for prefix, uri in NAMESPACES.items():
            ET.register_namespace(prefix, uri)
        self.zin = zipfile.ZipFile(SOURCE)
        self.parts: dict[str, bytes] = {n: self.zin.read(n) for n in self.zin.namelist()}
        self.doc_raw = self.parts["word/document.xml"].decode("utf-8")
        self.root_tag = re.match(r"<\?xml[^>]*\?>\s*(<w:document[^>]*>)", self.doc_raw, re.S).group(1)
        self.doc = ET.fromstring(self.doc_raw)
        self.body = self.doc.find(W + "body")
        self.els = list(self.body)
        self.taken: set[str] = set()
        self.sections: list[dict] = []

    # -- locating things -------------------------------------------------

    def table_after(self, caption_starts_with: str):
        """The table that follows a given caption paragraph."""
        for i, el in enumerate(self.els):
            if el.tag == W + "p" and text_of(el).strip().startswith(caption_starts_with):
                for j in range(i + 1, len(self.els)):
                    if self.els[j].tag == W + "tbl":
                        return self.els[j]
        raise LookupError(caption_starts_with)

    def paragraph_with(self, needle: str):
        for el in self.els:
            if el.tag == W + "p" and needle in text_of(el):
                return el
        raise LookupError(needle)

    def replace_block(self, target, replacement) -> None:
        idx = list(self.body).index(target)
        self.body.remove(target)
        self.body.insert(idx, replacement)
        self.els = list(self.body)

    # -- generic table tokeniser ----------------------------------------

    def tokenise_table(
        self,
        tbl,
        *,
        prefix: str,
        value_columns: list[int],
        column_labels: list[str] | None = None,
        skip_rows: int = 1,
        force_type: str | None = None,
        repeatable: bool = False,
    ) -> list[dict]:
        """Put a token in each value cell of a label-per-row table."""
        fields: list[dict] = []
        row_bases: set[str] = set()
        for row in rows(tbl)[skip_rows:]:
            tcs = cells(row)
            label = text_of(tcs[0]).strip()
            if not label:
                continue
            # De-duplicate on the row, not on each cell, so a two-column table
            # gets `pump_make_pump_1` / `pump_make_pump_2` rather than a
            # counter wedged into the second column's id.
            base = slug(label, row_bases, prefix)
            for n, col in enumerate(value_columns):
                if col >= len(tcs):
                    continue
                existing = text_of(tcs[col]).strip()
                fid = base + (f"_{slug(column_labels[n])}" if column_labels else "")
                self.taken.add(fid)
                spec = {"id": fid, "label": label}
                if column_labels:
                    spec["column"] = column_labels[n]
                spec.update(classify(label, existing))
                if force_type:
                    spec["type"] = force_type
                    spec.pop("choices", None)
                if repeatable:
                    spec["repeatable"] = True
                tokenise_cell(tcs[col], "{{f:%s}}" % fid)
                fields.append(spec)
            # A repeated row carries every value cell in it, so the marker goes
            # on the row once, keyed to the row rather than to a single field.
            if repeatable and len(value_columns) == 1:
                mark_repeatable(tcs[0], base)
        return fields

    # -- individual sections --------------------------------------------

    def build_cover(self) -> None:
        """Cover page, site information, approvals and document control."""
        # Cover title and date live in content controls that Word mirrors into
        # both an mc:Choice text box and its VML fallback, so replace the text
        # everywhere it appears rather than at one known spot.
        self.doc_text_replacements = [
            ("<w:t>SPS-XXXXXX Condition Assessment Report</w:t>",
             "<w:t>{{f:sps_id}} Condition Assessment Report</w:t>"),
            ('<w:r w:rsidRPr="001B62EF"><w:t xml:space="preserve">Insert </w:t></w:r>'
             '<w:r w:rsidR="00995D92" w:rsidRPr="001B62EF"><w:t>Date</w:t></w:r>',
             '<w:r w:rsidRPr="001B62EF"><w:t xml:space="preserve">{{f:report_date}}</w:t></w:r>'),
        ]

        info = self.table_after("Site Information")
        tokenise_cell(cells(rows(info)[0])[1], "{{f:sps_id}}")

        approvals = self.table_after("Technical Approval")
        approval_fields = []
        roles_seen: dict[str, int] = {}
        for row in rows(approvals):
            tcs = cells(row)
            role = text_of(tcs[0]).strip().rstrip(":")
            # The template asks for two reviewers, both rows labelled the same.
            roles_seen[role] = roles_seen.get(role, 0) + 1
            display = role if roles_seen[role] == 1 else f"{role} {roles_seen[role]}"
            base = slug(display, self.taken, "sign")
            tokenise_cell(tcs[1], "{{f:%s_name}}" % base)
            tokenise_cell(tcs[2], "{{f:%s_date}}" % base)
            approval_fields += [
                {"id": f"{base}_name", "label": f"{display} — name", "type": "text"},
                {"id": f"{base}_date", "label": f"{display} — date", "type": "date"},
            ]

        control = self.table_after("Document Control")
        control_map = [
            ("doc_number", "Document number", "text", "UW-XXX-XXXX"),
            ("doc_version", "Version", "text", "Rev 0"),
            ("doc_status", "Status", "text", "Draft"),
            ("doc_issued", "Date issued", "date", ""),
        ]
        for row, (fid, label, kind, default) in zip(rows(control), control_map):
            tokenise_cell(cells(row)[1], "{{f:%s}}" % fid)
            self.taken.add(fid)

        # The station's own identity is the one thing needed before anything
        # else, on site or off, so it stands apart from the paperwork.
        self.sections.append({
            "id": "station",
            "title": "Station",
            "hint": "Which pump station this is. Everything else keys off it.",
            "fields": [
                {"id": "sps_id", "label": "SPS number", "type": "text",
                 "placeholder": "SPS-KED345", "required": True,
                 "help": "Used on the cover, the running header, every caption and the file name."},
                {"id": "report_date", "label": "Date of inspection", "type": "date", "required": True},
            ],
        })

        self.sections.append({
            "id": "cover",
            "title": "Document control",
            "hint": "The approvals page and the document control table. Desk work.",
            "fields": [
                *[{"id": fid, "label": label, "type": kind, **({"default": default} if default else {})}
                  for fid, label, kind, default in control_map],
                *approval_fields,
            ],
        })

    def build_overview(self) -> None:
        """Section 2 — the guidance prose becomes six labelled prompts."""
        prompts = [
            ("Provide a short insight into where the station pump to and from",
             "overview_flow", "Where the station pumps to and from"),
            ("Include asset ID", "overview_pipework", "Asset IDs, pipework type and material"),
            ("Include which council catchment", "overview_catchment", "Council catchment and SPS address"),
            ("Provide the EP number", "overview_ep", "EP number from the master plan"),
            ("The detention times for both day and night", "overview_detention",
             "Detention times, day and night"),
            ("Details about any emergency storage", "overview_storage", "Emergency storage"),
        ]
        fields = []
        for needle, fid, label in prompts:
            para = self.paragraph_with(needle)
            original = text_of(para).strip()
            self.replace_block(para, block_paragraph("ParaNormal", "{{para:%s}}" % fid))
            self.taken.add(fid)
            fields.append({"id": fid, "label": label, "type": "textarea", "help": original})

        for needle, fid, label in (
            ("Insert GIS Overview Photo", "img_gis", "GIS overview image"),
            ("Insert SCADA diagram", "img_scada", "SCADA diagram image"),
        ):
            para = self.paragraph_with(needle)
            fallback = text_of(para).strip()
            self.replace_block(para, block_paragraph("ParaNormal", "{{img:%s}}" % fid))
            self.taken.add(fid)
            fields.append({"id": fid, "label": label, "type": "image", "fallback": fallback,
                           "help": "Screenshot from uMap / SCADA. Left out of the report if empty."})

        issues = self.paragraph_with("Give a brief description of the issues")
        issues_help = text_of(issues).strip()
        self.replace_block(issues, block_paragraph("ParaNormal", "{{para:site_issues}}"))
        self.taken.add("site_issues")
        fields.append({"id": "site_issues", "label": "Site specific issues", "type": "textarea",
                       "help": issues_help})

        bypass = self.paragraph_with("includes a permanent bypass point")
        bypass_default = text_of(bypass).strip()
        self.replace_block(bypass, block_paragraph("ParaNormal", "{{para:bypass_text}}"))
        self.taken.add("bypass_text")
        fields.append({
            "id": "bypass_text", "label": "Bypass connection point (section 4.1)",
            "type": "textarea", "default": bypass_default,
            "help": "Pre-filled with the standard wording. Edit the chamber ID or replace it.",
        })

        self.sections.append({
            "id": "overview",
            "title": "Site overview",
            "hint": "Section 2 and the bypass paragraph. Each box becomes its own paragraph.",
            "fields": fields,
        })

    def build_details(self) -> None:
        tbl = self.table_after("Table 1:")
        fields: list[dict] = []
        for row in rows(tbl)[1:]:
            tcs = cells(row)
            label = text_of(tcs[0]).strip()
            if not label:
                continue

            if label.startswith("SPS Name"):
                tokenise_cell(tcs[1], "{{f:sps_id}}")  # already collected on the cover
                continue

            # One row asks two questions in three paragraphs: Daytime / Nighttime.
            paragraphs = tcs[1].findall(W + "p")
            day_night = [p for p in paragraphs if text_of(p).strip().rstrip(": ").lower()
                         in {"daytime", "nighttime"}]
            if len(day_night) == 2:
                for p in day_night:
                    which = text_of(p).strip().rstrip(": ")
                    fid = slug(f"{label} {which}", self.taken, "det")
                    set_paragraph_text(p, f"{which}: " + "{{f:%s}}" % fid)
                    fields.append({"id": fid, "label": f"{label} — {which}", "type": "text"})
                continue

            existing = text_of(tcs[1]).strip()
            fid = slug(label, self.taken, "det")
            tokenise_cell(tcs[1], "{{f:%s}}" % fid)
            mark_repeatable(tcs[0], fid)
            fields.append({
                "id": fid, "label": label, "repeatable": True, **classify(label, existing)
            })

        self.sections.append({
            "id": "details", "title": "SPS details",
            "hint": "Table 1. Placeholders show the format the template expects. "
                    "Two of something? Add another to that row.",
            "fields": fields,
        })

    def build_pumps(self) -> None:
        tbl = self.table_after("Table 2:")
        header = [text_of(c).strip() for c in cells(rows(tbl)[0])]
        pump_names = header[1:]
        fields = self.tokenise_table(
            tbl, prefix="pump", value_columns=[1, 2], column_labels=pump_names, force_type="text"
        )
        self.sections.append({
            "id": "pumps", "title": "Pump specifications",
            "hint": "Table 2. Off the pump nameplate and Maximo.",
            "columns": pump_names, "fields": fields,
        })

    def build_openings(self) -> None:
        tbl = self.table_after("Table 3:")
        fields = self.tokenise_table(
            tbl, prefix="open", value_columns=[1], force_type="text", repeatable=True
        )
        for f in fields:
            f["inputMode"] = "decimal"
        self.sections.append({
            "id": "openings", "title": "Well openings",
            "hint": "Table 3. Clear opening measurements in millimetres. "
                    "More than one well? Add another set to any row.",
            "fields": fields,
        })

    def build_improvements(self) -> None:
        tbl = self.table_after("Table 4:")
        fields = self.tokenise_table(
            tbl, prefix="imp", value_columns=[1], force_type="textarea", repeatable=True
        )
        self.sections.append({
            "id": "improvements", "title": "General improvement works",
            "hint": "Table 4. Leave a row blank and it stays blank in the report.",
            "fields": fields,
        })

    def build_condition(self) -> None:
        """Table 5 — the reason this app exists. Rating, comment and photos."""
        tbl = self.table_after("Table 5:")
        assets = []
        for row in rows(tbl)[1:]:
            tcs = cells(row)
            label = text_of(tcs[0]).strip()
            if not label:
                continue
            base = slug(label, self.taken, "cond")
            tokenise_cell(tcs[1], "{{f:%s_rating}}" % base)
            cell_shading_token(tcs[1], "{{shd:%s_rating}}" % base)
            tokenise_cell(tcs[2], "{{f:%s_comment}}" % base)
            mark_repeatable(tcs[0], base)
            assets.append({"id": base, "label": label, "repeatable": True})

        self.sections.append({
            "id": "condition",
            "title": "Condition assessment",
            "kind": "condition",
            "hint": "Table 5. Rate it, say why, photograph it. Two of something — a second "
                    "sluice valve, a second pump — add another and it gets its own row.",
            "assets": assets,
        })

    def build_photos(self) -> None:
        """Appendix 1 — swap the fixed photo grid for one generated at export.

        Most of the template's standing shots are of something that already has
        a row in the condition table, so they are folded into it: rate the
        driveway and photograph it in the same breath. The two that are of the
        site rather than an asset stay as photo-only entries in the same
        section, so the walk is still one list.
        """
        heading = self.paragraph_with("Appendix 1")
        start = list(self.body).index(heading) + 1
        groups: list[dict] = []
        removed = []
        for el in list(self.body)[start:]:
            if el.tag == W + "p":
                # An empty-looking paragraph can still be carrying the section
                # break that sets up Appendix 2. Sweeping it away costs the
                # document a whole section.
                ppr = el.find(W + "pPr")
                if ppr is not None and ppr.find(W + "sectPr") is not None:
                    break
                if text_of(el).strip().startswith("Appendix 2"):
                    break
                if not text_of(el).strip():
                    removed.append(el)
                    continue
                break
            if el.tag != W + "tbl":
                break
            for tc in cells(rows(el)[0]):
                label = text_of(tc).strip()
                if label:
                    groups.append(label)
            removed.append(el)

        for el in removed:
            self.body.remove(el)
        self.body.insert(start, block_paragraph("ParaNormal", "{{photos}}"))
        self.els = list(self.body)

        condition = [s for s in self.sections if s["id"] == "condition"][0]
        by_label = {asset["label"]: asset for asset in condition["assets"]}

        unmapped = set(groups) - set(PHOTO_GROUP_MERGES)
        assert not unmapped, f"photo group not accounted for in PHOTO_GROUP_MERGES: {unmapped}"

        extras = []
        for label in groups:
            target = PHOTO_GROUP_MERGES[label]
            if target is None:
                extras.append({"id": slug(label, self.taken, "site"), "label": label})
                continue
            assert target in by_label, f"no condition row called {target!r} to merge {label!r} into"
            # The condition row already carries photos; the merge is simply
            # that this standing shot is no longer asked for separately.
            by_label[target].setdefault("alsoKnownAs", []).append(label)

        condition["extraPhotos"] = extras

    def build_works(self) -> None:
        para = self.paragraph_with("List all required works")
        help_text = text_of(para).strip()
        self.replace_block(para, block_paragraph("ParaNormal", "{{list:works_list}}"))
        self.taken.add("works_list")
        self.sections.append({
            "id": "works",
            "title": "Recommended scope of works",
            "hint": "Section 7. One item per line — they come out as a bulleted list.",
            "fields": [{"id": "works_list", "label": "Required works", "type": "lines",
                        "help": help_text}],
        })

    # -- whole-document text passes --------------------------------------

    def finish_document(self) -> str:
        """Serialise, restore the original root tag, then run the text passes."""
        xml = ET.tostring(self.doc, encoding="unicode")
        generated = re.match(r"<w:document[^>]*>", xml).group(0)
        xml = xml.replace(generated, merge_root_tags(self.root_tag, generated), 1)
        xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' + xml

        for needle, replacement in self.doc_text_replacements:
            assert needle in xml, f"cover placeholder moved: {needle[:60]}"
            xml = xml.replace(needle, replacement)

        # Captions and body prose still say SPS-XXXXXX, and table 3's caption
        # has a real station number left in it from whoever wrote the template.
        xml = xml.replace("SPS-KED345", "{{f:sps_id}}")
        xml = xml.replace("SPS-XXXXXX", "{{f:sps_id}}")
        return xml

    def build_header(self) -> bytes:
        raw = self.parts["word/header1.xml"].decode("utf-8")
        return raw.replace("SPS-XXXXXX", "{{f:sps_id}}").encode("utf-8")

    def build_core_props(self) -> bytes:
        """The cover controls are bound to core properties — keep them in step."""
        raw = self.parts["docProps/core.xml"].decode("utf-8")
        raw = raw.replace(
            "<dc:title>SPS-XXXXXX Condition Assessment Report</dc:title>",
            "<dc:title>{{f:sps_id}} Condition Assessment Report</dc:title>",
        )
        raw = raw.replace("<dc:subject>Insert Date</dc:subject>",
                          "<dc:subject>{{f:report_date}}</dc:subject>")
        return raw.encode("utf-8")

    def build_settings(self) -> bytes:
        """Ask Word to refresh the table of contents when the report is opened."""
        raw = self.parts["word/settings.xml"].decode("utf-8")
        if "updateFields" not in raw:
            raw = raw.replace("<w:defaultTabStop", '<w:updateFields w:val="true"/><w:defaultTabStop', 1)
        return raw.encode("utf-8")

    # -- output -----------------------------------------------------------

    def ordered_sections(self) -> list[dict]:
        """Put the sections in the order the work actually happens.

        The build methods run in whatever order suits the document; the app
        wants them in the order a person fills them in, which is everything
        answerable standing at the station first.
        """
        by_id = {section["id"]: section for section in self.sections}
        missing = set(by_id) ^ {sid for sid, _ in SECTION_ORDER}
        assert not missing, f"section not placed in SECTION_ORDER: {missing}"

        ordered = []
        for sid, stage in SECTION_ORDER:
            section = by_id[sid]
            section["stage"] = stage
            ordered.append(section)
        return ordered

    def write(self) -> None:
        self.parts["word/document.xml"] = self.finish_document().encode("utf-8")
        self.parts["word/header1.xml"] = self.build_header()
        self.parts["docProps/core.xml"] = self.build_core_props()
        self.parts["word/settings.xml"] = self.build_settings()

        OUT_DIR.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(OUT_DOCX, "w", zipfile.ZIP_DEFLATED) as zout:
            # [Content_Types].xml must be the first entry in an OPC package.
            order = sorted(self.parts, key=lambda n: (n != "[Content_Types].xml", n))
            for name in order:
                zout.writestr(name, self.parts[name])

        schema = {
            "version": 2,
            "template": "template.docx",
            "ratings": RATINGS,
            "stages": STAGES,
            "sections": self.ordered_sections(),
        }
        body = json.dumps(schema, indent=2, ensure_ascii=False)
        OUT_SCHEMA.write_text(
            "// Generated by tools/sps-template/build.py — do not edit by hand.\n"
            "// Every id here is a {{token}} in template.docx.\n"
            f"window.SPS_SCHEMA = {body};\n",
            encoding="utf-8",
        )


# The order the work happens in, and where each part of it happens.
#
# `field` is everything answerable standing at the station: the three tables
# that get filled in on site, plus the photographs and the station number. It
# comes first, and the app offers it first. Move a section between the two
# lists and both the ordering and the app's grouping follow.
SECTION_ORDER = [
    ("station", "field"),
    ("openings", "field"),
    ("condition", "field"),
    ("improvements", "field"),
    ("details", "office"),
    ("pumps", "office"),
    ("overview", "office"),
    ("works", "office"),
    ("cover", "office"),
]

# Which of the template's standing Appendix 1 shots is a photograph of
# something that already has a row in the condition table. Those are folded
# into that row — rate it and photograph it in one place. `None` means the
# shot is of the site rather than an asset, so it stays a photo on its own.
# Both halves are asserted against the template, so a reissue that renames
# either side fails the build rather than quietly dropping a photo slot.
PHOTO_GROUP_MERGES = {
    "Site Layout": None,
    "Top Slab": None,
    "Switchboard": "Switchboard",
    "Davit Base": "Davit Base",
    "Bypass point": "Bypass",
    "Property Pole": "Property Pole",
    "Wet Well": "Wet Well Wall",
    "Vent Pole": "Vent Pole / Base",
    "Zero MH": "Zero Maintenance Hole",
}

STAGES = [
    {"id": "field", "label": "On site", "hint": "Everything you can answer standing at the station."},
    {"id": "office", "label": "Desk", "hint": "Maximo, uMap, the master plan and the approvals page."},
]

# Condition ratings, lifted from table 6 of the template so the app can show
# the same words on site that the report prints underneath.
RATINGS = [
    {"value": "1", "label": "As New", "life": "85-100%", "fill": "C6EFCE",
     "interpretation": "At or near the start of its service life. No degradation affecting life expectancy.",
     "other": "Excellent, no defects"},
    {"value": "2", "label": "Good", "life": "65-85%", "fill": "E2EFDA",
     "interpretation": "Minor deterioration only. Normal ageing but no meaningful loss of service life.",
     "other": "Good condition, minor problems — e.g. a small amount of paint peeling off"},
    {"value": "3", "label": "Moderate", "life": "35-65%", "fill": "FFEB9C",
     "interpretation": "Mid-life condition. Active deterioration occurring.",
     "other": "Structurally sound but covered in dust/muck/grease, paint peeling off, surface rust"},
    {"value": "4", "label": "Poor", "life": "10-35%", "fill": "FCD5B4",
     "interpretation": "End of life approaching. High probability of failure in the short to medium term.",
     "other": "Structural rust, little paint left"},
    {"value": "5", "label": "Very Poor", "life": "0-10%", "fill": "FFC7CE",
     "interpretation": "At or beyond end of useful life. Failure likely or already occurring.",
     "other": "Structural condition is affecting operation of the asset"},
]


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing source template: {SOURCE}")
    b = Builder()
    b.build_cover()
    b.build_overview()
    b.build_details()
    b.build_pumps()
    b.build_openings()
    b.build_improvements()
    b.build_condition()
    b.build_photos()
    b.build_works()
    b.write()

    field_count = sum(
        len(s.get("fields", [])) + len(s.get("assets", [])) * 2 for s in b.sections
    )
    print(f"wrote {OUT_DOCX.relative_to(ROOT)} ({OUT_DOCX.stat().st_size:,} bytes)")
    print(f"wrote {OUT_SCHEMA.relative_to(ROOT)}")
    print(f"{len(b.sections)} sections, {field_count} fillable values")


if __name__ == "__main__":
    main()
