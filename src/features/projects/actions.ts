"use server";

import { Priority, ProjectStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function createProject(formData: FormData) {
  await prisma.project.create({
    data: {
      name: String(formData.get("name") ?? ""),
      clientId: String(formData.get("clientId") ?? ""),
      serviceId: String(formData.get("serviceId") || "") || undefined,
      price: Number(formData.get("price") || 0),
      status: String(formData.get("status") || ProjectStatus.TO_PREPARE) as ProjectStatus,
      priority: String(formData.get("priority") || Priority.MEDIUM) as Priority,
      startDate: formData.get("startDate") ? new Date(String(formData.get("startDate"))) : undefined,
      deadline: formData.get("deadline") ? new Date(String(formData.get("deadline"))) : undefined,
      description: String(formData.get("description") || "") || undefined,
      progress: 0
    }
  });

  redirect("/projects");
}
