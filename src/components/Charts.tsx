"use client";

import dynamic from "next/dynamic";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { MonthPoint } from "@/lib/domain/finance";
import { formatEUR } from "@/lib/domain/money";

// Palette validata: colori distinti anche con daltonismo, separati da verde/rosso di stato.
const ENTRATE = "#2f6fed";
const USCITE = "#c8691a";

const euro = (value: unknown) => formatEUR(Math.round(Number(value) * 100));
const axisEuro = (value: number) => formatEUR(value * 100).replace(",00", "");
const axis = { fontSize: 12, fill: "#5b6577" };

function MonthlyChartInner({ data }: { data: MonthPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#e3e8f0" />
          <XAxis dataKey="mese" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={axisEuro} width={72} />
          <Tooltip formatter={euro} cursor={{ fill: "#f4f6fa" }} />
          <Legend iconType="square" wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="Entrate" fill={ENTRATE} radius={[4, 4, 0, 0]} maxBarSize={14} />
          <Bar dataKey="Uscite" fill={USCITE} radius={[4, 4, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryChartInner({ data }: { data: { categoria: string; totale: number }[] }) {
  const rows = data.map((d) => ({ categoria: d.categoria, Spesa: d.totale / 100 }));
  return (
    <div className="w-full" style={{ height: Math.max(160, rows.length * 34 + 16) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid horizontal={false} stroke="#e3e8f0" />
          <XAxis type="number" tick={axis} axisLine={false} tickLine={false} tickFormatter={axisEuro} />
          <YAxis type="category" dataKey="categoria" tick={axis} axisLine={false} tickLine={false} width={96} />
          <Tooltip formatter={euro} cursor={{ fill: "#f4f6fa" }} />
          <Bar dataKey="Spesa" fill={ENTRATE} radius={[0, 4, 4, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// I grafici misurano il contenitore: si disegnano solo nel browser.
const placeholder = () => <div className="h-72 w-full animate-pulse rounded-lg bg-canvas" />;
export const MonthlyChart = dynamic(() => Promise.resolve(MonthlyChartInner), { ssr: false, loading: placeholder });
export const CategoryChart = dynamic(() => Promise.resolve(CategoryChartInner), { ssr: false, loading: placeholder });
