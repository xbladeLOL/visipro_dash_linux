import { notFound } from "next/navigation";
import { Priority } from "@prisma/client";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { completeTask, createProjectTask, deleteTask, reopenTask } from "@/features/tasks/actions";
import { deleteProject } from "@/features/projects/actions";
import { formatPriority, formatProjectStatus, formatTaskStatus } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { client: true, service: true, tasks: { orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }] } }
  });

  if (!project) notFound();

  const doneTasks = project.tasks.filter((task) => task.status === "DONE").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{project.name}</h1>
          <p className="text-muted-foreground">{project.client.legalName} - {formatProjectStatus(project.status)}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:items-start">
          <div className="rounded-xl border px-4 py-3 text-right">
            <div className="text-sm text-muted-foreground">Completion</div>
            <div className="text-2xl font-semibold">{project.progress}%</div>
          </div>
          <form action={deleteProject} className="min-w-0 flex-1 lg:flex-none">
            <input type="hidden" name="id" value={project.id} />
            <ConfirmSubmitButton message={`Supprimer le projet « ${project.name} » ? Ses checklists, ses activités et ses documents seront supprimés. Ses tâches seront conservées.`} variant="ghost" className="h-11 w-full px-3 text-sm text-red-600 lg:h-10 lg:w-auto">Supprimer le projet</ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <Card>
        <div className="grid gap-4 lg:grid-cols-4">
          <div><div className="text-sm text-muted-foreground">Budget</div><div className="font-medium">{formatCurrency(Number(project.price))}</div></div>
          <div><div className="text-sm text-muted-foreground">Service</div><div className="font-medium">{project.service?.name ?? "-"}</div></div>
          <div><div className="text-sm text-muted-foreground">Deadline</div><div className="font-medium">{project.deadline?.toLocaleDateString("fr-FR") ?? "-"}</div></div>
          <div><div className="text-sm text-muted-foreground">Tâches faites</div><div className="font-medium">{doneTasks}/{project.tasks.length}</div></div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${project.progress}%` }} /></div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Ajouter une tâche au projet</h2>
        <form action={createProjectTask} className="grid gap-3 lg:grid-cols-4">
          <input type="hidden" name="projectId" value={project.id} />
          <Input name="title" placeholder="Titre de la tâche" required />
          <Input name="dueDate" type="date" />
          <select name="priority" className="h-11 w-full min-w-0 rounded-lg border bg-card px-3 text-sm lg:h-10">{Object.values(Priority).map((priority) => <option key={priority} value={priority}>{formatPriority(priority)}</option>)}</select>
          <Button>Ajouter</Button>
          <Textarea name="description" placeholder="Description" className="h-24 lg:h-auto lg:col-span-4" />
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 font-semibold">Tâches du projet</h2>
        <div className="hidden lg:block">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th className="py-2">Tâche</th><th>Priorité</th><th>Statut</th><th>Échéance</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {project.tasks.map((task) => (
              <tr key={task.id} className="border-t">
                <td className="py-3 font-medium">{task.title}</td>
                <td>{formatPriority(task.priority)}</td>
                <td>{formatTaskStatus(task.status)}</td>
                <td>{task.dueDate?.toLocaleDateString("fr-FR") ?? "-"}</td>
                <td className="flex justify-end gap-2 py-2">
                  {task.status === "DONE" ? <form action={reopenTask}><input type="hidden" name="id" value={task.id} /><button className="rounded-lg border px-3 py-1 text-xs hover:bg-muted">Réouvrir</button></form> : <form action={completeTask}><input type="hidden" name="id" value={task.id} /><button className="rounded-lg border px-3 py-1 text-xs hover:bg-muted">Terminer</button></form>}
                  <form action={deleteTask}><input type="hidden" name="id" value={task.id} /><ConfirmSubmitButton message="Supprimer cette tâche du projet ?" variant="ghost" className="h-7 px-2 text-xs text-red-600">Supprimer</ConfirmSubmitButton></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {project.tasks.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Aucune tâche pour ce projet. Ajoute une tâche pour suivre la completion.</div> : null}
        </div>
        <div className="space-y-3 lg:hidden">
          {project.tasks.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Aucune tâche pour ce projet. Ajoute une tâche pour suivre la completion.</div> : null}
          {project.tasks.map((task) => (
            <div key={task.id} className="rounded-xl border p-3">
              <div className="font-medium">{task.title}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="text-xs">{formatPriority(task.priority)}</span>
                <span className="rounded-full border px-2 py-0.5 text-xs">{formatTaskStatus(task.status)}</span>
                {task.dueDate ? <span className="text-xs">{task.dueDate.toLocaleDateString("fr-FR")}</span> : null}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {task.status === "DONE" ? (
                  <form action={reopenTask} className="min-w-0 flex-1"><input type="hidden" name="id" value={task.id} /><button className="h-11 w-full rounded-lg border px-3 text-sm hover:bg-muted">Réouvrir</button></form>
                ) : (
                  <form action={completeTask} className="min-w-0 flex-1"><input type="hidden" name="id" value={task.id} /><button className="h-11 w-full rounded-lg border px-3 text-sm hover:bg-muted">Terminer</button></form>
                )}
                <form action={deleteTask} className="min-w-0 flex-1"><input type="hidden" name="id" value={task.id} /><ConfirmSubmitButton message="Supprimer cette tâche du projet ?" variant="ghost" className="h-11 w-full px-3 text-sm text-red-600">Supprimer</ConfirmSubmitButton></form>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
