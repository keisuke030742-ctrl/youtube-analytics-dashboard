"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  format?: "number" | "duration" | "percentage";
}

export function KPICard({
  title,
  value,
  change,
  changeLabel = "前月比",
  icon,
  format = "number",
}: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === "string") return val;

    switch (format) {
      case "duration":
        // Convert minutes to hours and minutes
        const hours = Math.floor(val / 60);
        const minutes = val % 60;
        if (hours > 0) {
          return `${hours.toLocaleString()}時間 ${minutes}分`;
        }
        return `${minutes}分`;
      case "percentage":
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString();
    }
  };

  const getChangeIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="h-4 w-4" />;
    }
    return change > 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    );
  };

  const getChangeColor = () => {
    if (change === undefined || change === 0) {
      return "text-muted-foreground";
    }
    return change > 0 ? "text-green-500" : "text-red-500";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs mt-1", getChangeColor())}>
            {getChangeIcon()}
            <span>
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}% {changeLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
