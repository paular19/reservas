'use client';

import { useState } from 'react';
import { BookingFormValues } from './useBookingForm';

export const useMP = () => {
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showWallet, setShowWallet] = useState(false);

  const createPreference = async (form: BookingFormValues) => {
    if (form.fechaSalida <= form.fechaIngreso) {
      alert('La fecha de salida debe ser posterior a la de ingreso.');
      return null;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/mercadopago/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.preferenceId) {
        setPreferenceId(data.preferenceId);
        setShowWallet(true);
        return data.preferenceId;
      } else {
        alert('No se recibió el preferenceId.');
        return null;
      }
    } catch (error) {
      console.error('Error al conectar con Mercado Pago:', error);
      alert('Error al conectar con Mercado Pago.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    preferenceId,
    loading,
    showWallet,
    createPreference,
  };
};
