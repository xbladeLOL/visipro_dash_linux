import { describe, expect, it } from "vitest";
import { renderEmailBody } from "@/lib/email/content";
describe("safe rich email content", () => {
  it("renders named links and a plain-text alternative", () => {
    const result = renderEmailBody({
      body: "Bonjour,\n\n[Découvrir la maquette](https://example.test/maquette?a=1&b=2)\nBonne journée",
    });
    expect(result.html).toContain(
      'href="https://example.test/maquette?a=1&amp;b=2"',
    );
    expect(result.html).toContain(">Découvrir la maquette</a>");
    expect(result.html).toContain("<br />Bonne journée");
    expect(result.text).toContain(
      "Découvrir la maquette : https://example.test/maquette?a=1&b=2",
    );
  });
  it("adds the mockup URL from metadata, without duplicating an existing link", () => {
    const mockupUrl = "https://example.test/demo";
    expect(
      renderEmailBody({ body: "Bonjour, voici notre proposition.", mockupUrl })
        .html,
    ).toContain(">Découvrir la maquette</a>");
    const existing = renderEmailBody({
      body: `[Voir mon aperçu](${mockupUrl})`,
      mockupUrl,
    });
    expect(existing.html.match(/<a /g)).toHaveLength(1);
    expect(existing.html).toContain("Voir mon aperçu");
  });
  it("never interprets raw HTML or attribute injection", () => {
    const result = renderEmailBody({
      body: '<img src=x onerror="alert(1)"> [<script>bad()</script>](https://example.test/)',
    });
    expect(result.html).not.toMatch(/<img|<script|onerror="/);
    expect(result.html).toContain("&lt;script&gt;");
  });
  it("blocks active schemes, URL credentials and dangerous metadata", () => {
    const result = renderEmailBody({
      body: "[Ouvrir](javascript:alert(1)) [Ouvrir](https://user:password@example.test/)",
      mockupUrl: "javascript:alert(1)",
    });
    expect(result.html).not.toContain("<a ");
  });
  it("preserves ordinary plain-text messages and paragraphs", () => {
    const result = renderEmailBody({
      body: "Bonjour & bienvenue\r\n\r\nÀ bientôt.",
    });
    expect(result.text).toBe("Bonjour & bienvenue\n\nÀ bientôt.");
    expect(result.html).toContain("Bonjour &amp; bienvenue");
    expect(result.html.match(/<p /g)).toHaveLength(2);
  });
});
