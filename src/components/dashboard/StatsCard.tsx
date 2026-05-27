import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: string;
  color?: "green" | "blue" | "purple" | "orange";
  progress?: number;
}

const colorClasses = {
  green: "from-green-500/10 via-emerald-500/5 to-transparent border-green-500/20",
  blue: "from-blue-500/10 via-cyan-500/5 to-transparent border-blue-500/20",
  purple: "from-purple-500/10 via-pink-500/5 to-transparent border-purple-500/20",
  orange: "from-orange-500/10 via-amber-500/5 to-transparent border-orange-500/20",
};

const iconColorClasses = {
  green: "bg-green-500/10 text-green-600 dark:text-green-400",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  color = "blue",
  progress,
}: StatsCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "glass-card relative overflow-hidden hook7-card-hover",
          colorClasses[color]
        )}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold font-['Space_Grotesk']">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
              {trend && (
                <p className="text-xs text-muted-foreground">{trend}</p>
              )}
            </div>
            <div className={cn("p-3 rounded-full", iconColorClasses[color])}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          {progress !== undefined && (
            <div className="mt-4">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
