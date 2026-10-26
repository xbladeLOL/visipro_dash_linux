import { describe, expect, it } from "vitest";
import { toPhoneHref, toWebsiteHref } from "@/lib/contact-links";

describe("contact links", () => {
  it("creates a safe phone link from a formatted French number", () => {
    expect(toPhoneHref("06 12 34 56 78")).toBe("tel:0612345678");
    expect(toPhoneHref("+33 (0)6 12.34.56.78")).toBe("tel:+330612345678");
  });

  it("adds https to a website without a scheme", () => {
    expect(toWebsiteHref("example.fr")).toBe("https://example.fr/");
    expect(toWebsiteHref("javascript:alert(1)")).toBe("");
  });
});
