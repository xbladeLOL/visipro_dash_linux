import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function AnalyticsPage() {
  const services = await prisma.service.findMany({ include: { projects: true } });
  return <div className="space-y-6"><div><h1 className="text-3xl font-semibold">Statistiques</h1><p className="text-muted-foreground">Rentabilité par service et pilotage commercial.</p></div><Card><h2 className="font-semibold">CA par service</h2><div className="mt-4 space-y-2">{services.map((service) => { const revenue = service.projects.reduce((sum, project) => sum + Number(project.price), 0); return <div key={service.id} className="flex justify-between border-b py-2 text-sm"><span>{service.name}</span><span>{service.projects.length} ventes - {formatCurrency(revenue)}</span></div>; })}</div></Card></div>;
}
