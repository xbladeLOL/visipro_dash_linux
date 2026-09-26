import { notFound } from "next/navigation";
import { Priority } from "@prisma/client";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { completeTask, createProjectTask, deleteTask, reopenTask } from "@/features/tasks/actions";
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
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{project.name}</h1>
          <p className="text-muted-foreground">{project.client.legalName} - {formatProjectStatus(project.status)}</p>
        </div>
        <div className="rounded-xl border px-4 py-3 text-right">
          <div className="text-sm text-muted-foreground">Completion</div>
          <div className="text-2xl font-semibold">{project.progress}%</div>
        </div>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-4">
          <div><div className="text-sm text-muted-foreground">Budget</div><div className="font-medium">{formatCurrency(Number(project.price))}</div></div>
          <div><div className="text-sm text-muted-foreground">Service</div><div className="font-medium">{project.service?.name ?? "-"}</div></div>
          <div><div className="text-sm text-muted-foreground">Deadline</div><div className="font-medium">{project.deadline?.toLocaleDateString("fr-FR") ?? "-"}</div></div>
          <div><div className="text-sm text-muted-foreground">Tâches faites</div><div className="font-medium">{doneTasks}/{project.tasks.length}</div></div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${project.progress}%` }} /></div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Ajouter une tâche au projet</h2>
        <form action={createProjectTask} className="grid gap-3 md:grid-cols-4">
          <input type="hidden" name="projectId" value={project.id} />
          <Input name="title" placeholder="Titre de la tâche" required />
          <Input name="dueDate" type="date" />
          <select name="priority" className="h-10 rounded-lg border bg-card px-3 text-sm">{Object.values(Priority).map((priority) => <option key={priority} value={priority}>{formatPriority(priority)}</option>)}</select>
          <Button>Ajouter</Button>
          <Textarea name="description" placeholder="Description" className="md:col-span-4" />
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 font-semibold">Tâches du projet</h2>
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
      </Card>
    </div>
  );
}
