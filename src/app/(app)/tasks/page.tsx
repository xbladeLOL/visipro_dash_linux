import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Card } from "@/components/ui/card";
import { completeTask, deleteTask } from "@/features/tasks/actions";
import { formatPriority, formatTaskStatus } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function TasksPage() {
  const tasks = await prisma.task.findMany({ include: { client: true, project: true }, orderBy: [{ status: "asc" }, { dueDate: "asc" }] });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Tâches</h1>
          <p className="text-muted-foreground">Aujourd&apos;hui, semaine, retard et toutes les tâches.</p>
        </div>
        <Link href="/tasks/new" className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90">+ Nouvelle tâche</Link>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2">Tâche</th>
              <th>Contexte</th>
              <th>Priorité</th>
              <th>Statut</th>
              <th>Échéance</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-t">
                <td className="py-3 font-medium">{task.title}</td>
                <td>{task.client?.legalName ?? task.project?.name ?? "-"}</td>
                <td>{formatPriority(task.priority)}</td>
                <td>{formatTaskStatus(task.status)}</td>
                <td>{task.dueDate?.toLocaleDateString("fr-FR") ?? "-"}</td>
                <td className="flex justify-end gap-2 py-2">
                  {task.status !== "DONE" ? (
                    <form action={completeTask}>
                      <input type="hidden" name="id" value={task.id} />
                      <button className="rounded-lg border px-3 py-1 text-xs hover:bg-muted">Terminer</button>
                    </form>
                  ) : null}
                  <form action={deleteTask}>
                    <input type="hidden" name="id" value={task.id} />
                    <ConfirmSubmitButton message="Supprimer cette tâche ?" variant="ghost" className="h-7 px-2 text-xs text-red-600">Supprimer</ConfirmSubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
