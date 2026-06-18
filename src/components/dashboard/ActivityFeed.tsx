import { motion } from "framer-motion";
import { MessageSquare, RefreshCw, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export interface ActivityItem {
  id: string;
  type: 'message_sent' | 'webhook_received' | 'message_received';
  title: string;
  subtitle: string;
  timeAgo: string;
  statusText: string;
  statusColor: 'green' | 'blue' | 'purple' | 'red';
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export const ActivityFeed = ({ activities }: ActivityFeedProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'message_sent':
      case 'message_received':
        return <MessageSquare className="h-5 w-5 text-white" />;
      case 'webhook_received':
        return <RefreshCw className="h-5 w-5 text-white" />;
      default:
        return <Zap className="h-5 w-5 text-white" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'message_sent':
      case 'message_received':
        return "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]";
      case 'webhook_received':
        return "bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]";
      default:
        return "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]";
    }
  };

  const getStatusColorClass = (color: string) => {
    switch (color) {
      case 'green': return "text-green-500";
      case 'blue': return "text-blue-500";
      case 'purple': return "text-purple-500";
      case 'red': return "text-red-500";
      default: return "text-gray-400";
    }
  };

  return (
    <Card className="glass-card hook7-card-hover border-foreground/5 h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium text-foreground/90">Atividade recente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4"
          >
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getIconBg(activity.type)}`}>
              {getIcon(activity.type)}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground/90 truncate">{activity.title}</p>
              <p className="text-xs text-foreground/50 truncate">{activity.subtitle}</p>
            </div>
            
            {/* Meta */}
            <div className="flex flex-col items-end flex-shrink-0">
              <p className="text-xs text-foreground/50 mb-1">{activity.timeAgo}</p>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full bg-current ${getStatusColorClass(activity.statusColor)} shadow-[0_0_8px_currentColor]`} />
                <span className={`text-xs ${getStatusColorClass(activity.statusColor)}`}>{activity.statusText}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
};
