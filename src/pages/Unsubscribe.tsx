import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SEO from "@/components/SEO";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const processUnsubscribe = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setErrorMessage("Token inválido ou ausente.");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("unsubscribe-reminders", {
          body: { token },
        });

        if (error) {
          throw error;
        }

        if (data?.success) {
          setStatus("success");
        } else {
          throw new Error(data?.error || "Erro ao processar solicitação");
        }
      } catch (err: any) {
        console.error("Unsubscribe error:", err);
        setStatus("error");
        setErrorMessage(err.message || "Ocorreu um erro ao processar sua solicitação.");
      }
    };

    processUnsubscribe();
  }, [searchParams]);

  return (
    <>
      <SEO
        title="Cancelar Inscrição | Hook7"
        description="Cancelar inscrição de lembretes por email"
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {status === "loading" && (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                </div>
              )}
              {status === "success" && (
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              )}
              {status === "error" && (
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              )}
            </div>
            <CardTitle>
              {status === "loading" && "Processando..."}
              {status === "success" && "Inscrição Cancelada"}
              {status === "error" && "Ops! Algo deu errado"}
            </CardTitle>
            <CardDescription>
              {status === "loading" && "Aguarde enquanto processamos sua solicitação."}
              {status === "success" && "Você não receberá mais lembretes por email."}
              {status === "error" && errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === "success" && (
              <>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>Seus lembretes foram desativados com sucesso</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Se mudar de ideia, você pode reativar os lembretes nas configurações da sua conta.
                </p>
              </>
            )}
            <Button asChild className="w-full">
              <Link to="/">Voltar para o início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Unsubscribe;

