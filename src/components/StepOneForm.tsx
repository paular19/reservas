'use client';

import React, { useEffect, useState } from 'react';
import { BookingForm } from '@/app/lib/hooks/useBookingForm';
import { parseISO, isSameDay } from 'date-fns';
import { obtenerFechasOcupadas } from '@/app/lib/reservas';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface StepOneFormProps {
  form: BookingForm;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onNext: () => void;
  setForm: React.Dispatch<React.SetStateAction<BookingForm>>;
}

const StepOneForm: React.FC<StepOneFormProps> = ({ 
  form, 
  handleChange, 
  onNext, 
  setForm 
}) => {
  const [fechasOcupadas, setFechasOcupadas] = useState<Date[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [errorDates, setErrorDates] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: form.fechaIngreso ? parseISO(form.fechaIngreso) : undefined,
    to: form.fechaSalida ? parseISO(form.fechaSalida) : undefined,
  });

  useEffect(() => {
    const cargarFechasOcupadas = async () => {
      if (!form.unidad) return;
      
      setLoadingDates(true);
      setErrorDates(null);
      
      try {
        const fechasOcupadasData = await obtenerFechasOcupadas(form.unidad);
        
        const ocupadas: Date[] = [];
        fechasOcupadasData.forEach(item => {
          const start = parseISO(item.fechaInicio);
          const end = parseISO(item.fechaFin);
          let current = new Date(start);
          
          while (current <= end) {
            ocupadas.push(new Date(current));
            current.setDate(current.getDate() + 1);
          }
        });
        
        setFechasOcupadas(ocupadas);
      } catch (error) {
        console.error('Error cargando fechas ocupadas:', error);
        setErrorDates('No se pudieron cargar las fechas ocupadas. Por favor intenta nuevamente.');
      } finally {
        setLoadingDates(false);
      }
    };

    cargarFechasOcupadas();
  }, [form.unidad]);

  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) return;
    
    setDateRange(range);
    setForm(prev => ({
      ...prev,
      fechaIngreso: range.from ? range.from.toISOString().split('T')[0] : '',
      fechaSalida: range.to ? range.to.toISOString().split('T')[0] : '',
    }));
  };

  const isDateDisabled = (date: Date) => {
    return fechasOcupadas.some(ocupada => isSameDay(ocupada, date)) || 
           date < new Date(new Date().setHours(0, 0, 0, 0));
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Fechas y unidad</h3>
      
      {errorDates && (
        <Alert variant="destructive">
          <AlertDescription>{errorDates}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {/* Contenedor principal para los selectores en fila */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          {/* Selector de Unidad */}
          <div className="flex-1 min-w-[180px]">
            <Select 
              value={form.unidad} 
              onValueChange={(value) => handleChange({ target: { name: 'unidad', value } } as any)}
              disabled={loadingDates}
            >
              <SelectTrigger className="w-full">
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

          {/* Selector de Tipo de Reserva (solo para habitaciones este/oeste) */}
          {(form.unidad === 'este' || form.unidad === 'oeste') && (
            <div className="flex-1 min-w-[180px]">
              <Select
                value={form.tipoReserva}
                onValueChange={(value) => handleChange({ target: { name: 'tipoReserva', value } } as any)}
                disabled={loadingDates}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipo de reserva" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cama_individual">Cama individual</SelectItem>
                  <SelectItem value="habitacion_completa">Habitación completa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Input de Cantidad de Personas (solo para camping o camas individuales) */}
          {(form.tipoReserva === 'cama_individual' || form.unidad === 'camping') && (
            <div className="flex-1 min-w-[180px]">
              <Input
                type="number"
                name="cantidadPersonas"
                value={form.cantidadPersonas}
                onChange={handleChange}
                min={1}
                max={form.unidad === 'camping' ? 50 : 4}
                disabled={loadingDates}
                placeholder="Cantidad de personas"
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Calendario */}
        <div className="space-y-2 pt-4">
          <label className="text-sm font-medium leading-none">
            Fechas de estadía
          </label>
          {loadingDates ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              <span>Cargando fechas disponibles...</span>
            </div>
          ) : (
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              numberOfMonths={2}
              className="rounded-md border p-2"
            />
          )}
        </div>
      </div>

      <Button 
        onClick={onNext} 
        disabled={!form.fechaIngreso || !form.fechaSalida || loadingDates}
        className="w-full mt-4"
      >
        {loadingDates ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando...
          </>
        ) : 'Continuar'}
      </Button>
    </div>
  );
};

export default StepOneForm;