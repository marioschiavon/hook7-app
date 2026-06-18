import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  color?: "green" | "blue" | "purple" | "orange";
  progress?: number;
}

const colorClasses = {
  green:  "border-green-500/15 bg-gradient-to-br from-green-500/8 via-transparent to-transparent",
  blue:   "border-blue-500/15 bg-gradient-to-br from-blue-500/8 via-transparent to-transparent",
  purple: "border-purple-500/15 bg-gradient-to-br from-purple-500/8 via-transparent to-transparent",
  orange: "border-orange-500/15 bg-gradient-to-br from-orange-500/8 via-transparent to-transparent",
};

const iconColorClasses = {
  green:  "bg-green-500/12 text-green-400",
  blue:   "bg-blue-500/12 text-blue-400",
  purple: "bg-purple-500/12 text-purple-400",
  orange: "bg-orange-500/12 text-orange-400",
};

const progressColorClasses = {
  green:  "[&>div]:bg-green-500",
  blue:   "[&>div]:bg-blue-500",
  purple: "[&>div]:bg-purple-500",
  orange: "[&>div]:bg-orange-500",
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  trendUp,
  color = "blue",
  progress,
}: StatsCardProps) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <Card className={cn("glass-card relative overflow-hidden border", colorClasses[color])}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-bold font-['Space_Grotesk'] tabular-nums">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
            <div className={cn("p-2.5 rounded-xl shrink-0", iconColorClasses[color])}>
              <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </div>
          </div>

          {trend && (
            <div className={cn(
              "mt-3 flex items-center gap-1 text-xs font-medium",
              trendUp ? "text-green-400" : "text-red-400"
            )}>
              {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend}
            </div>
          )}

          {progress !== undefined && (
            <div className={cn("mt-3", progressColorClasses[color])}>
              <Progress value={progress} className="h-1 bg-foreground/5" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
