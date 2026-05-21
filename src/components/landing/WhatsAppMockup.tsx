import { motion } from "framer-motion";
import { ChevronLeft, Phone, Video, MoreVertical, CheckCheck } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface MessageBubbleProps {
  text: string;
  time: string;
  delay?: number;
}

const MessageBubble = ({ text, time, delay = 0 }: MessageBubbleProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.4, delay }}
    className="flex justify-end"
  >
    <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[85%] shadow-sm relative">
      <p className="text-sm text-gray-800 pr-14">{text}</p>
      <div className="absolute bottom-1 right-2 flex items-center gap-1">
        <span className="text-[10px] text-gray-500">{time}</span>
        <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
      </div>
    </div>
  </motion.div>
);

const TypingIndicator = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ delay }}
    className="flex justify-end"
  >
    <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-4 py-3 shadow-sm">
      <div className="flex gap-1">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
      </div>
    </div>
  </motion.div>
);

const WhatsAppMockup = () => {
  const messages = [
    { text: "✅ Pedido #2847 confirmado! Obrigado pela compra 🛒", time: "10:42", delay: 0.5 },
    { text: "📅 Lembrete: Sua consulta é amanhã às 14h", time: "10:43", delay: 1.5 },
    { text: "💳 Pagamento de R$ 159,90 aprovado!", time: "10:44", delay: 2.5 },
  ];

  return (
    <div className="relative w-full max-w-[320px] mx-auto">
      {/* Phone Frame */}
      <div className="rounded-[2.5rem] border-[6px] border-gray-800 bg-gray-800 p-1 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-800 rounded-b-xl z-10" />
        
        {/* Screen */}
        <div className="rounded-[2rem] overflow-hidden bg-[#efeae2]">
          {/* WhatsApp Header */}
          <div className="bg-[#075e54] text-white px-3 py-2 pt-6">
            <div className="flex items-center gap-2">
              <ChevronLeft className="h-5 w-5 opacity-90" />
              <Avatar className="h-9 w-9 border-2 border-white/20">
                <AvatarImage src="/hook7-logo.svg" alt="Empresa" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">UP</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">Sua Empresa</p>
                <p className="text-[11px] text-white/70">online</p>
              </div>
              <div className="flex items-center gap-3 opacity-90">
                <Video className="h-4 w-4" />
                <Phone className="h-4 w-4" />
                <MoreVertical className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div 
            className="p-3 space-y-2 min-h-[280px] relative"
            style={{
              backgroundColor: "#efeae2",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c4bc' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            {/* Date Badge */}
            <div className="flex justify-center mb-2">
              <span className="bg-white/80 text-gray-600 text-[11px] px-3 py-1 rounded-lg shadow-sm">
                HOJE
              </span>
            </div>

            {/* Messages */}
            {messages.map((msg, index) => (
              <MessageBubble
                key={index}
                text={msg.text}
                time={msg.time}
                delay={msg.delay}
              />
            ))}

            {/* Typing Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 4, delay: 3.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <TypingIndicator />
            </motion.div>
          </div>

          {/* Input Area */}
          <div className="bg-[#f0f0f0] px-2 py-2 flex items-center gap-2">
            <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center">
              <span className="text-gray-400 text-sm">Mensagem</span>
            </div>
            <div className="w-9 h-9 bg-[#075e54] rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14.5l7.5-4.5-7.5-4.5v4.5H4v0h8v4.5z" transform="rotate(-45 12 12)" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppMockup;
