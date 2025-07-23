'use client';

import { useState, useEffect } from 'react';

export type BookingFormValues = {
  nombreCompleto: string;
  email: string;
  telefono: string;
  fechaIngreso: string;
  fechaSalida: string;
  unidad: 'este' | 'oeste' | 'cabana' | 'camping';
  tipoReserva: 'cama_individual' | 'habitacion_completa' | 'cabana_completa' | 'camping';
  cantidadPersonas: number;
  desayuno: boolean;
  almuerzo: boolean;
};

const initialFormState: BookingFormValues = {
  nombreCompleto: '',
  email: '',
  telefono: '',
  fechaIngreso: '',
  fechaSalida: '',
  unidad: 'este',
  tipoReserva: 'cama_individual',
  cantidadPersonas: 1,
  desayuno: false,
  almuerzo: false,
};

export const useBookingForm = () => {
  const [form, setForm] = useState<BookingFormValues>(initialFormState);

  useEffect(() => {
    if (form.unidad === 'cabana') {
      setForm((f) => ({ ...f, tipoReserva: 'cabana_completa' }));
    } else if (form.unidad === 'camping') {
      setForm((f) => ({ ...f, tipoReserva: 'camping' }));
    } else if (form.unidad === 'este' || form.unidad === 'oeste') {
      if (
        form.tipoReserva !== 'cama_individual' &&
        form.tipoReserva !== 'habitacion_completa'
      ) {
        setForm((f) => ({ ...f, tipoReserva: 'cama_individual' }));
      }
    }
  }, [form.unidad]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : name === 'cantidadPersonas'
        ? Number(value)
        : value;

    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const calculateNights = () => {
    if (form.fechaIngreso && form.fechaSalida) {
      const inDate = new Date(form.fechaIngreso);
      const outDate = new Date(form.fechaSalida);
      const diff = outDate.getTime() - inDate.getTime();
      return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
    }
    return 0;
  };

  const getRoomPrice = () => {
    if (form.unidad === 'cabana') return 20000;
    if (form.unidad === 'camping') return 5000;
    if (form.tipoReserva === 'habitacion_completa') return 15000;
    return 8000;
  };

  const getTotal = () => {
    // Todo : this should be refactored to use a more robust pricing strategy
    const nights = calculateNights();
    const base = nights * getRoomPrice();
    const extras = (form.desayuno ? 2000 : 0) + (form.almuerzo ? 3000 : 0);
    const personas =
      form.tipoReserva === 'cama_individual' || form.unidad === 'camping'
        ? form.cantidadPersonas
        : 1;
    return (base + extras) * personas;
  };

  return {
    form,
    setForm,
    handleChange,
    calculateNights,
    getRoomPrice,
    getTotal,
  };
};
