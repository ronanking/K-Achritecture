/* Fill the tokenised Unitywater template in the browser and hand back a .docx.
 *
 * A .docx is a zip of XML. Nothing here needs a library: the platform already
 * ships raw DEFLATE through CompressionStream, so the whole thing is a zip
 * reader, a zip writer, and some careful string work on WordprocessingML.
 *
 * Deliberately a plain script rather than a module, so the app still runs when
 * the folder is opened straight off a file:// path with no server.
 */
(function (global) {
  "use strict";

  var EMU_PER_INCH = 914400;

  // Appendix 1 cells are 5097 twips wide with 108 twips of margin either side.
  var PHOTO_MAX_W = Math.round(3.3 * EMU_PER_INCH);
  var PHOTO_MAX_H = Math.round(4.2 * EMU_PER_INCH);
  // A GIS or SCADA screenshot gets the full text column.
  var FIGURE_MAX_W = Math.round(6.2 * EMU_PER_INCH);
  var FIGURE_MAX_H = Math.round(7.2 * EMU_PER_INCH);

  // ---------------------------------------------------------------- zip ----

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  async function throughStream(bytes, stream) {
    var response = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await response.arrayBuffer());
  }

  function inflateRaw(bytes) {
    return throughStream(bytes, new DecompressionStream("deflate-raw"));
  }

  function deflateRaw(bytes) {
    return throughStream(bytes, new CompressionStream("deflate-raw"));
  }

  /* Read a zip into named entries, keeping each one's compressed bytes so
   * parts we do not touch can be copied through without a recompress. */
  function readZip(buffer) {
    var bytes = new Uint8Array(buffer);
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var end = -1;
    for (var back = 22; back <= Math.min(bytes.length, 0xffff + 22); back++) {
      if (view.getUint32(bytes.length - back, true) === 0x06054b50) {
        end = bytes.length - back;
        break;
      }
    }
    if (end < 0) throw new Error("Not a zip file (no end-of-central-directory record).");

    var count = view.getUint16(end + 10, true);
    var pointer = view.getUint32(end + 16, true);
    var order = [];
    var entries = Object.create(null);

    for (var i = 0; i < count; i++) {
      if (view.getUint32(pointer, true) !== 0x02014b50) throw new Error("Corrupt zip directory.");
      var nameLength = view.getUint16(pointer + 28, true);
      var extraLength = view.getUint16(pointer + 30, true);
      var commentLength = view.getUint16(pointer + 32, true);
      var localOffset = view.getUint32(pointer + 42, true);
      var name = new TextDecoder().decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength));

      // The local header repeats the name and may carry a different extra
      // field, so the data offset has to come from the local header itself.
      var localNameLength = view.getUint16(localOffset + 26, true);
      var localExtraLength = view.getUint16(localOffset + 28, true);
      var dataStart = localOffset + 30 + localNameLength + localExtraLength;
      var compressedSize = view.getUint32(pointer + 20, true);

      entries[name] = {
        name: name,
        method: view.getUint16(pointer + 10, true),
        crc: view.getUint32(pointer + 16, true),
        compressedSize: compressedSize,
        size: view.getUint32(pointer + 24, true),
        compressed: bytes.subarray(dataStart, dataStart + compressedSize),
      };
      order.push(name);
      pointer += 46 + nameLength + extraLength + commentLength;
    }
    return { entries: entries, order: order };
  }

  async function readText(entry) {
    var raw = entry.method === 0 ? entry.compressed : await inflateRaw(entry.compressed);
    return new TextDecoder().decode(raw);
  }

  /* Build a zip. `parts` is an ordered list of either a passthrough entry from
   * readZip, or {name, bytes, store} for something we produced. */
  async function writeZip(parts) {
    var encoder = new TextEncoder();
    var chunks = [];
    var directory = [];
    var offset = 0;

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      var name = encoder.encode(part.name);
      var method, crc, compressed, size;

      if (part.passthrough) {
        method = part.passthrough.method;
        crc = part.passthrough.crc;
        size = part.passthrough.size;
        compressed = part.passthrough.compressed;
      } else {
        var raw = part.bytes;
        crc = crc32(raw);
        size = raw.length;
        // JPEG and PNG are already compressed; deflating them again costs
        // seconds on a phone and saves nothing.
        method = part.store ? 0 : 8;
        compressed = method === 0 ? raw : await deflateRaw(raw);
      }

      var header = new Uint8Array(30 + name.length);
      var headerView = new DataView(header.buffer);
      headerView.setUint32(0, 0x04034b50, true);
      headerView.setUint16(4, 20, true);
      headerView.setUint16(6, 0, true);
      headerView.setUint16(8, method, true);
      headerView.setUint16(10, 0, true); // time and date are fixed, so that the
      headerView.setUint16(12, 0x5021, true); // same input always builds byte-identically
      headerView.setUint32(14, crc, true);
      headerView.setUint32(18, compressed.length, true);
      headerView.setUint32(22, size, true);
      headerView.setUint16(26, name.length, true);
      headerView.setUint16(28, 0, true);
      header.set(name, 30);

      chunks.push(header, compressed);
      directory.push({
        name: name,
        method: method,
        crc: crc,
        compressedSize: compressed.length,
        size: size,
        offset: offset,
      });
      offset += header.length + compressed.length;
    }

    var directoryStart = offset;
    for (var d = 0; d < directory.length; d++) {
      var record = directory[d];
      var central = new Uint8Array(46 + record.name.length);
      var centralView = new DataView(central.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0, true);
      centralView.setUint16(10, record.method, true);
      centralView.setUint16(12, 0, true);
      centralView.setUint16(14, 0x5021, true);
      centralView.setUint32(16, record.crc, true);
      centralView.setUint32(20, record.compressedSize, true);
      centralView.setUint32(24, record.size, true);
      centralView.setUint16(28, record.name.length, true);
      centralView.setUint32(42, record.offset, true);
      central.set(record.name, 46);
      chunks.push(central);
      offset += central.length;
    }

    var tail = new Uint8Array(22);
    var tailView = new DataView(tail.buffer);
    tailView.setUint32(0, 0x06054b50, true);
    tailView.setUint16(8, directory.length, true);
    tailView.setUint16(10, directory.length, true);
    tailView.setUint32(12, offset - directoryStart, true);
    tailView.setUint32(16, directoryStart, true);
    chunks.push(tail);

    return new Blob(chunks, {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  }

  // ---------------------------------------------------------------- xml ----

  function esc(value) {
    return String(value == null ? "" : value)
      // Control characters other than tab, newline and carriage return are
      // illegal in XML 1.0, and Word refuses to open a document holding one.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function lines(value) {
    return String(value == null ? "" : value).split(/\r\n|\r|\n/);
  }

  /* Text destined for a w:t, with newlines becoming real line breaks. The run
   * stays open across the break, so this is safe to splice into a token's
   * position inside an existing w:t. */
  function inlineText(value) {
    return lines(value)
      .map(esc)
      .join('</w:t><w:br/><w:t xml:space="preserve">');
  }

  function paragraph(style, inner, justify) {
    return (
      "<w:p><w:pPr><w:pStyle w:val=\"" + style + '"/>' +
      (justify ? '<w:jc w:val="' + justify + '"/>' : "") +
      "</w:pPr>" + (inner || "") + "</w:p>"
    );
  }

  function textParagraph(style, value, justify) {
    if (!String(value || "").trim()) return paragraph(style, "", justify);
    return paragraph(
      style,
      '<w:r><w:t xml:space="preserve">' + inlineText(value) + "</w:t></w:r>",
      justify
    );
  }

  /* Swap out the whole w:p that a block token sits in.
   *
   * Block tokens are written by tools/sps-template/build.py into bare
   * paragraphs of their own, so the nearest preceding paragraph start is
   * always the one that owns the token. `<w:pPr`/`<w:pStyle` do not match
   * `<w:p ` or `<w:p>`, so scanning backwards for those two is unambiguous.
   */
  function replaceParagraphAt(xml, token, replacement) {
    var at = xml.indexOf(token);
    if (at < 0) return xml;
    var start = Math.max(xml.lastIndexOf("<w:p ", at), xml.lastIndexOf("<w:p>", at));
    var end = xml.indexOf("</w:p>", at);
    if (start < 0 || end < 0) return xml;
    return xml.slice(0, start) + replacement + xml.slice(end + 6);
  }

  function replaceAllParagraphs(xml, token, replacement) {
    while (xml.indexOf(token) >= 0) {
      var next = replaceParagraphAt(xml, token, replacement);
      if (next === xml) break;
      xml = next;
    }
    return xml;
  }

  // --------------------------------------------------- repeated table rows ----

  /* Find the w:tr a token sits in. Table rows do not nest in this document,
   * so the nearest preceding row start owns the token. */
  function enclosingRow(xml, token) {
    var at = xml.indexOf(token);
    if (at < 0) return null;
    var start = Math.max(xml.lastIndexOf("<w:tr ", at), xml.lastIndexOf("<w:tr>", at));
    var end = xml.indexOf("</w:tr>", at);
    if (start < 0 || end < 0) return null;
    return { start: start, end: end + "</w:tr>".length };
  }

  /* Duplicate a row once per extra instance.
   *
   * A station can have two sluice valves, or three wells worth of opening
   * measurements, against one row in the template. Each extra instance gets a
   * copy of the row directly beneath the original, with its tokens re-pointed
   * at that instance's values and its label suffixed — `Pumps (2)`.
   *
   * Runs before any substitution, so the clones are still full of tokens and
   * the ordinary passes fill them in.
   */
  function expandRepeats(xml, instances) {
    Object.keys(instances || {}).forEach(function (base) {
      var list = instances[base] || [];
      if (list.length < 2) return;

      var marker = "{{n:" + base + "}}";
      var row = enclosingRow(xml, marker);
      if (!row) return;
      var original = xml.slice(row.start, row.end);

      var clones = list
        .slice(1)
        .map(function (instance) {
          return original
            .replace(/\{\{(f|shd):([a-z0-9_]+)\}\}/g, function (whole, kind, id) {
              // `cond_pumps_rating` under instance `cond_pumps__2` becomes
              // `cond_pumps__2_rating`; anything else in the row is left be.
              return id.indexOf(base) === 0
                ? "{{" + kind + ":" + instance.key + id.slice(base.length) + "}}"
                : whole;
            })
            .split(marker)
            .join(" (" + esc(instance.label || "") + ")");
        })
        .join("");

      xml = xml.slice(0, row.end) + clones + xml.slice(row.end);
    });

    // The original row of every group — repeated or not — keeps its own label.
    return xml.replace(/\{\{n:[a-z0-9_]+\}\}/g, "");
  }

  // ------------------------------------------------------------- images ----

  function fit(photo, maxWidth, maxHeight) {
    var width = maxWidth;
    var height = Math.round((maxWidth * photo.height) / photo.width);
    if (height > maxHeight) {
      height = maxHeight;
      width = Math.round((maxHeight * photo.width) / photo.height);
    }
    return { cx: width, cy: height };
  }

  function drawing(relationshipId, docPrId, name, cx, cy) {
    return (
      '<w:r><w:rPr><w:noProof/></w:rPr><w:drawing>' +
      '<wp:inline distT="0" distB="0" distL="0" distR="0">' +
      '<wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
      '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
      '<wp:docPr id="' + docPrId + '" name="' + esc(name) + '"/>' +
      "<wp:cNvGraphicFramePr>" +
      '<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>' +
      "</wp:cNvGraphicFramePr>" +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
      '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:nvPicPr><pic:cNvPr id="' + docPrId + '" name="' + esc(name) + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + relationshipId + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
      "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>"
    );
  }

  // ----------------------------------------------------- appendix tables ----

  function photoCell(photo, index) {
    var size = fit(photo, PHOTO_MAX_W, PHOTO_MAX_H);
    var body =
      paragraph(
        "ParaNormal",
        drawing(photo.relationshipId, 9000 + index, photo.fileName, size.cx, size.cy),
        "center"
      ) +
      (photo.note && photo.note.trim()
        ? textParagraph("Caption", photo.note.trim(), "center")
        : "");
    return (
      '<w:tc><w:tcPr><w:tcW w:w="5097" w:type="dxa"/>' +
      '<w:shd w:val="clear" w:color="auto" w:fill="auto"/></w:tcPr>' + body + "</w:tc>"
    );
  }

  function emptyCell() {
    return (
      '<w:tc><w:tcPr><w:tcW w:w="5097" w:type="dxa"/>' +
      '<w:shd w:val="clear" w:color="auto" w:fill="auto"/></w:tcPr>' +
      paragraph("ParaNormal", "") + "</w:tc>"
    );
  }

  /* One Appendix 1 table per group: a spanning caption row, then the photos
   * two across, matching how the blank template lays the section out. */
  function photoTable(heading, photos, startIndex) {
    var rows =
      '<w:tr><w:trPr><w:cnfStyle w:val="100000000000" w:firstRow="1" w:lastRow="0"' +
      ' w:firstColumn="0" w:lastColumn="0" w:oddVBand="0" w:evenVBand="0" w:oddHBand="0"' +
      ' w:evenHBand="0" w:firstRowFirstColumn="0" w:firstRowLastColumn="0"' +
      ' w:lastRowFirstColumn="0" w:lastRowLastColumn="0"/></w:trPr>' +
      '<w:tc><w:tcPr><w:tcW w:w="0" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>' +
      textParagraph("ParaNormal", heading, "center") +
      "</w:tc></w:tr>";

    for (var i = 0; i < photos.length; i += 2) {
      rows +=
        "<w:tr>" +
        photoCell(photos[i], startIndex + i) +
        (photos[i + 1] ? photoCell(photos[i + 1], startIndex + i + 1) : emptyCell()) +
        "</w:tr>";
    }

    return (
      "<w:tbl><w:tblPr>" +
      '<w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/>' +
      '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1"' +
      ' w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>' +
      "</w:tblPr>" +
      '<w:tblGrid><w:gridCol w:w="5097"/><w:gridCol w:w="5097"/></w:tblGrid>' +
      rows +
      "</w:tbl>" +
      paragraph("ParaNormal", "")
    );
  }

  /* The register of everything Appendix 1 does not show.
   *
   * Only what was photographed gets a plate, so this is the other half of the
   * record: what was inspected but not photographed, and how it rated. A gap
   * in the evidence is worth stating rather than leaving to be noticed. */
  function missingTable(rows) {
    if (!rows.length) return "";

    var body = rows
      .map(function (row) {
        return (
          "<w:tr>" +
          '<w:tc><w:tcPr><w:tcW w:w="6795" w:type="dxa"/></w:tcPr>' +
          textParagraph("ParaNormal", row.label) +
          "</w:tc>" +
          '<w:tc><w:tcPr><w:tcW w:w="3399" w:type="dxa"/></w:tcPr>' +
          textParagraph("ParaNormal", row.condition) +
          "</w:tc></w:tr>"
        );
      })
      .join("");

    return (
      textParagraph("Caption", "Table 8: Assets inspected but not photographed") +
      "<w:tbl><w:tblPr>" +
      '<w:tblStyle w:val="UnitywaterTable2"/><w:tblW w:w="0" w:type="auto"/>' +
      '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1"' +
      ' w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>' +
      "</w:tblPr>" +
      '<w:tblGrid><w:gridCol w:w="6795"/><w:gridCol w:w="3399"/></w:tblGrid>' +
      '<w:tr><w:trPr><w:cnfStyle w:val="100000000000" w:firstRow="1" w:lastRow="0"' +
      ' w:firstColumn="0" w:lastColumn="0" w:oddVBand="0" w:evenVBand="0" w:oddHBand="0"' +
      ' w:evenHBand="0" w:firstRowFirstColumn="0" w:firstRowLastColumn="0"' +
      ' w:lastRowFirstColumn="0" w:lastRowLastColumn="0"/></w:trPr>' +
      '<w:tc><w:tcPr><w:tcW w:w="6795" w:type="dxa"/></w:tcPr>' +
      textParagraph("ParaNormal", "Asset") +
      "</w:tc>" +
      '<w:tc><w:tcPr><w:tcW w:w="3399" w:type="dxa"/></w:tcPr>' +
      textParagraph("ParaNormal", "Condition") +
      "</w:tc></w:tr>" +
      body +
      "</w:tbl>" +
      paragraph("ParaNormal", "")
    );
  }

  /* Everything that could have carried a photograph and did not. */
  function unphotographed(index, values, photosByGroup, instances) {
    var rows = [];

    (index.extraPhotos || []).forEach(function (group) {
      if (!photosByGroup[group.id]) rows.push({ label: group.label, condition: "—" });
    });

    var na = (index.notApplicable && index.notApplicable.value) || "N/A";
    index.conditionAssets.forEach(function (asset) {
      var list = (instances && instances[asset.id]) || [{ key: asset.id, label: "" }];
      list.forEach(function (instance) {
        if (photosByGroup[instance.key]) return;
        var rating = values[instance.key + "_rating"];
        // Something that is not at this station is not a missing photograph.
        if (rating === na) return;
        rows.push({
          label: asset.label + (instance.label ? " (" + instance.label + ")" : ""),
          condition: rating ? rating : "Not rated",
        });
      });
    });

    return rows;
  }

  // ------------------------------------------------------------ the fill ----

  function schemaIndex(schema) {
    var byId = Object.create(null);
    var conditionAssets = [];
    var extraPhotos = [];
    schema.sections.forEach(function (section) {
      (section.fields || []).forEach(function (field) {
        byId[field.id] = field;
      });
      if (section.kind === "condition") {
        conditionAssets = section.assets || [];
        extraPhotos = section.extraPhotos || [];
      }
    });
    return {
      byId: byId,
      conditionAssets: conditionAssets,
      extraPhotos: extraPhotos,
      notApplicable: schema.notApplicable,
    };
  }

  /* Which groups appear in Appendix 1 and in what order: the template's own
   * standing shots first, then every rated asset that was photographed. */
  function appendixGroups(index, values, photosByGroup, instances) {
    var groups = [];
    index.extraPhotos.forEach(function (group) {
      if (photosByGroup[group.id]) groups.push({ heading: group.label, photos: photosByGroup[group.id] });
    });
    index.conditionAssets.forEach(function (asset) {
      var list = (instances && instances[asset.id]) || [{ key: asset.id, label: "" }];
      list.forEach(function (instance) {
        var photos = photosByGroup[instance.key];
        if (!photos) return;
        var label = asset.label + (instance.label ? " (" + instance.label + ")" : "");
        var rating = values[instance.key + "_rating"];
        groups.push({
          heading: rating ? label + " — condition " + rating : label,
          photos: photos,
        });
      });
    });
    return groups;
  }

  function ratingFill(schema, value) {
    var choices = (schema.ratings || []).concat(
      schema.notApplicable ? [schema.notApplicable] : []
    );
    var match = choices.filter(function (r) {
      return r.value === String(value);
    })[0];
    return match ? match.fill : "auto";
  }

  /* Substitute every {{f:...}} in a WordprocessingML part. */
  function fillRunTokens(xml, values) {
    return xml.replace(/\{\{f:([a-z0-9_]+)\}\}/g, function (_, id) {
      return inlineText(values[id] || "");
    });
  }

  /* Same, but for parts that are not WordprocessingML (docProps/core.xml),
   * where splicing a w:br would produce nonsense. */
  function fillPlainTokens(xml, values) {
    return xml.replace(/\{\{f:([a-z0-9_]+)\}\}/g, function (_, id) {
      return esc(lines(values[id] || "").join(" ").trim());
    });
  }

  /**
   * Fill the template and return the finished report.
   *
   * @param {ArrayBuffer} options.template  the tokenised template.docx
   * @param {object}      options.schema    window.SPS_SCHEMA
   * @param {object}      options.values    field id -> string (ratings live
   *                                        here too, as `<asset>_rating`)
   * @param {Array}       options.photos    {group, bytes, width, height, note}
   *                                        in the order they should appear
   * @returns {Promise<{blob: Blob, fileName: string}>}
   */
  async function generate(options) {
    var schema = options.schema;
    var values = options.values || {};
    var photos = (options.photos || []).slice();
    var index = schemaIndex(schema);

    var archive = readZip(options.template);
    var documentXml = await readText(archive.entries["word/document.xml"]);
    var relsXml = await readText(archive.entries["word/_rels/document.xml.rels"]);
    var typesXml = await readText(archive.entries["[Content_Types].xml"]);
    var headerXml = await readText(archive.entries["word/header1.xml"]);
    var coreXml = await readText(archive.entries["docProps/core.xml"]);

    // --- media: one relationship and one part per photo --------------------
    var media = [];
    photos.forEach(function (photo, i) {
      var extension = photo.type === "image/png" ? "png" : "jpeg";
      photo.fileName = "spsphoto" + (i + 1) + "." + extension;
      photo.relationshipId = "rIdSps" + (i + 1);
      photo.part = "word/media/" + photo.fileName;
      media.push(photo);
    });

    if (media.length && typesXml.indexOf('Extension="jpeg"') < 0) {
      typesXml = typesXml.replace(
        "</Types>",
        '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>'
      );
    }
    if (media.length) {
      relsXml = relsXml.replace(
        "</Relationships>",
        media
          .map(function (photo) {
            return (
              '<Relationship Id="' + photo.relationshipId +
              '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"' +
              ' Target="media/' + photo.fileName + '"/>'
            );
          })
          .join("") + "</Relationships>"
      );
    }

    var photosByGroup = Object.create(null);
    media.forEach(function (photo) {
      (photosByGroup[photo.group] = photosByGroup[photo.group] || []).push(photo);
    });

    // --- repeated rows, before anything is substituted into them -----------
    documentXml = expandRepeats(documentXml, options.instances);

    // --- block tokens ------------------------------------------------------
    var groups = appendixGroups(index, values, photosByGroup, options.instances);
    var docPrCounter = 0;
    var appendix = groups
      .map(function (group) {
        var table = photoTable(group.heading, group.photos, docPrCounter);
        docPrCounter += group.photos.length;
        return table;
      })
      .join("");
    var register = missingTable(
      unphotographed(index, values, photosByGroup, options.instances)
    );
    documentXml = replaceParagraphAt(
      documentXml,
      "{{photos}}",
      (appendix || textParagraph("ParaNormal", "No site photographs were captured.")) + register
    );

    Object.keys(index.byId).forEach(function (id) {
      var field = index.byId[id];
      if (field.type !== "image") return;
      var photo = (photosByGroup[id] || [])[0];
      var replacement;
      if (photo) {
        var size = fit(photo, FIGURE_MAX_W, FIGURE_MAX_H);
        docPrCounter += 1;
        replacement = paragraph(
          "ParaNormal",
          drawing(photo.relationshipId, 9000 + docPrCounter, photo.fileName, size.cx, size.cy),
          "center"
        );
        if (photo.note && photo.note.trim()) {
          replacement += textParagraph("Caption", photo.note.trim(), "center");
        }
      } else {
        // Nothing captured — leave the template's own prompt in place so the
        // gap is obvious rather than silently missing.
        replacement = textParagraph("ParaNormal", field.fallback || "", "center");
      }
      documentXml = replaceParagraphAt(documentXml, "{{img:" + id + "}}", replacement);
    });

    // {{para:…}} and {{list:…}} each own their whole paragraph, so they are
    // resolved one at a time rather than with a global regex replace.
    var blockPattern = /\{\{(para|list):([a-z0-9_]+)\}\}/;
    var guard = 0;
    while (blockPattern.test(documentXml) && guard++ < 200) {
      var match = documentXml.match(blockPattern);
      var kind = match[1];
      var id = match[2];
      var value = String(values[id] || "").trim();
      var body = "";
      if (value) {
        body = lines(value)
          .filter(function (line) {
            return line.trim();
          })
          .map(function (line) {
            return kind === "list"
              ? textParagraph("ListBullet", line.trim())
              : textParagraph("ParaNormal", line.trim(), "both");
          })
          .join("");
      }
      documentXml = replaceAllParagraphs(documentXml, match[0], body);
    }

    // --- cell shading and inline text -------------------------------------
    documentXml = documentXml.replace(/\{\{shd:([a-z0-9_]+)\}\}/g, function (_, id) {
      return ratingFill(schema, values[id]);
    });
    documentXml = fillRunTokens(documentXml, values);
    headerXml = fillRunTokens(headerXml, values);
    coreXml = fillPlainTokens(coreXml, values);

    // --- reassemble --------------------------------------------------------
    var encoder = new TextEncoder();
    var rewritten = {
      "word/document.xml": documentXml,
      "word/header1.xml": headerXml,
      "word/_rels/document.xml.rels": relsXml,
      "[Content_Types].xml": typesXml,
      "docProps/core.xml": coreXml,
    };

    var parts = archive.order.map(function (name) {
      if (rewritten[name] !== undefined) {
        return { name: name, bytes: encoder.encode(rewritten[name]) };
      }
      return { name: name, passthrough: archive.entries[name] };
    });
    media.forEach(function (photo) {
      parts.push({ name: photo.part, bytes: photo.bytes, store: true });
    });

    var station = String(values.sps_id || "SPS").trim().replace(/[^\w.-]+/g, "-");
    return {
      blob: await writeZip(parts),
      fileName: station + " Condition Assessment Report.docx",
    };
  }

  global.SPSDocx = { generate: generate, readZip: readZip, readText: readText };
})(typeof window !== "undefined" ? window : globalThis);
