import { DetectionRefresh } from "@/components/detection-refresh";
import { ElapsedTime } from "@/components/elapsed-time";
import { ScanForm } from "@/components/scan-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { importDetectedProspect, rejectDetectedProspect, suppressDetectedProspect } from "@/features/detection/actions";
import { getDetectionData, getEngineJob, type EngineBusiness, type EngineJob } from "@/lib/prospect-engine";

const tierLabel:Record<string,string>={PRIORITAIRE:"Prioritaire",TRES_BON:"Très bon",BON:"Bon",A_VERIFIER:"À vérifier",FAIBLE:"Faible",REJET:"Rejet"};
const tierColor:Record<string,string>={PRIORITAIRE:"bg-red-100 text-red-800",TRES_BON:"bg-orange-100 text-orange-800",BON:"bg-emerald-100 text-emerald-800",A_VERIFIER:"bg-amber-100 text-amber-800",FAIBLE:"bg-slate-100 text-slate-700",REJET:"bg-slate-100 text-slate-500"};

function ProspectCard({business}: {business:EngineBusiness}) {
  const notes=`Score VisiPro : ${business.total ?? "-"}/100\nNiveau : ${tierLabel[business.tier ?? ""] ?? business.tier ?? "-"}\nOffres suggérées : ${(business.recommended_offers ?? []).join(", ")}`;
  return <Card className="space-y-4">
    <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{business.name}</h2><p className="text-sm text-muted-foreground">{business.category ?? "Activité inconnue"} · {business.city ?? "Ville inconnue"}</p></div><div className="text-right"><div className="text-2xl font-semibold">{business.total ?? "-"}</div><span className={`rounded-full px-2 py-1 text-xs font-medium ${tierColor[business.tier ?? ""] ?? tierColor.FAIBLE}`}>{tierLabel[business.tier ?? ""] ?? business.tier ?? "Non noté"}</span></div></div>
    <div className="grid gap-2 text-sm sm:grid-cols-2"><div><span className="text-muted-foreground">Téléphone :</span> {business.phone ?? "-"}</div><div><span className="text-muted-foreground">Avis :</span> {business.rating ?? "-"}/5 ({business.review_count ?? 0})</div>{business.website_url?<a className="text-blue-600 hover:underline sm:col-span-2" href={business.website_url} target="_blank" rel="noreferrer">Voir le site ↗</a>:<div className="font-medium text-orange-700">Aucun site détecté</div>}</div>
    <div className="flex flex-wrap gap-2">{(business.recommended_offers??[]).map(x=><span key={x} className="rounded-lg bg-muted px-2 py-1 text-xs">{x.replaceAll("_"," ")}</span>)}</div>
    <div className="flex flex-wrap gap-2">
      <form action={importDetectedProspect}>{Object.entries({id:business.id,name:business.name,phone:business.phone??"",website:business.website_url??"",email:business.email??"",city:business.city??"",category:business.category??"",notes}).map(([k,v])=><input key={k} type="hidden" name={k} value={v}/>) }<Button>Ajouter au CRM</Button></form>
      <form action={rejectDetectedProspect}><input type="hidden" name="id" value={business.id}/><Button variant="secondary">Rejeter</Button></form>
      <form action={suppressDetectedProspect}><input type="hidden" name="id" value={business.id}/><Button variant="ghost">Ne pas contacter</Button></form>
    </div>
  </Card>;
}

