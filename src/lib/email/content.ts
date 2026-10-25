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

// Normalise uniquement les anciennes signatures et mentions gérées par le pied commun.
export function prepareProspectingBody(body: string) {
  let text = body.replace(/\r\n?/g, "\n");
  text = text.replace(/^Si vous ne souhaitez pas être recontacté[^\n]*[\n]*/gmi, "");
  text = text.replace(/Je suis Étienne, de VisiPro\.\s*/g, "");
  text = text.replace(/(^|\n)Bonne journée[, .!]*[ \t]*(?:\n(?:Étienne(?:[ —-]+VisiPro)?|VisiPro|visiprofessionnel@gmail\.com)[ \t]*(?=\n|$))*/gi, "$1Bonne journée");
  return text.trim();
}
export function renderProspectingEmail(input: EmailBodyInput, options: {identity: string; unsubscribeUrl?: string}) {
  const content = renderEmailBody({...input, body: prepareProspectingBody(input.body)});
  const details = options.identity.replace(/^(?:Étienne\s*[·—-]\s*)?(?:VisiPro\s*[·—-]\s*)+/i, "").trim();
  const identity = "Étienne — VisiPro" + (details ? " · " + details : "");
  const link = options.unsubscribeUrl
    ? '<a href="'+escapeEmailHtml(options.unsubscribeUrl)+'" style="color:#1d4ed8;text-decoration:underline">Ne plus recevoir de sollicitations</a>'
    : '<span style="color:#1d4ed8;text-decoration:underline">Ne plus recevoir de sollicitations</span>';
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827;background:#fff;padding:16px;overflow-wrap:anywhere">'+content.html+'<hr style="border:0;border-top:1px solid #d1d5db;margin:24px 0 16px"/><p>'+escapeEmailHtml(identity)+'</p><p>'+link+'</p><p>Vous pouvez également répondre à ce message pour exercer votre opposition.</p></div>';
  const text = content.text+'\n\n—\n'+identity+'\nPour ne plus recevoir de sollicitations : '+(options.unsubscribeUrl || '[lien personnel ajouté à l’envoi]')+'\nVous pouvez également répondre à ce message pour exercer votre opposition.';
  return {html,text};
}
