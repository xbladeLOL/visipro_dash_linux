import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Card } from "@/components/ui/card";
import { deleteProject } from "@/features/projects/actions";
import { formatProjectStatus } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({ include: { client: true, checklistItems: true }, orderBy: { deadline: "asc" } });
  return <div className="space-y-6"><div><h1 className="text-3xl font-semibold">Projets</h1><p className="text-muted-foreground">Production, deadlines et progression.</p></div><div className="grid gap-4 xl:grid-cols-3">{projects.map((project) => <Card key={project.id} className="h-full"><div className="flex items-start justify-between gap-4"><Link href={`/projects/${project.id}`} className="min-w-0 hover:underline"><h2 className="truncate font-semibold">{project.name}</h2><p className="text-sm text-muted-foreground">{project.client.legalName}</p></Link><div className="flex shrink-0 items-center gap-2"><span className="rounded-full border px-2 py-1 text-xs">{formatProjectStatus(project.status)}</span><form action={deleteProject}><input type="hidden" name="id" value={project.id} /><ConfirmSubmitButton message={`Supprimer le projet « ${project.name} » ? Ses checklists, ses activités et ses documents seront supprimés. Ses tâches seront conservées.`} variant="ghost" className="h-7 px-2 text-xs text-red-600">Supprimer</ConfirmSubmitButton></form></div></div><div className="mt-4 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${project.progress}%` }} /></div><div className="mt-3 flex justify-between text-sm text-muted-foreground"><span>{formatCurrency(Number(project.price))}</span><span>{project.progress}%</span></div></Card>)}</div></div>;
}
