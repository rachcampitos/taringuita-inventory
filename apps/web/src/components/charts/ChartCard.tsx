"use client";

import { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  height?: number;
}

export function ChartCard({ title, subtitle, children, height = 300 }: ChartCardProps) {
  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      <div className="px-4 py-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
