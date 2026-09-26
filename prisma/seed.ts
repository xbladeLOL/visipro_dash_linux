import { PrismaClient, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays } from "date-fns";
import { calculateDocumentTotals, calculateLineTotal } from "../src/lib/financial";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.pricingPackageItem.deleteMany();
  await prisma.pricingItem.deleteMany();
  await prisma.pricingCategory.deleteMany();
  await prisma.pricingCatalog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectChecklistItem.deleteMany();
  await prisma.project.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.document.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.client.deleteMany();
  await prisma.prospect.deleteMany();
  await prisma.service.deleteMany();
  await prisma.category.deleteMany();
  await prisma.companySettings.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      name: "Administrateur VisiPro",
      email: "admin@visipro.local",
      passwordHash: await bcrypt.hash("visipro-demo", 12)
    }
  });

  await prisma.companySettings.create({
    data: {
      name: "VisiPro",
      legalName: "VisiPro Demo",
      email: "contact@visipro.local",
      phone: "06 00 00 00 00",
      website: "https://visipro.local",
      defaultVatRate: 20,
      quotePrefix: "DEV",
      invoicePrefix: "FAC",
      initialCashBalance: 3500
    }
  });

  const [sites, maintenance, googleBusiness] = await Promise.all([
    prisma.service.create({ data: { name: "Sites internet", defaultVat: 20 } }),
    prisma.service.create({ data: { name: "Maintenance", defaultVat: 20 } }),
    prisma.service.create({ data: { name: "Google Business", defaultVat: 20 } }),
    prisma.service.create({ data: { name: "SEO local", defaultVat: 20 } })
  ]);

  const expenseCategories = await Promise.all(
    ["Logiciels", "Hébergement", "Domaine", "Publicité", "Sous-traitance", "Banque", "Autres"].map((name) =>
      prisma.category.create({ data: { name, kind: "EXPENSE", defaultVat: 20 } })
    )
  );

  const prospects = await Promise.all([
    prisma.prospect.create({ data: { companyName: "Bistrot du Centre DEMO", contactName: "Claire Martin", email: "claire@example.com", city: "Lyon", source: "Google Maps", activity: "Restaurant", potentialValue: 1800, stage: "MEETING", nextAction: "Préparer proposition site + menu", nextFollowUpAt: addDays(new Date(), 1), notes: "Données de démonstration" } }),
    prisma.prospect.create({ data: { companyName: "Garage Moderne DEMO", contactName: "Karim Benali", city: "Villeurbanne", source: "Prospection", activity: "Garage", potentialValue: 900, stage: "CONTACTED", nextAction: "Relance téléphonique", nextFollowUpAt: new Date(), notes: "Données de démonstration" } }),
    prisma.prospect.create({ data: { companyName: "Institut Belle Peau DEMO", city: "Annecy", source: "Instagram", activity: "Institut", potentialValue: 1200, stage: "QUOTE_SENT", notes: "Données de démonstration" } })
  ]);

  await prisma.activity.create({ data: { prospectId: prospects[0].id, type: "CALL", content: "Appel de découverte. Besoin d'un site vitrine et d'une carte restaurant." } });

  const client = await prisma.client.create({
    data: {
      legalName: "Melle Tricote DEMO",
      tradeName: "Melle Tricote",
      contactName: "Sophie Durand",
      email: "sophie@melletricote.example",
      phone: "06 11 22 33 44",
      website: "https://melletricote.example",
      address: "12 rue des Demoiselles, Lyon",
      notes: "Client de démonstration"
    }
  });

  const project = await prisma.project.create({
    data: {
      clientId: client.id,
      serviceId: sites.id,
      name: "Refonte du site Melle Tricote DEMO",
      price: 1200,
      status: "IN_PROGRESS",
      priority: "HIGH",
      startDate: subDays(new Date(), 12),
      deadline: addDays(new Date(), 8),
      description: "Refonte site vitrine avec optimisation SEO locale.",
      progress: 62,
      checklistItems: {
        create: ["Acompte reçu", "Questionnaire reçu", "Logo reçu", "Design", "Développement", "Mobile", "SEO", "Tests", "Validation client", "Déploiement"].map((label, index) => ({ label, position: index, isCompleted: index < 6 }))
      }
    }
  });

  await prisma.task.createMany({
    data: [
      { title: "Finaliser responsive mobile DEMO", projectId: project.id, clientId: client.id, priority: "HIGH", status: "IN_PROGRESS", dueDate: new Date() },
      { title: "Relancer Garage Moderne DEMO", priority: "MEDIUM", status: "TODO", dueDate: new Date() },
      { title: "Préparer mentions légales DEMO", projectId: project.id, clientId: client.id, priority: "MEDIUM", status: "TODO", dueDate: addDays(new Date(), 2) }
    ]
  });

  const quoteLines = [
    { quantity: 1, unitPrice: 1000, taxRate: 20 },
    { quantity: 1, unitPrice: 200, taxRate: 20 }
  ];
  const quoteTotals = calculateDocumentTotals(quoteLines);
  await prisma.quote.create({
    data: {
      number: "DEV-2026-001",
      clientId: client.id,
      issuedAt: subDays(new Date(), 20),
      validUntil: addDays(new Date(), 10),
      subtotal: quoteTotals.subtotal,
      tax: quoteTotals.tax,
      total: quoteTotals.total,
      status: "ACCEPTED",
      items: {
        create: [
          { serviceId: sites.id, description: "Création site internet DEMO", quantity: 1, unitPrice: 1000, taxRate: 20, ...calculateLineTotal({ quantity: 1, unitPrice: 1000, taxRate: 20 }) },
          { serviceId: googleBusiness.id, description: "Optimisation Google Business DEMO", quantity: 1, unitPrice: 200, taxRate: 20, ...calculateLineTotal({ quantity: 1, unitPrice: 200, taxRate: 20 }) }
        ]
      }
    }
  });

  const invoiceLineA = calculateLineTotal({ quantity: 1, unitPrice: 1000, taxRate: 20 });
  const invoiceLineB = calculateLineTotal({ quantity: 12, unitPrice: 50, taxRate: 20 });
  const invoiceTotals = calculateDocumentTotals([{ quantity: 1, unitPrice: 1000, taxRate: 20 }, { quantity: 12, unitPrice: 50, taxRate: 20 }]);
  const invoice = await prisma.invoice.create({
    data: {
      number: "FAC-2026-001",
      clientId: client.id,
      issuedAt: subDays(new Date(), 10),
      dueDate: addDays(new Date(), 20),
      subtotal: invoiceTotals.subtotal,
      tax: invoiceTotals.tax,
      total: invoiceTotals.total,
      paidAmount: 600,
      remainingAmount: invoiceTotals.total - 600,
      status: "PARTIALLY_PAID",
      items: {
        create: [
          { serviceId: sites.id, description: "Création site internet DEMO", quantity: 1, unitPrice: 1000, taxRate: 20, ...invoiceLineA },
          { serviceId: maintenance.id, description: "Maintenance annuelle DEMO", quantity: 12, unitPrice: 50, taxRate: 20, ...invoiceLineB }
        ]
      }
    }
  });

  const payment = await prisma.payment.create({ data: { invoiceId: invoice.id, clientId: client.id, amount: 600, paidAt: subDays(new Date(), 5), method: "BANK_TRANSFER", reference: "DEMO-VIR-001" } });
  await prisma.transaction.create({ data: { type: TransactionType.INCOME, date: payment.paidAt, amount: payment.amount, categoryLabel: "Paiement facture", clientId: client.id, invoiceId: invoice.id, paymentId: payment.id, paymentMethod: payment.method, reference: payment.reference } });

  await prisma.subscription.create({ data: { clientId: client.id, name: "Maintenance site DEMO", amount: 50, interval: "MONTHLY", startDate: new Date(), status: "ACTIVE" } });

  for (const [index, expense] of [
    { vendor: "Adobe DEMO", description: "Abonnement logiciel", ht: 49, vat: 9.8, category: expenseCategories[0] },
    { vendor: "Hébergeur DEMO", description: "Serveur client", ht: 80, vat: 16, category: expenseCategories[1] },
    { vendor: "Freelance DEMO", description: "Sous-traitance intégration", ht: 320, vat: 64, category: expenseCategories[4] }
  ].entries()) {
    const total = expense.ht + expense.vat;
    const created = await prisma.expense.create({ data: { date: subDays(new Date(), index + 2), vendor: expense.vendor, description: expense.description, categoryId: expense.category.id, amountExcludingTax: expense.ht, taxAmount: expense.vat, totalAmount: total, paymentMethod: "CARD", notes: "Dépense de démonstration" } });
    await prisma.transaction.create({ data: { type: TransactionType.EXPENSE, date: created.date, amount: total, categoryId: expense.category.id, vendor: expense.vendor, expenseId: created.id, paymentMethod: "CARD" } });
  }

  await prisma.document.create({ data: { name: "Brief projet Melle Tricote DEMO", type: "ADMINISTRATIVE", storageKey: "demo/brief-melle-tricote.pdf", clientId: client.id, projectId: project.id } });
  await prisma.auditLog.create({ data: { actorId: user.id, entityType: "Seed", entityId: "demo", action: "DEMO_DATA_CREATED", metadata: { demo: true } } });
}

main().finally(async () => prisma.$disconnect());
