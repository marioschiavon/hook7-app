import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Copy, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import * as hook7Api from "@/services/hook7Api";
import { motion, AnimatePresence } from "framer-motion";

interface GroupExtractorProps {
  sessionName: string;
  apiToken: string;
}

export const GroupExtractor = ({ sessionName, apiToken }: GroupExtractorProps) => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchGroups = async () => {
    try {
      if (refreshing) return;
      setRefreshing(true);
      const result = await hook7Api.fetchAllGroups(sessionName, apiToken);
      if (!result.success) throw new Error(result.error);
      setGroups(result.data || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error(t("groups.fetchError", "Erro ao buscar grupos"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [sessionName, apiToken]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(t("groups.idCopied", "ID do grupo copiado!"));
  };

  const filteredGroups = groups.filter((g) =>
    g.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Extrator de Grupos
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchGroups}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Use os IDs extraídos abaixo para enviar mensagens para grupos via API.
      </p>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar grupo..."
          className="pl-8 bg-muted/50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="border rounded-lg overflow-hidden bg-background max-h-[300px] overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded" />
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm ? "Nenhum grupo encontrado na busca." : "Nenhum grupo encontrado nesta sessão."}
          </div>
        ) : (
          <div className="divide-y">
            <AnimatePresence>
              {filteredGroups.map((group) => (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  key={group.id}
                  className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 pr-4">
                    <p className="font-medium truncate" title={group.subject}>
                      {group.subject || "Grupo sem nome"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                      {group.id}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0 gap-1.5 h-8"
                    onClick={() => handleCopyId(group.id)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Copiar ID</span>
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
