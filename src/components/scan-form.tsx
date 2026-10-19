"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startScan } from "@/features/detection/actions";
import type { SearchOptions } from "@/lib/prospect-engine";

export function ScanForm({options,disabled=false}:{options:SearchOptions;disabled?:boolean}){
  const [selectedQueries,setSelectedQueries]=useState<string[]>([]);
  const [customQuery,setCustomQuery]=useState("");
  const [city,setCity]=useState("");
  const allSelected=options.categories.length>0&&selectedQueries.length===options.categories.length;
  const toggleCategory=(query:string)=>setSelectedQueries(current=>current.includes(query)?current.filter(item=>item!==query):[...current,query]);
  const toggleAll=()=>setSelectedQueries(allSelected?[]:options.categories.map(category=>category.query_terms[0]??category.slug));
  return <form action={startScan} className="space-y-5">
    <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label className="block text-sm font-medium">1. Choisir un ou plusieurs secteurs</label><button type="button" onClick={toggleAll} className="text-sm font-medium text-blue-600 hover:underline">{allSelected?"Tout désélectionner":"Tous les secteurs"}</button></div><div className="flex flex-wrap gap-2">{options.categories.map(category=>{const query=category.query_terms[0]??category.slug;const selected=selectedQueries.includes(query);return <button key={category.id} type="button" onClick={()=>toggleCategory(query)} className={`rounded-full border px-3 py-2 text-sm transition ${selected?"border-primary bg-primary text-primary-foreground":"bg-background hover:bg-muted"}`}>{selected?"✓ ":""}{category.label}<span className="ml-1 opacity-70">{category.lead_value_score}/10</span></button>})}</div>{selectedQueries.map(query=><input key={query} type="hidden" name="queries" value={query}/>)}</div>
    <div><label className="mb-2 block text-sm font-medium">2. Choisir une zone</label><div className="flex flex-wrap gap-2">{options.zones.map(zone=><button key={zone.id} type="button" onClick={()=>setCity(zone.name)} className={`rounded-full border px-3 py-2 text-sm transition ${city===zone.name?"border-primary bg-primary text-primary-foreground":"bg-background hover:bg-muted"}`}>{zone.name}</button>)}</div></div>
    <div className="grid gap-3 md:grid-cols-3"><Input name="query" value={customQuery} onChange={event=>setCustomQuery(event.target.value)} placeholder="Secteur personnalisé (facultatif)"/><Input name="city" value={city} onChange={event=>setCity(event.target.value)} placeholder="Ville : Orléans" required/><Input name="limit" type="number" min="1" max="100" defaultValue="30" aria-label="Résultats maximum par secteur"/></div>
    <div className="grid gap-3 lg:grid-cols-2">
      <label className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><input type="checkbox" name="requireEmail" value="true" defaultChecked className="mt-1 h-4 w-4"/><span><strong>Uniquement les entreprises avec une adresse email</strong><span className="mt-1 block text-xs text-emerald-800">Le moteur inspecte le site et ses pages de contact. Les entreprises sans email public sont conservées dans la base technique mais ne sont pas proposées à valider.</span></span></label>
      <label className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><input type="checkbox" name="requireWebsite" value="true" className="mt-1 h-4 w-4"/><span><strong>Uniquement les entreprises avec un site web</strong><span className="mt-1 block text-xs text-blue-800">Après la recherche, le dashboard affichera seulement les prospects pour lesquels un site web a été détecté.</span></span></label>
    </div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">La limite s’applique à chaque secteur. « Tous les secteurs » consomme une recherche SerpApi par secteur.</p><Button disabled={disabled||(!customQuery.trim()&&!selectedQueries.length)||!city} className="shrink-0">Lancer {selectedQueries.length>1?`${selectedQueries.length+(customQuery.trim()?1:0)} recherches`:"la recherche"}</Button></div>
  </form>;
}
