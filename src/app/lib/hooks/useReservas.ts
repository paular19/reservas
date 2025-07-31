// hooks/useReservas.ts
import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { eliminarReserva } from '../reservas';

export type Reserva = {
  id: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  fechaIngreso: string;
  fechaSalida: string;
  unidad: string;
  tipoReserva: string;
  cantidadPersonas: number;
  desayuno: boolean;
  almuerzo: boolean;
};

export function useReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);

  const cargarReservas = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'reservas'));
      const hoy = new Date();

      const reservasValidas: Reserva[] = [];
      const reservasVencidas: string[] = [];

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as Omit<Reserva, 'id'>;
        const fechaSalida = new Date(data.fechaSalida);
        if (fechaSalida < hoy) {
          reservasVencidas.push(doc.id);
        } else {
          reservasValidas.push({ id: doc.id, ...data });
        }
      });

      for (const id of reservasVencidas) {
        await eliminarReserva(id);
      }

      reservasValidas.sort((a, b) => new Date(a.fechaIngreso).getTime() - new Date(b.fechaIngreso).getTime());

      setReservas(reservasValidas);
    } finally {
      setLoading(false);
    }
  };

  return { reservas, loading, cargarReservas, setReservas };
}
