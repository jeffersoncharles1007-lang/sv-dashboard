'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PipelineFunnel } from '@/lib/metrics';

interface FunnelTableProps {
  funnel: PipelineFunnel[];
}

export function FunnelTable({ funnel }: FunnelTableProps) {
  const total = funnel.reduce((sum, stage) => sum + stage.count, 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Vendas - Pipeline Orçamentos</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estágio</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">% do Total</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {funnel.map((stage, index) => {
              const percentage = total > 0 ? (stage.count / total) * 100 : 0;
              return (
                <TableRow key={stage.stage}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-blue-500' :
                          index === 1 ? 'bg-blue-400' :
                          index === 2 ? 'bg-blue-300' :
                          index === 3 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="font-medium">{stage.stage}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {stage.count}
                  </TableCell>
                  <TableCell className="text-right">
                    {percentage.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {stage.value.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="font-bold bg-muted/50">
              <TableCell>TOTAL</TableCell>
              <TableCell className="text-right">{total}</TableCell>
              <TableCell className="text-right">100%</TableCell>
              <TableCell className="text-right">
                {funnel.reduce((sum, s) => sum + s.value, 0).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
