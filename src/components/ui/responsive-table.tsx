import { Children, cloneElement, isValidElement, type ReactNode, type TableHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CellProps = { children?: ReactNode; colSpan?: number; role?: string; "data-label"?: string; "data-full-row"?: boolean };
function text(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (isValidElement<CellProps>(node)) return text(node.props.children);
  return Children.toArray(node).map(child => isValidElement<CellProps>(child) ? text(child.props.children) : String(child)).join(" ");
}

/** One set of cells and form controls: a table on desktop, labelled cards on mobile. */
export function ResponsiveTable({ children, className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  const labels: string[] = [];
  function collect(node: ReactNode): void {
    Children.forEach(node, child => {
      if (!isValidElement<CellProps>(child)) return;
      if (child.type === "th") labels.push(text(child.props.children).trim());
      else collect(child.props.children);
    });
  }
  Children.forEach(children, child => {
    if (isValidElement<CellProps>(child) && child.type === "thead") collect(child.props.children);
  });
  const sections = Children.map(children, section => {
    if (!isValidElement<CellProps>(section) || section.type !== "tbody") return section;
    return cloneElement(section, { role: "rowgroup" }, Children.map(section.props.children, row => {
      if (!isValidElement<CellProps>(row) || row.type !== "tr") return row;
      let column = 0;
      return cloneElement(row, { role: "row" }, Children.map(row.props.children, cell => {
        if (!isValidElement<CellProps>(cell) || cell.type !== "td") return cell;
        const fullRow = (cell.props.colSpan ?? 1) > 1;
        const label = labels[column];
        column += cell.props.colSpan ?? 1;
        return cloneElement(cell, { role: "cell", "data-label": fullRow ? undefined : label, "data-full-row": fullRow || undefined });
      }));
    }));
  });
  return <table {...props} role="table" className={cn("responsive-table", className)}>{sections}</table>;
}
