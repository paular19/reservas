// lib/bloqueos.ts
import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { Unidad } from './reservas';

export type TipoBloqueo = 'bloqueo_total' | 'bloqueo_parcial';

export interface Bloqueo {
  unidad: Unidad;
  fechaInicio: string;
  fechaFin: string;
  tipoBloqueo: TipoBloqueo;
  cantidadBloqueada?: number;
  motivo?: string;
  creado?: Date;
}

export interface BloqueoConId extends Bloqueo {
  id: string;
}

function mapBloqueoDoc(doc: QueryDocumentSnapshot<DocumentData>): BloqueoConId {
  const data = doc.data();
  return {
    id: doc.id,
    unidad: data.unidad,
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin,
    tipoBloqueo: data.tipoBloqueo,
    cantidadBloqueada: data.cantidadBloqueada,
    motivo: data.motivo,
    creado: data.creado?.toDate?.() ?? undefined,
  };
}

export async function obtenerBloqueos(): Promise<BloqueoConId[]> {
  const snapshot = await getDocs(collection(db, 'bloqueos'));
  return snapshot.docs.map(mapBloqueoDoc);
}

export async function agregarBloqueo(bloqueo: Bloqueo): Promise<string> {
  // Normalizamos fechas como string 'YYYY-MM-DD'
  const fechaInicio = bloqueo.fechaInicio.slice(0, 10);
  const fechaFin = bloqueo.fechaFin.slice(0, 10);

  const dataParaGuardar: any = {
    ...bloqueo,
    fechaInicio,
    fechaFin,
    creado: Timestamp.now(),
  };

  if (dataParaGuardar.cantidadBloqueada === undefined) {
    delete dataParaGuardar.cantidadBloqueada;
  }

  const docRef = await addDoc(collection(db, 'bloqueos'), dataParaGuardar);
  return docRef.id;
}



export async function eliminarBloqueo(id: string): Promise<void> {
  const docRef = doc(db, 'bloqueos', id);
  await deleteDoc(docRef);
}

export function seSuperpone(
  inicio1: string,
  fin1: string,
  inicio2: string,
  fin2: string
): boolean {
  // Asume fechas en formato 'YYYY-MM-DD'
  return inicio1 < fin2 && inicio2 < fin1;
}


export async function obtenerBloqueosSuperpuestos(
  unidad: Unidad,
  fechaIngreso: string,
  fechaSalida: string
): Promise<BloqueoConId[]> {
  const todos = await obtenerBloqueos();
  return todos.filter(
    (bloqueo) =>
      bloqueo.unidad === unidad &&
      seSuperpone(bloqueo.fechaInicio, bloqueo.fechaFin, fechaIngreso, fechaSalida)
  );
}

export function validarContraBloqueos(bloqueos: BloqueoConId[], cantidad: number) {
  const totalBloqueado = bloqueos.reduce((acc, b) => acc + (b.cantidadBloqueada || 0), 0);
  const hayTotal = bloqueos.some((b) => b.tipoBloqueo === 'bloqueo_total');

  if (hayTotal) {
    throw new Error('Hay un bloqueo total en las fechas seleccionadas.');
  }

  if (totalBloqueado > 0 && cantidad > 0 && totalBloqueado < cantidad) {
    throw new Error('No hay suficiente disponibilidad debido a bloqueos parciales.');
  }
}

export async function obtenerFechasBloqueadas(unidad: Unidad): Promise<string[]> {
  const bloqueos = await obtenerBloqueos();
  const hoy = new Date();

  return bloqueos
    .filter((b) => b.unidad === unidad && new Date(b.fechaFin) >= hoy)
    .flatMap((b) => {
      const fechas: string[] = [];
      const inicio = new Date(b.fechaInicio);
      const fin = new Date(b.fechaFin);
      for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
        fechas.push(new Date(d).toISOString().slice(0, 10));
      }
      return fechas;
    });
}

