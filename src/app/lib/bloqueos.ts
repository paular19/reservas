import { BlockInput, BlockOutput } from '@/types/bloqueos';
import { Unidad } from '@/types/reservas';
import { 
  collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  doc, QueryDocumentSnapshot, DocumentData, Timestamp,
  query, where
} from 'firebase/firestore';
import { db } from './firebase';
import { capacidades } from './reservas';
import { obtenerReservasSuperpuestas } from './reservas';

// 1. Función de mapeo
const mapBloqueoDoc = (doc: QueryDocumentSnapshot<DocumentData>): BlockOutput => ({
  id: doc.id,
  ...doc.data(),
  creado: doc.data().creado?.toDate() || new Date()
} as BlockOutput);

// 2. Operaciones CRUD básicas
export async function obtenerBloqueos(): Promise<BlockOutput[]> {
  try {
    const snapshot = await getDocs(collection(db, 'bloqueos'));
    return snapshot.docs.map(mapBloqueoDoc);
  } catch (error) {
    console.error('Error al obtener bloqueos:', error);
    throw new Error('No se pudieron cargar los bloqueos');
  }
}

export async function obtenerBloqueosPorUnidad(unidad: Unidad): Promise<BlockOutput[]> {
  const q = query(collection(db, 'bloqueos'), where('unidad', '==', unidad));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapBloqueoDoc);
}

export async function crearBloqueo(bloqueo: BlockInput): Promise<string> {
  // Validaciones básicas
  if (bloqueo.fechaInicio >= bloqueo.fechaFin) {
    throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
  }

  // Validar disponibilidad según la lógica requerida
  await validarDisponibilidadParaBloqueo(bloqueo);

  // Preparar datos para Firestore
  const datosFirestore: Record<string, any> = {
    unidad: bloqueo.unidad,
    fechaInicio: bloqueo.fechaInicio,
    fechaFin: bloqueo.fechaFin,
    tipoBloqueo: bloqueo.tipoBloqueo,
    motivo: bloqueo.motivo || null,
    creado: Timestamp.now()
  };

  // Manejo de cantidadBloqueada
  if (bloqueo.tipoBloqueo === 'bloqueo_parcial') {
    if (typeof bloqueo.cantidadBloqueada === 'undefined' || bloqueo.cantidadBloqueada <= 0) {
      throw new Error('Debe especificar una cantidad válida para bloqueos parciales');
    }
    if (bloqueo.cantidadBloqueada > capacidades[bloqueo.unidad]) {
      throw new Error(`La cantidad bloqueada excede la capacidad de la unidad (${capacidades[bloqueo.unidad]})`);
    }
    datosFirestore.cantidadBloqueada = bloqueo.cantidadBloqueada;
  } else {
    datosFirestore.cantidadBloqueada = null;
  }

  // Crear el bloqueo
  const docRef = await addDoc(collection(db, 'bloqueos'), datosFirestore);
  return docRef.id;
}

export async function actualizarBloqueo(
  id: string, 
  cambios: Partial<BlockInput>
): Promise<void> {
  await updateDoc(doc(db, 'bloqueos', id), cambios);
}

export async function eliminarBloqueo(id: string): Promise<void> {
  await deleteDoc(doc(db, 'bloqueos', id));
}

// 3. Funciones de validación
export function seSuperpone(
  inicio1: string, 
  fin1: string, 
  inicio2: string, 
  fin2: string
): boolean {
  return inicio1 < fin2 && inicio2 < fin1;
}

export function validarContraBloqueos(
  bloqueos: BlockOutput[], 
  cantidadSolicitada: number,
  capacidadTotal: number
): void {
  if (!bloqueos || bloqueos.length === 0) return;

  if (typeof cantidadSolicitada !== 'number' || cantidadSolicitada < 0) {
    throw new Error('La cantidad solicitada debe ser un número positivo');
  }

  const hayBloqueoTotal = bloqueos.some(b => b.tipoBloqueo === 'bloqueo_total');
  if (hayBloqueoTotal) {
    throw new Error('Existe un bloqueo total para las fechas seleccionadas');
  }

  const totalBloqueado = bloqueos.reduce(
    (sum, bloqueo) => sum + (bloqueo.cantidadBloqueada ?? 0), 
    0
  );
  
  const disponible = capacidadTotal - totalBloqueado;
  if (cantidadSolicitada > disponible) {
    throw new Error(`La cantidad solicitada (${cantidadSolicitada}) excede la disponibilidad (${disponible} disponibles de ${capacidadTotal})`);
  }
}

