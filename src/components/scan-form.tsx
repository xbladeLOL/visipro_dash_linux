"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startScan } from "@/features/detection/actions";
import type { SearchOptions } from "@/lib/prospect-engine";

export function ScanForm({options,disabled=false}:{options:SearchOptions;disabled?:boolean}){
  const [query,setQuery]=useState(""); const [city,setCity]=useState("");
  return <form action={startScan} className="space-y-5">
    <div><label className="mb-2 block text-sm font-medium">1. Choisir un métier</label><div className="flex flex-wrap gap-2">{options.categories.map(category=><button key={category.id} type="button" onClick={()=>setQuery(category.query_terms[0]??category.slug)} className={`rounded-full border px-3 py-2 text-sm transition ${query===(category.query_terms[0]??category.slug)?"border-primary bg-primary text-primary-foreground":"bg-background hover:bg-muted"}`}>{category.label}</button>)}</div></div>
    <div><label className="mb-2 block text-sm font-medium">2. Choisir une zone</label><div className="flex flex-wrap gap-2">{options.zones.map(zone=><button key={zone.id} type="button" onClick={()=>setCity(zone.name)} className={`rounded-full border px-3 py-2 text-sm transition ${city===zone.name?"border-primary bg-primary text-primary-foreground":"bg-background hover:bg-muted"}`}>{zone.name}</button>)}</div></div>
    <div className="grid gap-3 md:grid-cols-4"><Input name="query" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Métier : électricien" required/><Input name="city" value={city} onChange={e=>setCity(e.target.value)} placeholder="Ville : Orléans" required/><Input name="limit" type="number" min="1" max="100" defaultValue="30"/><Button disabled={disabled||!query||!city}>Lancer la recherche</Button></div>
    <p className="text-xs text-muted-foreground">Les boutons remplissent les champs automatiquement. Les champs restent modifiables pour une recherche personnalisée.</p>
  </form>;
}
