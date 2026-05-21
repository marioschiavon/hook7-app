import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <SEO 
        title="Página Não Encontrada | Hook7"
        description="A página que você está procurando não existe ou foi movida."
        noindex={true}
      />
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h1 className="text-7xl font-bold text-primary">404</h1>
            <h2 className="text-2xl font-semibold text-foreground">Página não encontrada</h2>
            <p className="text-muted-foreground">
              A página que você está procurando não existe ou foi movida.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Ir para o Início
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
