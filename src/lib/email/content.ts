export type EmailBodyInput = { body: string; mockupUrl?: string | null };
export function escapeEmailHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
function safeWebUrl(value: string): string | null {
  if (/[\x00-\x20\x7f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
// Deliberately limited formatting: plain text, paragraphs and named HTTP(S) links only.
// Never accept raw HTML, images, scripts, styles or tracking pixels from an imported draft.
export function renderEmailBody(input: EmailBodyInput) {
  let source = input.body.replace(/\r\n?/g, "\n");
  const mockup = input.mockupUrl ? safeWebUrl(input.mockupUrl) : null;
  if (mockup && !source.includes(input.mockupUrl!) && !source.includes(mockup))
    source += `\n\n[Découvrir la maquette](${mockup})`;
  const linkPattern = /\[([^\]\n]{1,300})\]\((https?:\/\/[^\s<>\"]{1,2048})\)/g;
  let cursor = 0;
  let html = "";
  let text = "";
  for (const match of source.matchAll(linkPattern)) {
    const before = source.slice(cursor, match.index);
    html += escapeEmailHtml(before);
    text += before;
    const href = safeWebUrl(match[2]);
    if (href) {
      html += `<a href="${escapeEmailHtml(href)}" target="_blank" rel="noopener noreferrer" style="color:#1d4ed8;text-decoration:underline">${escapeEmailHtml(match[1])}</a>`;
      text += `${match[1]} : ${href}`;
    } else {
      html += escapeEmailHtml(match[0]);
      text += match[0];
    }
    cursor = match.index! + match[0].length;
  }
  html += escapeEmailHtml(source.slice(cursor));
  text += source.slice(cursor);
  html = html
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px">${paragraph.replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
  return { html, text };
}
