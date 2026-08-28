import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "./CodeBlock";
import { ParameterTable, Parameter } from "./ParameterTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EndpointCardProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  description: string;
  parameters?: Parameter[];
  requestExample?: string;
  responseExample: string;
  errorCodes?: { code: string; message: string; solution: string }[];
}

const methodColors = {
  GET: "bg-green-500/15 text-green-300 border-green-500/30",
  POST: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  PUT: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  DELETE: "bg-red-500/15 text-red-300 border-red-500/30",
};

export function EndpointCard({
  method,
  endpoint,
  description,
  parameters,
  requestExample,
  responseExample,
  errorCodes,
}: EndpointCardProps) {
  return (
    <Card className="overflow-hidden border-l-4" style={{
      borderLeftColor: method === 'POST' ? 'hsl(var(--primary))' : 
                       method === 'GET' ? 'hsl(142, 76%, 36%)' : 
                       method === 'PUT' ? 'hsl(24, 95%, 53%)' : 
                       'hsl(0, 84%, 60%)'
    }}>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <Badge className={cn("font-mono font-bold", methodColors[method])}>
            {method}
          </Badge>
          <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded">
            {endpoint}
          </code>
        </div>
        <CardTitle className="text-xl">{description}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {parameters && parameters.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Parâmetros</h4>
            <ParameterTable parameters={parameters} />
          </div>
        )}

        {requestExample && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Exemplo de Request</h4>
            <CodeBlock
              code={requestExample}
              language={requestExample.startsWith('curl') ? 'bash' : 'json'}
              title="Request"
            />
          </div>
        )}

        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Exemplo de Response</h4>
          <CodeBlock
            code={responseExample}
            language="json"
            title="Response (200 OK)"
          />
        </div>

        {errorCodes && errorCodes.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-semibold">Códigos de Erro Comuns:</p>
              <ul className="space-y-1 text-sm">
                {errorCodes.map((error) => (
                  <li key={error.code}>
                    <code className="bg-muted px-1.5 py-0.5 rounded">{error.code}</code>
                    {" "}- {error.message}: {error.solution}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}