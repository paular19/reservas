// app/admin/bloqueos/components/TablaBloqueos.tsx
import type { BlockOutput } from '@/types/bloqueos';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface TablaBloqueosProps {
  data: BlockOutput[];
  onDelete: (id: string) => void;
}

export function TablaBloqueos({ data, onDelete }: TablaBloqueosProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unidad</TableHead>
            <TableHead>Inicio</TableHead>
            <TableHead>Fin</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium capitalize">{b.unidad}</TableCell>
              <TableCell>{b.fechaInicio}</TableCell>
              <TableCell>{b.fechaFin}</TableCell>
              <TableCell>{b.tipoBloqueo}</TableCell>
              <TableCell>{b.tipoBloqueo === 'bloqueo_parcial' ? b.cantidadBloqueada : '-'}</TableCell>
              <TableCell>{b.motivo}</TableCell>
              <TableCell className="text-right">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará permanentemente el bloqueo y no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => onDelete(b.id!)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}