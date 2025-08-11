import {
  collection, addDoc, getDocs, getDoc, deleteDoc,
  updateDoc, doc, QueryDocumentSnapshot, DocumentData,   startAfter, limit, Timestamp, query, where
} from "firebase/firestore";
import { db } from "./firebase";
import { 
  obtenerBloqueosPorUnidad,
  seSuperpone,
  calcularDisponibilidad as calcularDisponibilidadBloqueos,
  obtenerBloqueosSuperpuestos
} from './bloqueos';
import { 
  ReservaInput, 
  ReservaOutput, 
  ReservaWebhookInput, 
  Unidad 
} from '@/types/reservas';

// -----------------------------------------------
// 1. CONSTANTES Y CONFIGURACIÓN
// -----------------------------------------------

export const capacidades = {
  este: 4,
  oeste: 4,
  cabana: 8,
  camping: 50,
} as const;

// -----------------------------------------------
// 2. FUNCIONES DE MAPEO Y TRANSFORMACIÓN
// -----------------------------------------------

const mapReservaDoc = (doc: QueryDocumentSnapshot<DocumentData>): ReservaOutput => ({
  id: doc.id,
  nombreCompleto: doc.data().nombreCompleto,
  email: doc.data().email,
  telefono: doc.data().telefono,
  fechaIngreso: doc.data().fechaIngreso,
  fechaSalida: doc.data().fechaSalida,
  unidad: doc.data().unidad,
  tipoReserva: doc.data().tipoReserva,
  cantidadPersonas: doc.data().cantidadPersonas,
  desayuno: doc.data().desayuno,
  almuerzo: doc.data().almuerzo,
  pagado: doc.data().pagado || false,
  creado: doc.data().creado?.toDate() || new Date()
});

// -----------------------------------------------
// 3. OPERACIONES CRUD BÁSICAS
// -----------------------------------------------
const PAGE_SIZE = 2;

export async function obtenerReservas(): Promise<ReservaOutput[]> {
  const snapshot = await getDocs(collection(db, "reservas"));
  return snapshot.docs.map(mapReservaDoc);
}

export async function obtenerReservasPaginado(lastDoc? : any): any {
  const paginacionQuery = query (collection(db, "reservas"), 
  ...(lastDoc ? [startAfter(lastDoc)] : []),
    limit(PAGE_SIZE)
  );
  const snapshot = await getDocs(paginacionQuery);
  
  return snapshot.docs.map(mapReservaDoc);

}

export async function obtenerReservasPorUnidad(unidad: Unidad): Promise<ReservaOutput[]> {
  const q = query(collection(db, "reservas"), where('unidad', '==', unidad));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapReservaDoc);
}

export async function obtenerReservasPorRangoFechas(
  unidad: Unidad,
  fechaInicio: Date | string,
  fechaFin: Date | string
): Promise<ReservaOutput[]> {
  // Normalizar fechas (acepta Date o string ISO)
  const inicio = typeof fechaInicio === 'string' ? new Date(fechaInicio) : fechaInicio;
  const fin = typeof fechaFin === 'string' ? new Date(fechaFin) : fechaFin;

  // Validación de fechas
  if (isNaN(inicio.getTime())) throw new Error("Fecha de inicio inválida");
  if (isNaN(fin.getTime())) throw new Error("Fecha de fin inválida");
  if (inicio > fin) throw new Error("La fecha de inicio debe ser anterior a la de fin");

  try {
    // Consulta Firestore para reservas que se superponen con el rango
    const q = query(
      collection(db, "reservas"),
        where('unidad', '==', unidad),
        where('fechaInicio', '<=', fechaFin),
        where('fechaFin', '>=', fechaInicio)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapReservaDoc);
      
  } catch (error) {
    console.error("Error al obtener reservas por rango:", error);
    throw new Error("No se pudieron obtener las reservas");
  }
}

export async function crearReserva(datos: ReservaInput): Promise<ReservaOutput> {
  const docRef = await addDoc(collection(db, "reservas"), {
    ...datos,
    pagado: false,
    creado: Timestamp.now()
  });
  return mapReservaDoc(await getDoc(docRef) as QueryDocumentSnapshot<DocumentData>);
}

export async function actualizarReserva(
  id: string, 
  cambios: Partial<ReservaInput>
): Promise<void> {
  await updateDoc(doc(db, "reservas", id), cambios);
}

export async function eliminarReserva(id: string): Promise<void> {
  await deleteDoc(doc(db, "reservas", id));
}

