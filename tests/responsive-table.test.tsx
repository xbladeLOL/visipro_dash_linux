import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ResponsiveTable } from "@/components/ui/responsive-table";

describe("responsive table labels and form controls", () => {
  it("labels each mobile value using its column header", () => {
    const html = renderToStaticMarkup(<ResponsiveTable className="text-sm"><thead><tr><th>Entreprise</th><th>Statut</th></tr></thead><tbody><tr><td>Exemple</td><td>Brouillon</td></tr></tbody></ResponsiveTable>);
    expect(html).toContain('data-label="Entreprise"');
    expect(html).toContain('data-label="Statut"');
    expect(html).toContain('role="table"');
    expect(html).toContain('responsive-table text-sm');
  });
  it("keeps only one copy of bulk approval controls", () => {
    const html = renderToStaticMarkup(<ResponsiveTable><thead><tr><th>Valider</th><th>Message</th></tr></thead><tbody>{["a", "b"].map(id => <tr key={id}><td><input type="checkbox" name="selected" form="bulk-approval" value={id} /></td><td>{id}</td></tr>)}</tbody></ResponsiveTable>);
    expect(html.match(/name="selected"/g)).toHaveLength(2);
    expect(html.match(/form="bulk-approval"/g)).toHaveLength(2);
  });
  it("does not label empty-state cells as the first column", () => {
    const html = renderToStaticMarkup(<ResponsiveTable><thead><tr><th>Nom</th><th>Date</th></tr></thead><tbody><tr><td colSpan={2}>Aucun résultat</td></tr></tbody></ResponsiveTable>);
    expect(html).toContain('data-full-row="true"');
    expect(html).not.toContain('data-label="Nom"');
  });
  it("handles nested header text and preserves existing actions", () => {
    const html = renderToStaticMarkup(<ResponsiveTable><thead><tr><th><span>Actions</span></th></tr></thead><tbody><tr><td><form action="/test"><button>Ouvrir</button></form></td></tr></tbody></ResponsiveTable>);
    expect(html).toContain('data-label="Actions"');
    expect(html).toContain('action="/test"');
    expect(html).toContain('<button>Ouvrir</button>');
  });
});
