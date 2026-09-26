import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatProjectStatus } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({ include: { client: true, checklistItems: true }, orderBy: { deadline: "asc" } });
  return <div className="space-y-6"><div><h1 className="text-3xl font-semibold">Projets</h1><p className="text-muted-foreground">Production, deadlines et progression.</p></div><div className="grid gap-4 xl:grid-cols-3">{projects.map((project) => <Link href={`/projects/${project.id}`} key={project.id}><Card className="h-full transition hover:bg-muted/50"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{project.name}</h2><p className="text-sm text-muted-foreground">{project.client.legalName}</p></div><span className="rounded-full border px-2 py-1 text-xs">{formatProjectStatus(project.status)}</span></div><div className="mt-4 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${project.progress}%` }} /></div><div className="mt-3 flex justify-between text-sm text-muted-foreground"><span>{formatCurrency(Number(project.price))}</span><span>{project.progress}%</span></div></Card></Link>)}</div></div>;
}
