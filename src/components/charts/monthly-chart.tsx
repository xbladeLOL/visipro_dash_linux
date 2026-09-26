"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Row = { month: string; revenue: number; expenses: number; profit: number };

export function MonthlyChart({ data }: { data: Row[] }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="revenue" name="CA" fill="#0f172a" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expenses" name="Dépenses" fill="#94a3b8" radius={[6, 6, 0, 0]} />
          <Bar dataKey="profit" name="Résultat" fill="#16a34a" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
