'use client';

import { useState, useEffect } from 'react';

export type BookingFormValues = {
  fullName: string;
  email: string;
  phone: string;
  checkInDate: string;
  checkOutDate: string;
  unit: 'east' | 'west' | 'cabin' | 'camping';
  bookingType: 'single_bed' | 'full_room' | 'full_cabin' | 'camping';
  numberOfPeople: number;
  breakfast: boolean;
  lunch: boolean;
};

const initialFormState: BookingFormValues = {
  fullName: '',
  email: '',
  phone: '',
  checkInDate: '',
  checkOutDate: '',
  unit: 'east',
  bookingType: 'single_bed',
  numberOfPeople: 1,
  breakfast: false,
  lunch: false,
};

export const useBookingForm = () => {
  const [form, setForm] = useState<BookingFormValues>(initialFormState);

  useEffect(() => {
    if (form.unit === 'cabin') {
      setForm((f) => ({
        ...f,
        bookingType: 'full_cabin',
        numberOfPeople: 8, // fixed capacity for cabin
      }));
    } else if (form.unit === 'camping') {
      setForm((f) => ({
        ...f,
        bookingType: 'camping',
        // numberOfPeople can change for camping
      }));
    } else if (form.unit === 'east' || form.unit === 'west') {
      if (
        form.bookingType !== 'single_bed' &&
        form.bookingType !== 'full_room'
      ) {
        setForm((f) => ({ ...f, bookingType: 'single_bed' }));
      }
      // Fixed capacity for full rooms
      if (form.bookingType === 'full_room') {
        const capacity = form.unit === 'east' ? 4 : 4; // or capacities.east/west if exported
        setForm((f) => ({
          ...f,
          numberOfPeople: capacity,
        }));
      }
    }
  }, [form.unit, form.bookingType]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : name === 'numberOfPeople'
        ? Number(value)
        : value;

    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const calculateNights = () => {
    if (form.checkInDate && form.checkOutDate) {
      const inDate = new Date(form.checkInDate);
      const outDate = new Date(form.checkOutDate);
      const diff = outDate.getTime() - inDate.getTime();
      return diff > 0
        ? Math.ceil(diff / (1000 * 60 * 60 * 24))
        : 0;
    }
    return 0;
  };

  const getRoomPrice = () => {
    if (form.unit === 'cabin') return 20000;
    if (form.unit === 'camping') return 5000;
    if (form.bookingType === 'full_room') return 15000;
    return 8000;
  };

  const getTotal = () => {
    // TODO: Refactor to use a more robust pricing strategy
    const nights = calculateNights();
    const base = nights * getRoomPrice();
    const extras =
      (form.breakfast ? 2000 : 0) + (form.lunch ? 3000 : 0);
    const people =
      form.bookingType === 'single_bed' || form.unit === 'camping'
        ? form.numberOfPeople
        : 1;
    return (base + extras) * people;
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

export type BookingForm = BookingFormValues;























// 'use client';

// import { useState, useEffect } from 'react';


// export type BookingFormValues = {
//   nombreCompleto: string;
//   email: string;
//   telefono: string;
//   fechaIngreso: string;
//   fechaSalida: string;
//   unidad: 'este' | 'oeste' | 'cabana' | 'camping';
//   tipoReserva: 'cama_individual' | 'habitacion_completa' | 'cabana_completa' | 'camping';
//   cantidadPersonas: number;
//   desayuno: boolean;
//   almuerzo: boolean;
// };


// const initialFormState: BookingFormValues = {
//   nombreCompleto: '',
//   email: '',
//   telefono: '',
//   fechaIngreso: '',
//   fechaSalida: '',
//   unidad: 'este',
//   tipoReserva: 'cama_individual',
//   cantidadPersonas: 1,
//   desayuno: false,
//   almuerzo: false,
// };

// export const useBookingForm = () => {
//   const [form, setForm] = useState<BookingFormValues>(initialFormState);

//   useEffect(() => {
//     if (form.unidad === 'cabana') {
//       setForm((f) => ({ ...f, tipoReserva: 'cabana_completa' }));
//     } else if (form.unidad === 'camping') {
//       setForm((f) => ({ ...f, tipoReserva: 'camping' }));
//     } else if (form.unidad === 'este' || form.unidad === 'oeste') {
//       if (
//         form.tipoReserva !== 'cama_individual' &&
//         form.tipoReserva !== 'habitacion_completa'
//       ) {
//         setForm((f) => ({ ...f, tipoReserva: 'cama_individual' }));
//       }
//     }
//   }, [form.unidad]);

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
//   ) => {
//     const { name, value, type } = e.target;
//     const newValue =
//       type === 'checkbox'
//         ? (e.target as HTMLInputElement).checked
//         : name === 'cantidadPersonas'
//         ? Number(value)
//         : value;

//     setForm((prev) => ({
//       ...prev,
//       [name]: newValue,
//     }));
//   };

//   const calculateNights = () => {
//     if (form.fechaIngreso && form.fechaSalida) {
//       const inDate = new Date(form.fechaIngreso);
//       const outDate = new Date(form.fechaSalida);
//       const diff = outDate.getTime() - inDate.getTime();
//       return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
//     }
//     return 0;
//   };

//   const getRoomPrice = () => {
//     if (form.unidad === 'cabana') return 20000;
//     if (form.unidad === 'camping') return 5000;
//     if (form.tipoReserva === 'habitacion_completa') return 15000;
//     return 8000;
//   };

//   const getTotal = () => {
//     // Todo : this should be refactored to use a more robust pricing strategy
//     const nights = calculateNights();
//     const base = nights * getRoomPrice();
//     const extras = (form.desayuno ? 2000 : 0) + (form.almuerzo ? 3000 : 0);
//     const personas =
//       form.tipoReserva === 'cama_individual' || form.unidad === 'camping'
//         ? form.cantidadPersonas
//         : 1;
//     return (base + extras) * personas;
//   };

//   return {
//     form,
//     setForm,
//     handleChange,
//     calculateNights,
//     getRoomPrice,
//     getTotal,
//   };
// };

// export type BookingForm = BookingFormValues;