// -----------------------------------------------
// 4. FUNCIONES DE VALIDACIÓN
// -----------------------------------------------

function validarCapacidadUnidad(
  unidad: Unidad,
  cantidadPersonas: number
): void {
  if (cantidadPersonas <= 0) {
    throw new Error('La cantidad de personas debe ser mayor a cero');
  }

  if (cantidadPersonas > capacidades[unidad]) {
    throw new Error(
      `La cantidad de personas (${cantidadPersonas}) excede la capacidad máxima (${capacidades[unidad]})`
    );
  }
}

// -----------------------------------------------
// 5. FUNCIONES DE LÓGICA DE NEGOCIO MEJORADAS
// -----------------------------------------------

export async function obtenerReservasSuperpuestas(
  unidad: Unidad,
  fechaInicio: string,
  fechaFin: string
): Promise<ReservaOutput[]> {
  const reservasUnidad = await obtenerReservasPorUnidad(unidad);
  return reservasUnidad.filter(reserva => 
    seSuperpone(reserva.fechaIngreso, reserva.fechaSalida, fechaInicio, fechaFin)
  );
}

async function verificarDisponibilidadCabañaCompleta(
  fechaInicio: string,
  fechaFin: string
): Promise<{ 
  disponible: boolean; 
  mensaje?: string; 
  habitacionDisponible?: Unidad;
  camasDisponiblesEste?: number;
  camasDisponiblesOeste?: number;
}> {
  const [reservasEste, reservasOeste, bloqueosEste, bloqueosOeste] = await Promise.all([
    obtenerReservasSuperpuestas('este', fechaInicio, fechaFin),
    obtenerReservasSuperpuestas('oeste', fechaInicio, fechaFin),
    obtenerBloqueosSuperpuestos('este', fechaInicio, fechaFin),
    obtenerBloqueosSuperpuestos('oeste', fechaInicio, fechaFin)
  ]);

  const camasOcupadasEste = reservasEste.reduce((sum, r) => sum + r.cantidadPersonas, 0);
  const camasOcupadasOeste = reservasOeste.reduce((sum, r) => sum + r.cantidadPersonas, 0);

  const camasBloqueadasEste = bloqueosEste.reduce((sum, b) => {
    return sum + (b.tipoBloqueo === 'bloqueo_total' ? capacidades.este : (b.cantidadBloqueada || 0));
  }, 0);
  
  const camasBloqueadasOeste = bloqueosOeste.reduce((sum, b) => {
    return sum + (b.tipoBloqueo === 'bloqueo_total' ? capacidades.oeste : (b.cantidadBloqueada || 0));
  }, 0);

  const camasDisponiblesEste = Math.max(0, capacidades.este - camasOcupadasEste - camasBloqueadasEste);
  const camasDisponiblesOeste = Math.max(0, capacidades.oeste - camasOcupadasOeste - camasBloqueadasOeste);

  const esteTotalmenteOcupado = camasDisponiblesEste <= 0;
  const oesteTotalmenteOcupado = camasDisponiblesOeste <= 0;

  if (esteTotalmenteOcupado && oesteTotalmenteOcupado) {
    return { 
      disponible: false,
      mensaje: 'Ambas habitaciones están completamente ocupadas. No se puede reservar la cabaña completa.'
    };
  }

  if (camasDisponiblesEste === capacidades.este && camasDisponiblesOeste === capacidades.oeste) {
    return { 
      disponible: true,
      camasDisponiblesEste,
      camasDisponiblesOeste
    };
  }

  const habitacionDisponible = esteTotalmenteOcupado ? 'oeste' : 
                             oesteTotalmenteOcupado ? 'este' : 
                             camasDisponiblesEste >= camasDisponiblesOeste ? 'este' : 'oeste';
  
  return {
    disponible: false,
    mensaje: `Disponibilidad actual: 
             - Habitación Este: ${camasDisponiblesEste}/${capacidades.este} camas libres
             - Habitación Oeste: ${camasDisponiblesOeste}/${capacidades.oeste} camas libres
             No se puede reservar la cabaña completa. Puedes reservar:
             ${camasDisponiblesEste > 0 ? `- Hasta ${camasDisponiblesEste} camas en habitación Este` : ''}
             ${camasDisponiblesOeste > 0 ? `- Hasta ${camasDisponiblesOeste} camas en habitación Oeste` : ''}`,
    habitacionDisponible,
    camasDisponiblesEste,
    camasDisponiblesOeste
  };
}

