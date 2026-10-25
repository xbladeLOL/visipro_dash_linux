import {recipientKey} from '@/lib/email/validation';
import {prisma} from '@/lib/prisma';
import {handle} from '@/lib/worker-crm';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handle(request,{db:prisma,recipientKey,key:process.env.VISIPRO_CRM_WORKER_KEY})}
