import { DetectionRefresh } from "@/components/detection-refresh";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { importDetectedProspect, rejectDetectedProspect, startScan, suppressDetectedProspect } from "@/features/detection/actions";
import { getDetectionData, type EngineBusiness } from "@/lib/prospect-engine";

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
  const params=await searchParams; let data; let connectionError:string|undefined;
  try { data=await getDetectionData({city:params.city,minScore:params.minScore}); } catch(error) { connectionError=error instanceof Error?error.message:"Moteur indisponible"; }
  const active=Boolean(data && (data.jobs.pending>0||data.jobs.running>0));
  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-3xl font-semibold">Détection de prospects</h1><p className="text-muted-foreground">Lancez et suivez les analyses automatiques du moteur VisiPro.</p></div><DetectionRefresh active={active}/></div>
    {(params.error||connectionError)&&<Card className="border-red-200 bg-red-50 text-red-800"><strong>Connexion impossible :</strong> {params.error??connectionError}<div className="mt-1 text-sm">Vérifiez PROSPECT_ENGINE_URL, PROSPECT_ENGINE_API_KEY et le service Docker.</div></Card>}
    {params.scan&&<Card className="border-emerald-200 bg-emerald-50 text-emerald-800">Scan lancé avec succès. Identifiant : <code>{params.scan}</code></Card>}
    <Card><h2 className="mb-4 font-semibold">Lancer un nouveau scan</h2><form action={startScan} className="grid gap-3 md:grid-cols-4"><Input name="query" placeholder="Métier : électricien" required/><Input name="city" placeholder="Ville : Orléans" required/><Input name="limit" type="number" min="1" max="100" defaultValue="30"/><Button disabled={!data}>Lancer la recherche</Button></form></Card>
    {data&&<><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Détectés",data.stats.total],["À vérifier",data.stats.review],["En attente",data.jobs.pending],["Analyses actives",data.jobs.analyzing]].map(([label,value])=><Card key={String(label)}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></Card>)}</div>
      <Card><form className="flex flex-col gap-3 sm:flex-row"><Input name="city" placeholder="Filtrer par ville" defaultValue={params.city}/><Input name="minScore" type="number" min="0" max="100" placeholder="Score minimum" defaultValue={params.minScore}/><Button variant="secondary">Filtrer</Button></form></Card>
      <div className="grid gap-4 xl:grid-cols-2">{data.businesses.filter(x=>x.status==="REVIEW").map(b=><ProspectCard key={b.id} business={b}/>)}</div>{!data.businesses.some(x=>x.status==="REVIEW")&&<Card className="text-center text-muted-foreground">Aucun prospect en attente de validation.</Card>}</>}
  </div>;
}
