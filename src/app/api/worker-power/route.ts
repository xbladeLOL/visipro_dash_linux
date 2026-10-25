import {spawnSync} from 'node:child_process';
import {createHash,timingSafeEqual} from 'node:crypto';
import path from 'node:path';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:Request){
 const key=process.env.POWER_WAKE_API_KEY;const hash=(s:string)=>createHash('sha256').update(s).digest();const reply=(status:number,x:unknown)=>Response.json(x,{status,headers:{'Cache-Control':'no-store'}});
 if(!key||key.length<32)return reply(503,{error:'POWER_NOT_CONFIGURED'});
 const auth=req.headers.get('authorization')||'';if(auth.length>512||!timingSafeEqual(hash(auth),hash('Bearer '+key)))return reply(401,{error:'UNAUTHORIZED'});
 let raw='';try{const reader=req.body?.getReader();if(!reader)return reply(400,{error:'BODY_REQUIRED'});let size=0;while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>4096){await reader.cancel();return reply(413,{error:'BODY_TOO_LARGE'})}raw+=new TextDecoder().decode(part.value)}}catch{return reply(400,{error:'INVALID_BODY'})}
 let x:Record<string,unknown>;try{x=JSON.parse(raw)}catch{return reply(400,{error:'INVALID_JSON'})}
 if(!x||!['schedule','status','cancel'].includes(String(x.action)))return reply(400,{error:'INVALID_ACTION'});
 const result=spawnSync('/usr/bin/python3',[path.join(process.cwd(),'scripts/visipro-power-server.py'),String(x.action)],{input:JSON.stringify(x),encoding:'utf8',timeout:10000,maxBuffer:8192,env:{PATH:'/usr/bin:/bin',NODE_ENV:'production'}});
 try{const data=JSON.parse(result.stdout);return reply(result.status===0?200:409,{...data,serverTime:Math.floor(Date.now()/1000)})}catch{return reply(503,{error:'POWER_SERVICE_UNAVAILABLE'})}
}
