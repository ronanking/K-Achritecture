/* A dependency-free well-formedness check and element tally for the test.
 *
 * Not a validating parser — it verifies that tags nest and close correctly,
 * that attributes are quoted, and that no raw `&` or `<` slipped into text,
 * which is exactly the class of damage that string-built XML produces.
 */

const TAG = /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
const VOID_PROLOG = /^<\?xml[^>]*\?>\s*/;

export function XMLValidator(xml) {
  const body = xml.replace(VOID_PROLOG, "");
  const stack = [];
  let cursor = 0;
  let match;

  TAG.lastIndex = 0;
  while ((match = TAG.exec(body))) {
    const text = body.slice(cursor, match.index);
    const stray = badText(text);
    if (stray) return `unescaped ${stray} in text before <${match[2]}> at ${match.index}`;
    cursor = TAG.lastIndex;

    const [, closing, name, , selfClosing] = match;
    if (selfClosing) continue;
    if (closing) {
      const open = stack.pop();
      if (open !== name) return `</${name}> closes <${open}> at ${match.index}`;
    } else {
      stack.push(name);
    }
  }

  // Anything left between the last tag and EOF, plus any unclosed elements.
  const trailing = badText(body.slice(cursor));
  if (trailing) return `unescaped ${trailing} after the last tag`;
  if (stack.length) return `unclosed: ${stack.slice(-3).join(" > ")}`;

  // A stray `<` that does not start a legal tag is skipped by the regex, so
  // count them separately.
  const opens = (body.match(/</g) || []).length;
  const tags = (body.match(TAG) || []).length;
  if (opens !== tags) return `${opens - tags} malformed or unescaped '<'`;

  return true;
}

function badText(text) {
  if (/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/.test(text)) return "'&'";
  return null;
}

export function XMLParser(xml) {
  const count = (pattern) => (xml.match(pattern) || []).length;
  return {
    tables: count(/<w:tbl>/g),
    rows: count(/<w:tr[ >]/g),
    paragraphs: count(/<w:p[ >]/g),
    drawings: count(/<w:drawing>/g),
    sections: count(/<w:sectPr[ >]/g),
  };
}
