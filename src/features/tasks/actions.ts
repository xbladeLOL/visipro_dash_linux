"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Priority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

async function recalculateProjectProgress(projectId?: string | null) {
  if (!projectId) return;
  const [totalTasks, doneTasks] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, status: TaskStatus.DONE } })
  ]);
  await prisma.project.update({ where: { id: projectId }, data: { progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0 } });
}

export async function createTask(formData: FormData) {
  const projectId = String(formData.get("projectId") || "") || undefined;
  await prisma.task.create({
    data: {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") || "") || undefined,
      projectId,
      clientId: String(formData.get("clientId") || "") || undefined,
      priority: String(formData.get("priority") || Priority.MEDIUM) as Priority,
      status: String(formData.get("status") || TaskStatus.TODO) as TaskStatus,
      dueDate: formData.get("dueDate") ? new Date(String(formData.get("dueDate"))) : undefined
    }
  });
  await recalculateProjectProgress(projectId);

  redirect("/tasks");
}

export async function createProjectTask(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { clientId: true } });
  await prisma.task.create({
    data: {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") || "") || undefined,
      projectId,
      clientId: project.clientId,
      priority: String(formData.get("priority") || Priority.MEDIUM) as Priority,
      status: TaskStatus.TODO,
      dueDate: formData.get("dueDate") ? new Date(String(formData.get("dueDate"))) : undefined
    }
  });
  await recalculateProjectProgress(projectId);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/today");
}

export async function completeTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const task = await prisma.task.update({ where: { id }, data: { status: TaskStatus.DONE }, select: { projectId: true } });
  await recalculateProjectProgress(task.projectId);
  revalidatePath("/tasks");
  revalidatePath("/today");
  if (task.projectId) {
    revalidatePath("/projects");
    revalidatePath(`/projects/${task.projectId}`);
  }
}

export async function reopenTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const task = await prisma.task.update({ where: { id }, data: { status: TaskStatus.TODO }, select: { projectId: true } });
  await recalculateProjectProgress(task.projectId);
  revalidatePath("/tasks");
  revalidatePath("/today");
  if (task.projectId) {
    revalidatePath("/projects");
    revalidatePath(`/projects/${task.projectId}`);
  }
}

export async function deleteTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const task = await prisma.task.findUnique({ where: { id }, select: { projectId: true } });
  await prisma.task.delete({ where: { id } });
  await recalculateProjectProgress(task?.projectId);
  revalidatePath("/tasks");
  revalidatePath("/today");
  if (task?.projectId) {
    revalidatePath("/projects");
    revalidatePath(`/projects/${task.projectId}`);
  }
}
