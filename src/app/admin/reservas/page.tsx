// app/admin/reservas/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  obtenerReservas,
  eliminarReserva,
  actualizarReserva,
} from "@/app/lib/reservas";
import { Unidad, TipoReserva, ReservaOutput } from "@/types/reservas";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import FormReserva from "../components/FormReserva";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function PanelReservas() {
  const [reservas, setReservas] = useState<ReservaOutput[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [filtroUnidad, setFiltroUnidad] = useState<Unidad | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reservasPorPagina = 10;

  useEffect(() => {
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerReservas();
      const hoy = new Date();
      const reservasValidas = data.filter(
        (r) => new Date(r.fechaSalida) >= hoy
      );
      reservasValidas.sort(
        (a, b) =>
          new Date(a.fechaIngreso).getTime() -
          new Date(b.fechaIngreso).getTime()
      );
      setReservas(reservasValidas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reservas");
    } finally {
      setLoading(false);
    }
  };

  const handleEditarClick = (reserva: ReservaOutput) => {
    setEditingId(reserva.id);
  };

  const handleGuardar = async (data: Partial<ReservaOutput>) => {
    if (!editingId) return;

    setLoading(true);
    setError(null);

    try {
      await actualizarReserva(editingId, data);
      setEditingId(null);
      await cargarReservas();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar reserva"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta reserva?")) return;

    setLoading(true);
    setError(null);

    try {
      await eliminarReserva(id);
      await cargarReservas();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al eliminar reserva"
      );
    } finally {
      setLoading(false);
    }
  };

  const reservasFiltradas = filtroUnidad
    ? reservas.filter((r) => r.unidad === filtroUnidad)
    : reservas;

  const totalPaginas = Math.ceil(reservasFiltradas.length / reservasPorPagina);
  const reservasPaginadas = reservasFiltradas.slice(
    (paginaActual - 1) * reservasPorPagina,
    paginaActual * reservasPorPagina
  );

  const formatFecha = (fecha: string) => {
    return format(new Date(fecha), "PPP", { locale: es });
  };

  const getBadgeVariant = (unidad: Unidad) => {
    switch (unidad) {
      case "este":
        return "default";
      case "oeste":
        return "secondary";
      case "cabana":
        return "destructive";
      case "camping":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Panel de Reservas</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Controles */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Button onClick={cargarReservas} disabled={loading}>
              {loading ? "Cargando..." : "Actualizar Reservas"}
            </Button>

            <Select
              value={filtroUnidad || undefined}
              onValueChange={(value: Unidad) => {
                setFiltroUnidad(value);
                setPaginaActual(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas las unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="este">Habitación Este</SelectItem>
                <SelectItem value="oeste">Habitación Oeste</SelectItem>
                <SelectItem value="cabana">Cabaña Completa</SelectItem>
                <SelectItem value="camping">Camping</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mensaje de error */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tabla de reservas */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fechas</TableHead>
                  <TableHead className="text-center">Personas</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && reservas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Cargando reservas...
                    </TableCell>
                  </TableRow>
                ) : reservasPaginadas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No hay reservas{" "}
                      {filtroUnidad ? `para ${filtroUnidad}` : ""}
                    </TableCell>
                  </TableRow>
                ) : (
                  reservasPaginadas.map((reserva) => (
                    <TableRow key={reserva.id}>
                      <TableCell className="font-medium">
                        {reserva.nombreCompleto}
                      </TableCell>
                      <TableCell>
                        <div>{reserva.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {reserva.telefono}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getBadgeVariant(reserva.unidad)}
                          className="capitalize"
                        >
                          {reserva.unidad}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {reserva.tipoReserva === "cama_individual" &&
                          "Cama Individual"}
                        {reserva.tipoReserva === "habitacion_completa" &&
                          "Habitación Completa"}
                        {reserva.tipoReserva === "cabana_completa" &&
                          "Cabaña Completa"}
                        {reserva.tipoReserva === "camping" && "Camping"}
                      </TableCell>
                      <TableCell>
                        <div>Ingreso: {formatFecha(reserva.fechaIngreso)}</div>
                        <div>Salida: {formatFecha(reserva.fechaSalida)}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        {reserva.cantidadPersonas}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditarClick(reserva)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleEliminar(reserva.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {reservasFiltradas.length > 0 && (
            <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {(paginaActual - 1) * reservasPorPagina + 1}-
                {Math.min(
                  paginaActual * reservasPorPagina,
                  reservasFiltradas.length
                )}{" "}
                de {reservasFiltradas.length} reservas
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPaginaActual((p) => Math.max(1, p - 1));
                      }}
                      hidden={paginaActual === 1}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(
                    (page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPaginaActual(page);
                          }}
                          isActive={page === paginaActual}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPaginaActual((p) => Math.min(totalPaginas, p + 1));
                      }}
                      hidden={paginaActual === totalPaginas}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edición */}
      {editingId && (
        <FormReserva
          reserva={reservas.find((r) => r.id === editingId)}
          onSave={handleGuardar}
          onCancel={() => setEditingId(null)}
          loading={loading}
        />
      )}
    </div>
  );
}
