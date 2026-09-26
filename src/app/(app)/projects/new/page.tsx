import { Priority, ProjectStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createProject } from "@/features/projects/actions";
import { formatPriority, formatProjectStatus } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function NewProjectPage() {
  const [clients, services] = await Promise.all([prisma.client.findMany({ orderBy: { legalName: "asc" } }), prisma.service.findMany({ orderBy: { name: "asc" } })]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Nouveau projet</h1>
        <p className="text-muted-foreground">Lance une production reliée à un client et un service.</p>
      </div>
      <Card>
        <form action={createProject} className="grid gap-4 md:grid-cols-2">
          <Input name="name" placeholder="Nom du projet" required />
          <select name="clientId" className="h-10 rounded-lg border bg-card px-3 text-sm" required>
            <option value="">Client</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.legalName}</option>)}
          </select>
          <select name="serviceId" className="h-10 rounded-lg border bg-card px-3 text-sm">
            <option value="">Service</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
          </select>
          <Input name="price" type="number" step="0.01" placeholder="Prix" />
          <select name="status" className="h-10 rounded-lg border bg-card px-3 text-sm">{Object.values(ProjectStatus).map((status) => <option key={status} value={status}>{formatProjectStatus(status)}</option>)}</select>
          <select name="priority" className="h-10 rounded-lg border bg-card px-3 text-sm">{Object.values(Priority).map((priority) => <option key={priority} value={priority}>{formatPriority(priority)}</option>)}</select>
          <Input name="startDate" type="date" />
          <Input name="deadline" type="date" />
          <Textarea name="description" placeholder="Description" className="md:col-span-2" />
          <Button className="md:col-span-2">Créer le projet</Button>
        </form>
      </Card>
    </div>
  );
}
