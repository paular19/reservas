// app/admin/bloqueos/form.tsx
'use client';

import { useState, useEffect } from 'react';
import { validarYCrearBloqueo, obtenerBloqueos, obtenerFechasBloqueadasPorCabana } from '@/app/lib/bloqueos';
import type { BlockInput, BlockOutput } from '@/types/bloqueos';
import { addDays, isBefore, isAfter, isSameDay, parseISO } from 'date-fns';
import { toast } from 'sonner';

// shadcn components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BLOQUEO_INICIAL: BlockInput = {
  unidad: 'este',
  fechaInicio: '',
  fechaFin: '',
  tipoBloqueo: 'bloqueo_total',
  cantidadBloqueada: undefined,
  motivo: ''
};

export function FormularioBloqueo({ onSuccess }: { onSuccess?: () => void }) {
  const [form, setForm] = useState<BlockInput>(BLOQUEO_INICIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bloqueosExistentes, setBloqueosExistentes] = useState<BlockOutput[]>([]);
  const [fechasOcupadas, setFechasOcupadas] = useState<Date[]>([]);

  // Obtener bloqueos existentes al cargar y cuando cambia la unidad
  useEffect(() => {
    const cargarBloqueos = async () => {
      try {
        const bloqueos = await obtenerBloqueos();
        setBloqueosExistentes(bloqueos);
        
        // Calcular fechas ocupadas para la unidad seleccionada
        const bloqueosUnidad = bloqueos.filter(b => b.unidad === form.unidad);
        const ocupadas: Date[] = [];
        
        bloqueosUnidad.forEach(bloqueo => {
          const start = parseISO(bloqueo.fechaInicio);
          const end = parseISO(bloqueo.fechaFin);
          let current = new Date(start);
          
          while (current <= end) {
            ocupadas.push(new Date(current));
            current.setDate(current.getDate() + 1);
          }
        });

         if (form.unidad === 'cabana') {
        const fechasCabaña = await obtenerFechasBloqueadasPorCabana();
        fechasCabaña.forEach(f => {
          ocupadas.push(parseISO(f));
        });
      }
        
        setFechasOcupadas(ocupadas);
      } catch (err) {
        console.error('Error cargando bloqueos:', err);
      }
    };
    
    cargarBloqueos();
  }, [form.unidad]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'cantidadBloqueada' ? (value ? Number(value) : undefined) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'tipoBloqueo' && value === 'bloqueo_total' ? { cantidadBloqueada: undefined } : {}),
      ...(name === 'unidad' ? { fechaInicio: '', fechaFin: '' } : {}) // Reset fechas al cambiar unidad
    }));
  };

  const handleFechaInicioChange = (date: Date | undefined) => {
    if (!date) return;
    
    setForm(prev => ({
      ...prev,
      fechaInicio: date.toISOString().split('T')[0],
      ...(form.fechaFin && isAfter(date, parseISO(form.fechaFin)) ? { fechaFin: '' } : {})
    }));
  };

  const handleFechaFinChange = (date: Date | undefined) => {
    if (!date) return;
    
    setForm(prev => ({
      ...prev,
      fechaFin: date.toISOString().split('T')[0]
    }));
  };

  // Función para determinar si una fecha está ocupada
  const isFechaOcupada = (date: Date) => {
    return fechasOcupadas.some(fechaOcupada => isSameDay(fechaOcupada, date));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await validarYCrearBloqueo(form);
      setForm(BLOQUEO_INICIAL);
      toast.success('Bloqueo creado correctamente');
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear bloqueo';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Crear nuevo bloqueo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campo Unidad */}
            <div className="space-y-2">
              <Label htmlFor="unidad">Unidad</Label>
              <Select 
                value={form.unidad} 
                onValueChange={(value) => handleSelectChange('unidad', value)}
                required
              >
                <SelectTrigger id="unidad">
                  <SelectValue placeholder="Seleccione una unidad" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="este">Habitación Este</SelectItem>
                    <SelectItem value="oeste">Habitación Oeste</SelectItem>
                    <SelectItem value="cabana">Cabaña Completa</SelectItem>
                    <SelectItem value="camping">Camping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo Tipo de Bloqueo */}
            <div className="space-y-2">
              <Label htmlFor="tipoBloqueo">Tipo de Bloqueo</Label>
              <Select 
                value={form.tipoBloqueo} 
                onValueChange={(value) => handleSelectChange('tipoBloqueo', value)}
                required
              >
                <SelectTrigger id="tipoBloqueo">
                  <SelectValue placeholder="Seleccione tipo de bloqueo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bloqueo_total">Bloqueo Total</SelectItem>
                  <SelectItem value="bloqueo_parcial">Bloqueo Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo Fecha de Inicio */}
            <div className="space-y-2">
              <Label>Fecha de Inicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.fechaInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.fechaInicio ? (
                      parseISO(form.fechaInicio).toLocaleDateString()
                    ) : (
                      <span>Inicio</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.fechaInicio ? parseISO(form.fechaInicio) : undefined}
                    onSelect={handleFechaInicioChange}
                    disabled={(date) => 
                      date < new Date() || isFechaOcupada(date)
                    }
                    initialFocus
                    required
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Campo Fecha de Fin */}
            <div className="space-y-2">
              <Label>Fecha de Fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.fechaFin && "text-muted-foreground"
                    )}
                    disabled={!form.fechaInicio}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.fechaFin ? (
                      parseISO(form.fechaFin).toLocaleDateString()
                    ) : (
                      <span>Fin</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.fechaFin ? parseISO(form.fechaFin) : undefined}
                    onSelect={handleFechaFinChange}
                    disabled={(date) => 
                      date < (form.fechaInicio ? parseISO(form.fechaInicio) : new Date()) || 
                      isFechaOcupada(date)
                    }
                    initialFocus
                    required
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Campo Cantidad Bloqueada (solo para bloqueos parciales) */}
            {form.tipoBloqueo === 'bloqueo_parcial' && (
              <div className="space-y-2">
                <Label htmlFor="cantidadBloqueada">Cantidad Bloqueada</Label>
                <Input
                  type="number"
                  id="cantidadBloqueada"
                  name="cantidadBloqueada"
                  value={form.cantidadBloqueada || ''}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>
            )}

            {/* Campo Motivo */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="motivo">Motivo (Opcional)</Label>
              <Input
                type="text"
                id="motivo"
                name="motivo"
                value={form.motivo || ''}
                onChange={handleChange}
                placeholder="Razón del bloqueo"
              />
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}


          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(BLOQUEO_INICIAL);
                setError(null);
                onSuccess?.();
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : 'Guardar Bloqueo'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </div>
  );
}