// 4. Funciones de lógica de negocio
export async function obtenerBloqueosSuperpuestos(
  unidad: Unidad,
  fechaInicio: string,
  fechaFin: string
): Promise<BlockOutput[]> {
  const bloqueosUnidad = await obtenerBloqueosPorUnidad(unidad);
  return bloqueosUnidad.filter(bloqueo => 
    seSuperpone(bloqueo.fechaInicio, bloqueo.fechaFin, fechaInicio, fechaFin)
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
      mensaje: 'Ambas habitaciones están completamente ocupadas. No se puede bloquear la cabaña completa.'
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
             No se puede bloquear la cabaña completa. Puedes bloquear:
             ${camasDisponiblesEste > 0 ? `- Hasta ${camasDisponiblesEste} camas en habitación Este` : ''}
             ${camasDisponiblesOeste > 0 ? `- Hasta ${camasDisponiblesOeste} camas en habitación Oeste` : ''}`,
    habitacionDisponible,
    camasDisponiblesEste,
    camasDisponiblesOeste
  };
}

async function validarDisponibilidadParaBloqueo(bloqueo: BlockInput): Promise<void> {
  const { unidad, fechaInicio, fechaFin, tipoBloqueo, cantidadBloqueada } = bloqueo;

  // Validar bloqueo de cabaña completa
  if (unidad === 'cabana' && tipoBloqueo === 'bloqueo_total') {
    const { disponible, mensaje } = await verificarDisponibilidadCabañaCompleta(fechaInicio, fechaFin);
    if (!disponible) {
      throw new Error(mensaje || 'No se puede bloquear la cabaña completa');
    }

    // Crear bloqueos para ambas habitaciones
    await Promise.all([
      crearBloqueo({
        ...bloqueo,
        unidad: 'este',
        tipoBloqueo: 'bloqueo_total'
      }),
      crearBloqueo({
        ...bloqueo,
        unidad: 'oeste',
        tipoBloqueo: 'bloqueo_total'
      })
    ]);
    return;
  }

  // Validar bloqueo parcial de cabaña
  if (unidad === 'cabana' && tipoBloqueo === 'bloqueo_parcial') {
    throw new Error('No se puede hacer un bloqueo parcial directo a la cabaña. Debes bloquear una habitación específica.');
  }

  // Validar bloqueo de habitaciones individuales
  if (unidad === 'este' || unidad === 'oeste') {
    const [reservas, bloqueos] = await Promise.all([
      obtenerReservasSuperpuestas(unidad, fechaInicio, fechaFin),
      obtenerBloqueosSuperpuestos(unidad, fechaInicio, fechaFin)
    ]);

    const camasOcupadas = reservas.reduce((sum, r) => sum + r.cantidadPersonas, 0);
    const camasBloqueadas = bloqueos.reduce((sum, b) => {
      return sum + (b.tipoBloqueo === 'bloqueo_total' ? capacidades[unidad] : (b.cantidadBloqueada || 0));
    }, 0);

    const camasDisponibles = Math.max(0, capacidades[unidad] - camasOcupadas - camasBloqueadas);

    if (tipoBloqueo === 'bloqueo_total') {
      if (camasDisponibles < capacidades[unidad]) {
        throw new Error(`No se puede bloquear completamente la habitación ${unidad} porque hay ${camasOcupadas + camasBloqueadas} camas ocupadas/bloqueadas de ${capacidades[unidad]}`);
      }
    } else if (tipoBloqueo === 'bloqueo_parcial') {
      if (camasDisponibles < (cantidadBloqueada || 0)) {
        throw new Error(`Solo hay ${camasDisponibles} camas disponibles en la habitación ${unidad}. No se pueden bloquear ${cantidadBloqueada} camas.`);
      }
    }
  }
}

export async function validarYCrearBloqueo(bloqueo: BlockInput): Promise<string> {
  // Validaciones básicas
  if (!bloqueo.fechaInicio || !bloqueo.fechaFin) {
    throw new Error('Las fechas de inicio y fin son requeridas');
  }
  
  if (bloqueo.fechaInicio >= bloqueo.fechaFin) {
    throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
  }
  
  if (bloqueo.tipoBloqueo === 'bloqueo_parcial') {
    if (typeof bloqueo.cantidadBloqueada === 'undefined' || bloqueo.cantidadBloqueada <= 0) {
      throw new Error('Debe especificar una cantidad válida para bloqueos parciales');
    }
    if (bloqueo.cantidadBloqueada > capacidades[bloqueo.unidad]) {
      throw new Error(`La cantidad bloqueada excede la capacidad de ${bloqueo.unidad} (${capacidades[bloqueo.unidad]})`);
    }
  }

  // Validar disponibilidad según la lógica requerida
  await validarDisponibilidadParaBloqueo(bloqueo);

  return await crearBloqueo(bloqueo);
}

export async function calcularDisponibilidad(
  unidad: Unidad,
  fechaInicio: string,
  fechaFin: string
): Promise<{ disponible: number; capacidad: number; bloqueados: number; ocupados?: number }> {
  const capacidad = capacidades[unidad];
  const [bloqueos, reservas] = await Promise.all([
    obtenerBloqueosSuperpuestos(unidad, fechaInicio, fechaFin),
    obtenerReservasSuperpuestas(unidad, fechaInicio, fechaFin)
  ]);

  if (bloqueos.some(b => b.tipoBloqueo === 'bloqueo_total')) {
    return { disponible: 0, capacidad, bloqueados: capacidad, ocupados: 0 };
  }

  const totalBloqueado = bloqueos.reduce(
    (sum, bloqueo) => sum + (bloqueo.cantidadBloqueada ?? 0), 
    0
  );

  const totalOcupado = reservas.reduce(
    (sum, reserva) => sum + reserva.cantidadPersonas,
    0
  );

  const disponibles = Math.max(0, capacidad - totalBloqueado - totalOcupado);
  return { disponible: disponibles, capacidad, bloqueados: totalBloqueado, ocupados: totalOcupado };
}

// Nueva función para verificar disponibilidad de habitaciones antes de bloquear cabaña
export async function verificarHabitacionesAntesBloquearCabaña(
  fechaInicio: string,
  fechaFin: string
): Promise<{ 
  puedeBloquear: boolean;
  mensaje: string;
  detalles: {
    este: { disponibles: number; ocupadas: number; bloqueadas: number };
    oeste: { disponibles: number; ocupadas: number; bloqueadas: number };
  }
}> {
  const [disponibilidadEste, disponibilidadOeste] = await Promise.all([
    calcularDisponibilidad('este', fechaInicio, fechaFin),
    calcularDisponibilidad('oeste', fechaInicio, fechaFin)
  ]);

  const puedeBloquear = 
    disponibilidadEste.disponible === capacidades.este && 
    disponibilidadOeste.disponible === capacidades.oeste;

  const mensaje = puedeBloquear 
    ? 'Puedes bloquear la cabaña completa' 
    : 'No puedes bloquear la cabaña completa porque: ' +
      (disponibilidadEste.disponible < capacidades.este 
        ? `Habitación Este tiene ${capacidades.este - disponibilidadEste.disponible} camas ocupadas/bloqueadas. ` : '') +
      (disponibilidadOeste.disponible < capacidades.oeste 
        ? `Habitación Oeste tiene ${capacidades.oeste - disponibilidadOeste.disponible} camas ocupadas/bloqueadas. ` : '');

  return {
    puedeBloquear,
    mensaje,
    detalles: {
      este: {
        disponibles: disponibilidadEste.disponible,
        ocupadas: disponibilidadEste.ocupados || 0,
        bloqueadas: disponibilidadEste.bloqueados
      },
      oeste: {
        disponibles: disponibilidadOeste.disponible,
        ocupadas: disponibilidadOeste.ocupados || 0,
        bloqueadas: disponibilidadOeste.bloqueados
      }
    }
  };
}