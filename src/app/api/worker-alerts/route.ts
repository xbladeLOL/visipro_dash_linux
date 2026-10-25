import {createHash,timingSafeEqual} from 'node:crypto';
import {requireEmailUser} from '@/lib/email/access';
import {reportAlert,activeAlerts,acknowledgeAlert} from '@/lib/worker-alerts';
export const runtime='nodejs';export const dynamic='force-dynamic';
const reply=(status:number,x:unknown)=>Response.json(x,{status,headers:{'Cache-Control':'no-store'}});
async function user(){return requireEmailUser()}
export async function GET(){try{await user();return reply(200,{alerts:await activeAlerts()})}catch(e){return reply((e as {status?:number}).status||500,{error:'ALERTS_UNAVAILABLE'})}}
export async function POST(req:Request){
 const authorization=req.headers.get('authorization');
 if(authorization){const key=process.env.VISIPRO_CRM_WORKER_KEY;const hash=(s:string)=>createHash('sha256').update(s).digest();if(!key||authorization.length>512||!timingSafeEqual(hash(authorization),hash('Bearer '+key)))return reply(401,{error:'UNAUTHORIZED'});}
 else {try{await user()}catch{return reply(401,{error:'UNAUTHORIZED'})}const origin=req.headers.get('origin');if(!origin||![new URL(req.url).origin,process.env.AUTH_URL,process.env.NEXTAUTH_URL,'https://serverubuntu-1.tail2b4bce.ts.net'].filter(Boolean).map(u=>new URL(u!).origin).includes(origin))return reply(403,{error:'INVALID_ORIGIN'});}
 let raw='';try{const reader=req.body?.getReader();if(!reader)return reply(400,{error:'BODY_REQUIRED'});let size=0;const decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>6000){await reader.cancel();return reply(413,{error:'BODY_TOO_LARGE'})}raw+=decoder.decode(value,{stream:true})}}catch{return reply(400,{error:'INVALID_BODY'})}
 let x;try{x=JSON.parse(raw)}catch{return reply(400,{error:'INVALID_JSON'})}
 try{if(authorization){if(x.action!=='report'||!/^wrangler:[a-z0-9-]+$/.test(x.id)||!['project-create','deploy','project-list','diagnostic','worker-publication','worker-blocked','worker-quota'].includes(x.operation))return reply(400,{error:'INVALID_ALERT'});for(const k of ['project','code','message','logPath'])if(typeof x[k]!=='string'||!x[k].trim()||x[k].length>(k==='message'?1500:300))return reply(400,{error:'INVALID_ALERT'});await reportAlert({id:x.id,project:x.project,operation:x.operation,code:x.code,message:x.message,logPath:x.logPath});return reply(201,{ok:true})}
 if(x.action!=='acknowledge'||typeof x.id!=='string'||x.id.length>200)return reply(400,{error:'INVALID_ACTION'});const actor=await user();await acknowledgeAlert(x.id,actor.id);return reply(200,{ok:true});
 }catch{return reply(503,{error:'ALERT_STORAGE_UNAVAILABLE'})}}