export async function calcularDisponibilidadReal(
  unidad: Unidad,
  fechaInicio: string,
  fechaFin: string
): Promise<{ disponible: number }> {
  try {
    const { disponible: dispBloqueos } = await calcularDisponibilidadBloqueos(unidad, fechaInicio, fechaFin);
    const reservas = await obtenerReservasSuperpuestas(unidad, fechaInicio, fechaFin);
    const totalReservado = reservas.reduce((sum, r) => sum + r.cantidadPersonas, 0);
    
    return {
      disponible: Math.max(0, dispBloqueos - totalReservado)
    };
  } catch (error) {
    console.error('Error al calcular disponibilidad:', error);
    return { disponible: 0 };
  }
}

export async function validarYCrearReserva(datos: ReservaInput): Promise<ReservaOutput> {
  const { unidad, fechaIngreso, fechaSalida, cantidadPersonas, tipoReserva } = datos;

  validarCapacidadUnidad(unidad, cantidadPersonas);

  if (unidad === "cabana") {
    const { disponible, mensaje } = await verificarDisponibilidadCabañaCompleta(fechaIngreso, fechaSalida);
    
    if (!disponible) {
      throw new Error(mensaje);
    }

    const reservaEste = await crearReserva({
      ...datos,
      unidad: 'este',
      cantidadPersonas: capacidades.este,
      tipoReserva: 'habitacion_completa'
    });
    
    const reservaOeste = await crearReserva({
      ...datos,
      unidad: 'oeste',
      cantidadPersonas: capacidades.oeste,
      tipoReserva: 'habitacion_completa'
    });

    return {
      ...datos,
      id: `${reservaEste.id},${reservaOeste.id}`,
      pagado: false,
      creado: new Date()
    };
  }

  if (unidad === "este" || unidad === "oeste") {
    const { disponible } = await calcularDisponibilidadReal(unidad, fechaIngreso, fechaSalida);
    
    if (cantidadPersonas > disponible) {
      throw new Error(`Solo hay ${disponible} ${disponible === 1 ? 'cama disponible' : 'camas disponibles'} en la habitación ${unidad}`);
    }

    if (tipoReserva === "cama_individual" && cantidadPersonas > capacidades[unidad]) {
      throw new Error(`Máximo ${capacidades[unidad]} personas por habitación (${capacidades[unidad]} camas)`);
    }
  }

  return await crearReserva(datos);
}

export async function validarReservaBooking(
  reservaData: ReservaInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { unidad, fechaIngreso, fechaSalida, cantidadPersonas, tipoReserva } = reservaData;

    validarCapacidadUnidad(unidad, cantidadPersonas);

    if (unidad === "cabana") {
      const { disponible, mensaje } = await verificarDisponibilidadCabañaCompleta(fechaIngreso, fechaSalida);
      if (!disponible) {
        return { success: false, error: mensaje };
      }
    }

    const { disponible } = await calcularDisponibilidadReal(unidad, fechaIngreso, fechaSalida);
    if (cantidadPersonas > disponible) {
      return { 
        success: false, 
        error: `Solo hay ${disponible} ${disponible === 1 ? 'cama disponible' : 'camas disponibles'}` 
      };
    }

    if (unidad === 'este' || unidad === 'oeste') {
      if (tipoReserva === 'cama_individual' && cantidadPersonas > capacidades[unidad]) {
        return { 
          success: false, 
          error: `Máximo ${capacidades[unidad]} personas por habitación (${capacidades[unidad]} camas)` 
        };
      }
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error al validar disponibilidad';
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

export async function crearReservaWebhook(data: ReservaWebhookInput): Promise<ReservaOutput> {
  const docRef = await addDoc(collection(db, "reservas"), {
    ...data,
    tipoReserva: "cama_individual",
    cantidadPersonas: 1,
    desayuno: false,
    almuerzo: false,
    creado: Timestamp.now()
  });
  
  return mapReservaDoc(await getDoc(docRef) as QueryDocumentSnapshot<DocumentData>);
}

export async function obtenerFechasOcupadas(unidad: Unidad): Promise<{fechaInicio: string, fechaFin: string}[]> {
  const [reservas, bloqueos] = await Promise.all([
    obtenerReservasPorUnidad(unidad),
    obtenerBloqueosPorUnidad(unidad)
  ]);

  return [
    ...reservas.map(r => ({ fechaInicio: r.fechaIngreso, fechaFin: r.fechaSalida })),
    ...bloqueos.map(b => ({ fechaInicio: b.fechaInicio, fechaFin: b.fechaFin }))
  ];
}