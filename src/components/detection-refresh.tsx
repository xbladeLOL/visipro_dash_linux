"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export function DetectionRefresh({ active }: { active: boolean }) { const router=useRouter(); useEffect(()=>{ if(!active)return; const timer=setInterval(()=>router.refresh(),3000); return()=>clearInterval(timer);},[active,router]); return active ? <span className="inline-flex items-center gap-2 text-sm text-amber-700"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />Actualisation automatique</span> : null; }
