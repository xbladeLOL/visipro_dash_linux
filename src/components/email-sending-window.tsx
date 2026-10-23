"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
const time = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
export function EmailSendingWindow({ startMinute, endMinute }: {
  startMinute: number;
  endMinute: number;
}) {
  const [allDay, setAllDay] = useState(startMinute === 0 && endMinute === 1440);
  return <>
    <label className="flex items-center gap-3 sm:col-span-2">
      <input name="allDay" type="checkbox" checked={allDay}
        onChange={(event) => setAllDay(event.target.checked)} />
      Envoyer toute la journée (24 h/24)
    </label>
    <p className="text-sm text-muted-foreground sm:col-span-2">
      De minuit à minuit, uniquement les jours autorisés. Le quota quotidien et
      l’intervalle minimal restent appliqués.
    </p>
    <label>Début des envois
      <Input name="startTime" type="time" required={!allDay} disabled={allDay}
        defaultValue={time(startMinute)} />
    </label>
    <label>Fin des envois (exclue)
      <Input name="endTime" type="time" required={!allDay} disabled={allDay}
        defaultValue={time(endMinute === 1440 ? 1080 : endMinute)} />
    </label>
  </>;
}
