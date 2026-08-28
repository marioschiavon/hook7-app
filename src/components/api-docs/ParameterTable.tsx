import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

interface ParameterTableProps {
  parameters: Parameter[];
}

export function ParameterTable({ parameters }: ParameterTableProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Parâmetro</TableHead>
            <TableHead className="w-[120px]">Tipo</TableHead>
            <TableHead className="w-[120px]">Obrigatório</TableHead>
            <TableHead>Descrição</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parameters.map((param) => (
            <TableRow key={param.name}>
              <TableCell className="font-mono text-sm font-semibold">
                {param.name}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-xs">
                  {param.type}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={param.required ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {param.required ? "Sim" : "Não"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-foreground/80">
                {param.description}
                {param.example && (
                  <code className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">
                    ex: {param.example}
                  </code>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}