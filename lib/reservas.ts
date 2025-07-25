// ✅ reservas.ts - Backend con desayuno, almuerzo, edición y eliminación

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import { obtenerBloqueosSuperpuestos, validarContraBloqueos } from './bloqueos';

export type Unidad = "este" | "oeste" | "cabana" | "camping";
export type TipoReserva = "cama_individual" | "habitacion_completa" | "cabana_completa" | "camping";

const capacidades = {
  este: 4,
  oeste: 4,
  cabana: 8,
  camping: 50,
} as const;

export type DatosReserva = {
  nombreCompleto: string;
  email: string;
  telefono: string;
  fechaIngreso: string;
  fechaSalida: string;
  unidad: Unidad;
  tipoReserva: TipoReserva;
  cantidadPersonas: number;
  desayuno: boolean;
  almuerzo: boolean;
};

function seSuperpone(inicio1: string, fin1: string, inicio2: string, fin2: string): boolean {
  return inicio1 < fin2 && inicio2 < fin1;
}

export async function crearReservaConReglas(datos: DatosReserva) {
  const {
    nombreCompleto,
    email,
    telefono,
    fechaIngreso,
    fechaSalida,
    unidad,
    tipoReserva,
    cantidadPersonas,
    desayuno,
    almuerzo,
  } = datos;

  const bloqueos = await obtenerBloqueosSuperpuestos(unidad, fechaIngreso, fechaSalida);
  validarContraBloqueos(bloqueos, cantidadPersonas);

  const reservasRef = collection(db, "reservas");
  const snapshot = await getDocs(reservasRef);
  const reservas = snapshot.docs.map((doc) => doc.data());

  const reservasSuperpuestas = reservas.filter((r: any) =>
    seSuperpone(fechaIngreso, fechaSalida, r.fechaIngreso, r.fechaSalida)
  );

  if (unidad === "cabana") {
    const algunaReserva = reservasSuperpuestas.some(
      (r) => r.unidad === "este" || r.unidad === "oeste" || r.unidad === "cabana"
    );
    if (algunaReserva) {
      throw new Error("No se puede reservar la cabaña completa porque ya hay reservas.");
    }
    if (cantidadPersonas > capacidades.cabana) {
      throw new Error("Cantidad supera la capacidad de la cabaña.");
    }

  } else if (unidad === "este" || unidad === "oeste") {
    const cabanaReservada = reservasSuperpuestas.some((r) =>
      r.unidad === "cabana" && (r.tipoReserva?.toLowerCase?.() === "cabana_completa")
    );

    if (cabanaReservada) {
      throw new Error("No se puede reservar esta habitación porque la cabaña está reservada.");
    }

    const reservasEnHabitacion = reservasSuperpuestas.filter((r) => r.unidad === unidad);
    let camasOcupadas = 0;
    let habitacionCompletaReservada = false;

    reservasEnHabitacion.forEach((r) => {
      if (r.tipoReserva === "habitacion_completa") habitacionCompletaReservada = true;
      else if (r.tipoReserva === "cama_individual") camasOcupadas += r.cantidadPersonas || 0;
    });

    if (tipoReserva === "habitacion_completa") {
      if (habitacionCompletaReservada || camasOcupadas > 0) {
        throw new Error(`La habitación ${unidad} ya está ocupada.`);
      }
    } else if (tipoReserva === "cama_individual") {
      if (habitacionCompletaReservada) {
        throw new Error(`La habitación ${unidad} está reservada completa.`);
      }
      if (camasOcupadas + cantidadPersonas > capacidades[unidad]) {
        throw new Error(`No hay camas suficientes en ${unidad}.`);
      }
    }

  } else if (unidad === "camping") {
    const totalCamping = reservasSuperpuestas
      .filter((r) => r.unidad === "camping")
      .reduce((acc, r) => acc + (r.cantidadPersonas || 0), 0);

    if (totalCamping + cantidadPersonas > capacidades.camping) {
      throw new Error("No hay espacio suficiente en el camping.");
    }
  }

  const docRef = await addDoc(reservasRef, {
    nombreCompleto,
    email,
    telefono,
    fechaIngreso,
    fechaSalida,
    unidad,
    tipoReserva,
    cantidadPersonas,
    desayuno,
    almuerzo,
    pagado: false,
    creado: new Date(),
  });

  return docRef.id;
}

export async function eliminarReserva(id: string) {
  const docRef = doc(db, "reservas", id);
  await deleteDoc(docRef);
}

export async function editarReserva(id: string, datos: Partial<DatosReserva>) {
  const docRef = doc(db, "reservas", id);
  await updateDoc(docRef, datos);
}

export async function crearReservaWebhook(data: {
  nombreCompleto: string;
  email: string;
  telefono: string;
  fechaIngreso: string;
  fechaSalida: string;
  unidad: Unidad;
  pagado: boolean;
}) {
  const docRef = await addDoc(collection(db, "reservas"), {
    ...data,
    cantidadPersonas: 0,
    desayuno: false,
    almuerzo: false,
    creado: new Date(),
  });

  return docRef.id;
}
