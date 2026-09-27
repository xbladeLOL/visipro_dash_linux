import { Priority, TaskStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createTask } from "@/features/tasks/actions";
import { formatPriority, formatTaskStatus } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function NewTaskPage() {
  const [clients, projects] = await Promise.all([
    prisma.client.findMany({ orderBy: { legalName: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" }, include: { client: true } })
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Nouvelle tâche</h1>
        <p className="text-muted-foreground">Crée une tâche liée à un client, un projet ou indépendante.</p>
      </div>
      <Card>
        <form action={createTask} className="grid gap-4 lg:grid-cols-2">
          <Input name="title" placeholder="Titre" required />
          <Input name="dueDate" type="date" />
          <select name="clientId" className="h-11 w-full min-w-0 rounded-lg border bg-card px-3 text-sm lg:h-10">
            <option value="">Client optionnel</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.legalName}</option>)}
          </select>
          <select name="projectId" className="h-11 w-full min-w-0 rounded-lg border bg-card px-3 text-sm lg:h-10">
            <option value="">Projet optionnel</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name} - {project.client.legalName}</option>)}
          </select>
          <select name="priority" className="h-11 w-full min-w-0 rounded-lg border bg-card px-3 text-sm lg:h-10">{Object.values(Priority).map((priority) => <option key={priority} value={priority}>{formatPriority(priority)}</option>)}</select>
          <select name="status" className="h-11 w-full min-w-0 rounded-lg border bg-card px-3 text-sm lg:h-10">{Object.values(TaskStatus).map((status) => <option key={status} value={status}>{formatTaskStatus(status)}</option>)}</select>
          <Textarea name="description" placeholder="Description" className="lg:col-span-2" />
          <Button className="lg:col-span-2">Créer la tâche</Button>
        </form>
      </Card>
    </div>
  );
}
