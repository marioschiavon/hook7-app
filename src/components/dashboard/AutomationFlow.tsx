import { motion } from "framer-motion";
import { MessageSquare, RefreshCw, Server, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const AutomationFlow = () => {
  return (
    <Card className="glass-card hook7-card-hover border-foreground/5 h-full overflow-hidden relative">
      <CardHeader className="pb-8">
        <CardTitle className="text-lg font-medium text-foreground/90">Fluxo de automação</CardTitle>
      </CardHeader>
      <CardContent className="relative flex flex-col items-center justify-center min-h-[250px] pt-4">
        
        {/* Background Decorative Lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <svg width="100%" height="100%" className="absolute inset-0">
            <path d="M -50 150 Q 150 100 400 150 T 800 150" stroke="hsl(262 83% 62%)" strokeWidth="1" fill="none" strokeDasharray="4 4" />
          </svg>
        </div>

        {/* Top Row: WA -> Webhook -> System */}
        <div className="flex items-center justify-between w-full max-w-md relative z-10">
          
          {/* Node 1: WhatsApp */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-black/40 border border-green-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.15)] relative">
              <div className="absolute inset-0 rounded-2xl border border-green-500/50 scale-[0.85]" />
              <MessageSquare className="h-6 w-6 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            </div>
            <span className="text-xs text-foreground/70 font-medium">WhatsApp</span>
          </motion.div>

          {/* Arrow 1 */}
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 40, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="h-[1px] bg-foreground/20 relative mx-2 flex-1 max-w-[40px]"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-white/40" />
          </motion.div>

          {/* Node 2: Webhook */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-black/40 border border-purple-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.15)] relative">
              <div className="absolute inset-0 rounded-2xl border border-purple-500/50 scale-[0.85]" />
              <RefreshCw className="h-6 w-6 text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            </div>
            <span className="text-xs text-foreground/70 font-medium">Webhook</span>
          </motion.div>

          {/* Arrow 2 */}
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 40, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="h-[1px] bg-foreground/20 relative mx-2 flex-1 max-w-[40px]"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-white/40" />
          </motion.div>

          {/* Node 3: System */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-black/40 border border-blue-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.15)] relative">
              <div className="absolute inset-0 rounded-2xl border border-blue-500/50 scale-[0.85]" />
              <Server className="h-6 w-6 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            </div>
            <span className="text-xs text-foreground/70 font-medium">Seu Sistema</span>
          </motion.div>
        </div>

        {/* Bottom Row: Auto Reply */}
        <div className="w-full max-w-md relative mt-12 flex justify-center z-10">
          
          {/* Connector from System down and left to Auto Reply */}
          <svg className="absolute w-[150px] h-[60px] right-[10%] bottom-[80%] pointer-events-none" style={{ overflow: 'visible' }}>
            <motion.path 
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              d="M 120 0 L 120 20 Q 120 30 110 30 L 10 30 Q 0 30 0 40 L 0 50" 
              fill="none" 
              stroke="#eab308" 
              strokeWidth="1.5" 
              strokeDasharray="4 4" 
              className="opacity-70"
            />
            <motion.path 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.0 }}
              d="M -4 46 L 0 52 L 4 46 Z" 
              fill="#eab308" 
              className="opacity-70"
            />
          </svg>

          {/* Node 4: Auto Reply */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-black/40 border border-yellow-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.15)] relative">
              <div className="absolute inset-0 rounded-2xl border border-yellow-500/50 scale-[0.85]" />
              <Zap className="h-6 w-6 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
            </div>
            <span className="text-xs text-foreground/70 font-medium">Resposta automática</span>
          </motion.div>

        </div>

      </CardContent>
    </Card>
  );
};
