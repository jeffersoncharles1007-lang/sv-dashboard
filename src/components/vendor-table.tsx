'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VendorPerformance } from '@/lib/metrics';

interface VendorTableProps {
  vendors: VendorPerformance[];
}

export function VendorTable({ vendors }: VendorTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Vendedor</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Ganhos</TableHead>
              <TableHead className="text-right">Perdidos</TableHead>
              <TableHead className="text-right">Taxa Conversão</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-right">Valor Ganho</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.vendorId}>
                <TableCell className="font-medium">{vendor.vendorName}</TableCell>
                <TableCell className="text-right">{vendor.totalOpportunities}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="default" className="bg-green-500">
                    {vendor.wonOpportunities}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="destructive">
                    {vendor.lostOpportunities}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={vendor.conversionRate >= 50 ? 'default' : 'secondary'}
                    className={vendor.conversionRate >= 50 ? 'bg-blue-500' : ''}
                  >
                    {vendor.conversionRate.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {vendor.totalValue.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </TableCell>
                <TableCell className="text-right text-green-600 font-medium">
                  {vendor.wonValue.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
