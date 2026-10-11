"use client";
import { useEffect, useState } from "react";
function format(ms:number){const seconds=Math.max(0,Math.floor(ms/1000));const h=Math.floor(seconds/3600);const m=Math.floor((seconds%3600)/60);const s=seconds%60;return h>0?`${h} h ${m} min ${s} s`:m>0?`${m} min ${s} s`:`${s} s`;}
export function ElapsedTime({startedAt,completedAt}:{startedAt?:string;completedAt?:string}){const [,tick]=useState(0);useEffect(()=>{if(!startedAt||completedAt)return;const timer=setInterval(()=>tick(x=>x+1),1000);return()=>clearInterval(timer);},[startedAt,completedAt]);if(!startedAt)return <>Pas encore démarré</>;return <>{format(new Date(completedAt??Date.now()).getTime()-new Date(startedAt).getTime())}</>;}
