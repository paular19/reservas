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

// Alias for backward compatibility
export type BookingForm = BookingFormValues;