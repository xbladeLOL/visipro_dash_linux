import {prisma} from '@/lib/prisma';
export type WorkerAlert={id:string;project:string;operation:string;code:string;message:string;logPath:string;createdAt:Date;lastSeenAt:Date;occurrences:number;acknowledgedAt:Date|null};
export async function reportAlert(x:Omit<WorkerAlert,'createdAt'|'lastSeenAt'|'occurrences'|'acknowledgedAt'>){await prisma.$executeRaw`INSERT INTO worker_alerts (id,project,operation,code,message,"logPath") VALUES (${x.id},${x.project},${x.operation},${x.code},${x.message},${x.logPath}) ON CONFLICT(id) DO NOTHING`;}
export async function activeAlerts(){return prisma.$queryRaw<WorkerAlert[]>`SELECT * FROM worker_alerts WHERE "acknowledgedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 30`;}
export async function acknowledgeAlert(id:string,actor:string){return prisma.$executeRaw`UPDATE worker_alerts SET "acknowledgedAt"=NOW(),"acknowledgedBy"=${actor} WHERE id=${id} AND "acknowledgedAt" IS NULL`;}