export default async function DetectionPage({searchParams}:{searchParams:Promise<{city?:string;minScore?:string;error?:string;scan?:string}>}) {
  const params=await searchParams; let data; let scan:EngineJob|undefined; let connectionError:string|undefined;
  try { [data,scan]=await Promise.all([getDetectionData({city:params.city,minScore:params.minScore}),params.scan?getEngineJob(params.scan):Promise.resolve(undefined)]); } catch(error) { connectionError=error instanceof Error?error.message:"Moteur indisponible"; }
  const scanActive=Boolean(scan&&(scan.status==="PENDING"||scan.status==="RUNNING"||(scan.children?.pending??0)>0||(scan.children?.running??0)>0));
  const active=Boolean(scanActive||(data && (data.jobs.pending>0||data.jobs.running>0)));
  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-3xl font-semibold">Détection de prospects</h1><p className="text-muted-foreground">Lancez et suivez les analyses automatiques du moteur VisiPro.</p></div><DetectionRefresh active={active}/></div>
    {(params.error||connectionError)&&<Card className="border-red-200 bg-red-50 text-red-800"><strong>Connexion impossible :</strong> {params.error??connectionError}<div className="mt-1 text-sm">Vérifiez PROSPECT_ENGINE_URL, PROSPECT_ENGINE_API_KEY et le service Docker.</div></Card>}
    {params.scan&&!scan&&<Card className="border-emerald-200 bg-emerald-50 text-emerald-800">Scan lancé. Chargement de son état…</Card>}
    {scan&&<ScanProgress scan={scan}/>} 
    <Card><h2 className="mb-4 font-semibold">Lancer un nouveau scan</h2>{data?<ScanForm options={data.options}/>:<ScanForm options={{zones:[],categories:[]}} disabled/>}</Card>
    {data&&<><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Détectés",data.stats.total],["À vérifier",data.stats.review],["En attente",data.jobs.pending],["Analyses actives",data.jobs.analyzing]].map(([label,value])=><Card key={String(label)}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></Card>)}</div>
      <Card><form className="flex flex-col gap-3 sm:flex-row"><Input name="city" placeholder="Filtrer par ville" defaultValue={params.city}/><Input name="minScore" type="number" min="0" max="100" placeholder="Score minimum" defaultValue={params.minScore}/><Button variant="secondary">Filtrer</Button></form></Card>
      <RecentActivity jobs={data.recentJobs}/>
      <div className="grid gap-4 xl:grid-cols-2">{data.businesses.filter(x=>x.status==="REVIEW").map(b=><ProspectCard key={b.id} business={b}/>)}</div>{!data.businesses.some(x=>x.status==="REVIEW")&&<Card className="text-center text-muted-foreground">Aucun prospect en attente de validation.</Card>}</>}
  </div>;
}

function ScanProgress({scan}:{scan:EngineJob}){const c=scan.children??{total:0,pending:0,running:0,completed:0,failed:0};const done=c.completed+c.failed;const percent=c.total?Math.round(done/c.total*100):(scan.status==="COMPLETED"?100:0);const stage=scan.status==="PENDING"?"En attente de démarrage":scan.status==="RUNNING"?"Recherche des entreprises":c.pending||c.running?"Analyse des sites et calcul des scores":c.failed?"Terminé avec des erreurs":"Terminé";return <Card className="border-blue-200 bg-blue-50/60 dark:bg-blue-950/20"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium text-blue-700">Scan en cours</p><h2 className="mt-1 text-xl font-semibold">{stage}</h2><p className="mt-1 text-sm text-muted-foreground">{String(scan.payload?.query??"")} · {String(scan.payload?.city??"")} · tâche {scan.id.slice(0,8)}</p></div><div className="text-sm"><span className="text-muted-foreground">Durée : </span><strong><ElapsedTime startedAt={scan.started_at} completedAt={scanActiveDone(scan)?undefined:scan.completed_at}/></strong></div></div><div className="h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full bg-blue-600 transition-all" style={{width:`${percent}%`}}/></div><div className="grid gap-3 text-center sm:grid-cols-5">{[["Trouvées",scan.discovery?.found??0],["Nouvelles",scan.discovery?.new??0],["En attente",c.pending],["En analyse",c.running],["Terminées",c.completed]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-background p-3"><div className="text-xl font-semibold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>)}</div>{(scan.last_error||scan.discovery?.error||c.failed>0)&&<div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{scan.last_error??scan.discovery?.error??`${c.failed} analyse(s) en erreur`}</div>}</Card>}
function scanActiveDone(scan:EngineJob){return scan.status==="COMPLETED"&&!scan.children?.pending&&!scan.children?.running;}
function RecentActivity({jobs}:{jobs:EngineJob[]}){return <Card><div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">Activité du moteur</h2><p className="text-sm text-muted-foreground">Dernières opérations exécutées sur le serveur.</p></div></div><div className="space-y-2">{jobs.map(job=><div key={job.id} className="flex flex-col gap-2 rounded-xl border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><span className={`mr-2 inline-block h-2 w-2 rounded-full ${job.status==="RUNNING"?"animate-pulse bg-blue-500":job.status==="COMPLETED"?"bg-emerald-500":job.status==="FAILED"?"bg-red-500":"bg-amber-500"}`}/><strong>{job.type==="DISCOVER"?"Recherche":"Analyse de site"}</strong><span className="ml-2 text-muted-foreground">{String(job.payload?.query??job.payload?.businessId??"").slice(0,36)} {String(job.payload?.city??"")}</span>{job.last_error&&<p className="mt-1 text-xs text-red-600">{job.last_error.slice(0,180)}</p>}</div><div className="whitespace-nowrap text-muted-foreground"><ElapsedTime startedAt={job.started_at} completedAt={job.completed_at}/> · {job.status}</div></div>)}</div></Card>}
