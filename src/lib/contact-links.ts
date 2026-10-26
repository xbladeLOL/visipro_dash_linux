export function toPhoneHref(phone: string) {
  const compact = phone.trim().replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return compact ? `tel:${compact}` : "";
}

export function toWebsiteHref(website: string) {
  const trimmed = website.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}
