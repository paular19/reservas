'use client';

import React from 'react';
import { Wallet } from '@mercadopago/sdk-react';
import { Clock, Loader2 } from 'lucide-react';
import { BookingForm } from '@/app/lib/hooks/useBookingForm';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

interface StepThreeSummaryProps {
  form: BookingForm;
  calculateNights: () => number;
  getTotal: () => number;
  onPrev: () => void;
  loading: boolean;
  showWallet: boolean;
  preferenceId: string | null;
}

const StepThreeSummary: React.FC<StepThreeSummaryProps> = ({
  form,
  calculateNights,
  getTotal,
  onPrev,
  loading,
  showWallet,
  preferenceId,
}) => (
  <Card>
    <CardHeader>
      <h3 className="text-xl font-semibold">Resumen</h3>
    </CardHeader>

    <CardContent className="space-y-4">
      <div className="space-y-2 text-sm">
        <p><strong>Fechas:</strong> {form.fechaIngreso} a {form.fechaSalida} ({calculateNights()} noches)</p>
        <p><strong>Unidad:</strong> {form.unidad}</p>
        {form.tipoReserva && <p><strong>Tipo de reserva:</strong> {form.tipoReserva}</p>}
        <p><strong>Personas:</strong> {form.cantidadPersonas}</p>
        <p><strong>Extras:</strong> 
          {form.desayuno ? ' Desayuno' : ''} 
          {form.almuerzo ? ' Almuerzo' : ''}
          {!form.desayuno && !form.almuerzo ? ' Ninguno' : ''}
        </p>
        <p className="text-lg font-bold mt-2">Total: ${getTotal().toLocaleString()}</p>
      </div>

      {/* Componente Wallet de Mercado Pago sin modificaciones */}
      {showWallet && preferenceId && (
        <div className="mt-6">
          <Wallet initialization={{ preferenceId }} />
        </div>
      )}
    </CardContent>

    <CardFooter className="flex flex-col gap-4">
      <Button 
        variant="outline" 
        onClick={onPrev} 
        className="w-full"
      >
        Volver
      </Button>
      
      <Button 
        type="submit" 
        className="w-full bg-[#00B1EA] hover:bg-[#0098CF]"
      >
        Medios de pago
      </Button>
    </CardFooter>
  </Card>
);

export default StepThreeSummary;