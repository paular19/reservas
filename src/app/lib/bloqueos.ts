import { BlockInput, BlockOutput, TipoBloqueo, ResultadoDisponibilidad, DiaDisponibilidad, DetalleBloqueo, DetalleReserva } from '@/types/bloqueos';
import { Unidad, ReservaOutput } from '@/types/reservas';
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, QueryDocumentSnapshot, DocumentData, Timestamp,
  query, where 
} from 'firebase/firestore';
import { db } from './firebase';
import { obtenerReservasSuperpuestas, obtenerReservasPorRangoFechas} from './reservas';

const capacidadesUnidades: Record<Unidad, number> = {
  'este': 4,
  'oeste': 4,
  'cabana': 8,
  'camping': 0
};

const mapBloqueoDoc = (doc: QueryDocumentSnapshot<DocumentData>): BlockOutput => {
  const data = doc.data();
  return {
    id: doc.id,
    unidad: data.unidad,
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin,
    tipoBloqueo: data.tipoBloqueo,
    cantidadBloqueada: data.cantidadBloqueada ?? undefined,
    motivo: data.motivo ?? undefined,
    creadoDesdeCabana: data.creadoDesdeCabana ?? false,
    creado: data.creado?.toDate() ?? new Date()
  };
};

// OPERACIONES CRUD
export async function obtenerBloqueos(): Promise<BlockOutput[]> {
  const snapshot = await getDocs(collection(db, 'bloqueos'));
  return snapshot.docs.map(mapBloqueoDoc);
}

export async function obtenerBloqueosPorUnidad(unidad: Unidad): Promise<BlockOutput[]> {
  const q = query(collection(db, 'bloqueos'), where('unidad', '==', unidad));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapBloqueoDoc);
}

export async function obtenerBloqueosPorRangoFechas(
  unidad: Unidad,
  fechaInicio: Date | string,
  fechaFin: Date | string
): Promise<BlockOutput[]> {
  const q = query(
    collection(db, 'bloqueos'),
    where('unidad', '==', unidad),
    where('fechaInicio', '<=', fechaFin),
    where('fechaFin', '>=', fechaInicio)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapBloqueoDoc);
}

export async function crearBloqueo(bloqueo: BlockInput): Promise<string> {
  if (bloqueo.tipoBloqueo === 'bloqueo_parcial' && !bloqueo.cantidadBloqueada) {
    throw new Error('La cantidad bloqueada es requerida para bloqueos parciales');
  }

  const datosFirestore = {
    unidad: bloqueo.unidad,
    fechaInicio: bloqueo.fechaInicio,
    fechaFin: bloqueo.fechaFin,
    tipoBloqueo: bloqueo.tipoBloqueo,
    motivo: bloqueo.motivo || null,
    creado: Timestamp.now(),
    creadoDesdeCabana: bloqueo.creadoDesdeCabana || false,
    cantidadBloqueada: bloqueo.tipoBloqueo === 'bloqueo_parcial' 
      ? bloqueo.cantidadBloqueada 
      : null
  };

  const docRef = await addDoc(collection(db, 'bloqueos'), datosFirestore);
  return docRef.id;
}

export async function actualizarBloqueo(id: string, cambios: Partial<BlockInput>): Promise<void> {
  await updateDoc(doc(db, 'bloqueos', id), cambios);
}

export async function eliminarBloqueo(id: string): Promise<void> {
  await deleteDoc(doc(db, 'bloqueos', id));
}

// FUNCIONES DE NEGOCIO
export async function verificarDisponibilidad(
  unidad: Unidad,
  fechaInicio: Date | string,
  fechaFin: Date | string,
  cantidadRequerida: number = capacidadesUnidades[unidad]
) {
  const [reservas, bloqueos] = await Promise.all([
    obtenerReservasPorRangoFechas(unidad, fechaInicio, fechaFin),
    obtenerBloqueosPorRangoFechas(unidad, fechaInicio, fechaFin),
  ]);

  const capacidadTotal = capacidadesUnidades[unidad];
  let capacidadOcupada = reservas.reduce((sum, r) => sum + (r.cantidadPersonas), 0);

  bloqueos.forEach(bloqueo => {
    if (bloqueo.tipoBloqueo === 'bloqueo_total') capacidadOcupada = capacidadTotal;
    else capacidadOcupada += bloqueo.cantidadBloqueada ?? 0;
  });

  const capacidadDisponible = Math.max(0, capacidadTotal - capacidadOcupada);
  return {
    disponible: capacidadDisponible >= cantidadRequerida,
    capacidadDisponible,
    reservasConflictivas: reservas, 
    bloqueosConflictivos: bloqueos,
  };
}

export function seSuperpone(inicio1: string, fin1: string, inicio2: string, fin2: string): boolean {
  const inicioDate1 = new Date(inicio1);
  const finDate1 = new Date(fin1);
  const inicioDate2 = new Date(inicio2);
  const finDate2 = new Date(fin2);
  return inicioDate1 < finDate2 && inicioDate2 < finDate1;
}

export function filtrarReservasPorDia(reservas: ReservaOutput[], fecha: string): ReservaOutput[] {
  const fechaDia = new Date(fecha);
  const siguienteDia = new Date(fechaDia);
  siguienteDia.setDate(siguienteDia.getDate() + 1);

  return reservas.filter(r => {
    const inicioReserva = new Date(r.fechaIngreso);
    const finReserva = new Date(r.fechaSalida);
    return seSuperpone(
      inicioReserva.toISOString().split('T')[0], 
      finReserva.toISOString().split('T')[0],
      fechaDia.toISOString().split('T')[0],
      siguienteDia.toISOString().split('T')[0]
    );
  });
}

export function generarRangoDeFechas(inicio: string, fin: string): string[] {
  const fechas: string[] = [];
  let actual = new Date(inicio);
  const limite = new Date(fin);

  while (actual <= limite) {
    fechas.push(actual.toISOString().split('T')[0]);
    actual.setDate(actual.getDate() + 1);
  }

  return fechas;
}

export async function obtenerBloqueosSuperpuestos(
  unidad: Unidad,
  fechaInicio: string | Date,
  fechaFin: string | Date
): Promise<BlockOutput[]> {
  return await obtenerBloqueosPorRangoFechas(unidad, fechaInicio, fechaFin);
}

// GESTIÓN DE DISPONIBILIDAD
export async function verificarDisponibilidadCabanaEstricta(
  fechaInicio: string,
  fechaFin: string
): Promise<{ disponible: boolean; detalles: string }> {
  const [disponibilidadEste, disponibilidadOeste] = await Promise.all([
    verificarDisponibilidadConDetallePorDia('este', fechaInicio, fechaFin),
    verificarDisponibilidadConDetallePorDia('oeste', fechaInicio, fechaFin)
  ]);

  let disponible = true;
  const detalles: string[] = [];

  const fechas = generarRangoDeFechas(fechaInicio, fechaFin);
  
  fechas.forEach(fecha => {
    const diaEste = disponibilidadEste.diasAnalizados?.find(d => d.fecha === fecha);
    const diaOeste = disponibilidadOeste.diasAnalizados?.find(d => d.fecha === fecha);

    const esteLibre = diaEste?.disponible === capacidadesUnidades['este'];
    const oesteLibre = diaOeste?.disponible === capacidadesUnidades['oeste'];

    if (!esteLibre || !oesteLibre) {
      disponible = false;
      detalles.push(`- ${fecha}: 
        Este ${esteLibre ? 'Libre' : `Ocupado (${diaEste?.disponible}/${capacidadesUnidades['este']} disp.)`}, 
        Oeste ${oesteLibre ? 'Libre' : `Ocupado (${diaOeste?.disponible}/${capacidadesUnidades['oeste']} disp.)`}`);
    }
  });

  return {
    disponible,
    detalles: detalles.join('\n')
  };
}


export async function verificarDisponibilidadConDetallePorDia(
  unidad: Unidad,
  fechaInicio: string,
  fechaFin: string
): Promise<ResultadoDisponibilidad> {
  const capacidad = capacidadesUnidades[unidad];
  
  // Caso especial para cabaña
  if (unidad === 'cabana') {
    return await verificarDisponibilidadCabanaCompleta(fechaInicio, fechaFin);
  }

  const [bloqueosUnidad, bloqueosCabana, reservas] = await Promise.all([
    obtenerBloqueosSuperpuestos(unidad, fechaInicio, fechaFin),
    obtenerBloqueosSuperpuestos('cabana', fechaInicio, fechaFin),
    obtenerReservasSuperpuestas(unidad, fechaInicio, fechaFin)
  ]);

  const rangoFechas = generarRangoDeFechas(fechaInicio, fechaFin);

  const diasAnalizados = rangoFechas.map(fecha => {
    // 1. Verificar bloqueo de cabaña completa
    const bloqueoCabanaTotal = bloqueosCabana.some(b => 
      seSuperpone(b.fechaInicio, b.fechaFin, fecha, fecha) && 
      b.tipoBloqueo === 'bloqueo_total'
    );

    // 2. Bloqueos específicos de la habitación
    const bloqueosHabitacion = bloqueosUnidad.filter(b =>
      seSuperpone(b.fechaInicio, b.fechaFin, fecha, fecha)
    );

    // 3. Cálculo de disponibilidad
    let capacidadDisponible = capacidad;
    let totalBloqueado = 0;
    let afectaCabana = false;

    if (bloqueoCabanaTotal) {
      totalBloqueado = capacidad;
      afectaCabana = true;
    } else {
      // Procesar bloqueos de habitación
      bloqueosHabitacion.forEach(b => {
        if (b.tipoBloqueo === 'bloqueo_total') {
          totalBloqueado = capacidad;
          afectaCabana = true; // Bloqueo total en habitación afecta cabaña completa
        } else {
          totalBloqueado += b.cantidadBloqueada ?? 0;
          // Bloqueo parcial en cualquier habitación también afecta cabaña
          afectaCabana = true; 
        }
      });
    }

    capacidadDisponible = Math.max(0, capacidad - totalBloqueado);

    // 4. Procesar reservas
    const reservasDia = filtrarReservasPorDia(reservas, fecha);
    const totalOcupado = reservasDia.reduce((sum, r) => sum + (r.cantidadPersonas || 1), 0);
    capacidadDisponible = Math.max(0, capacidadDisponible - totalOcupado);

    // 5. Preparar detalles
    const detallesBloqueos: DetalleBloqueo[] = [];
    
  if (bloqueoCabanaTotal) {
  // Encuentra el bloqueo de cabaña correspondiente para obtener su ID
  const bloqueoCabana = bloqueosCabana.find(b => 
    seSuperpone(b.fechaInicio, b.fechaFin, fecha, fecha) && 
    b.tipoBloqueo === 'bloqueo_total'
  );

  detallesBloqueos.push({
    id: bloqueoCabana?.id, // Usamos el operador ?. por si no se encuentra
    tipo: 'bloqueo_total' as const, // Conversión explícita de tipo
    origen: 'cabana' as const,
    afectaCabana: true,
    creadoDesdeCabana: true
  });
}

    bloqueosHabitacion.forEach(b => {
      detallesBloqueos.push({
        id: b.id,
        tipo: b.tipoBloqueo,
        origen: 'habitacion',
        cantidad: b.tipoBloqueo === 'bloqueo_parcial' ? b.cantidadBloqueada : undefined,
        afectaCabana: true, // Todos los bloqueos en habitaciones afectan cabaña
        creadoDesdeCabana: b.creadoDesdeCabana || false
      });
    });

    return {
      fecha,
      bloqueos: totalBloqueado,
      reservas: totalOcupado,
      disponible: capacidadDisponible,
      afectaCabana, // Nuevo campo para indicar si afecta reservas de cabaña completa
      detallesBloqueos: detallesBloqueos.length > 0 ? detallesBloqueos : undefined,
      detallesReservas: reservasDia.map(r => ({
        id: r.id,
        cantidadPersonas: r.cantidadPersonas || 1
      }))
    };
  });

  // Calcular disponibilidad mínima
  const disponibilidades = diasAnalizados.map(d => d.disponible);
  const disponibleMinima = Math.min(...disponibilidades);

  return {
    disponible: disponibleMinima,
    capacidad,
    afectaCabana: diasAnalizados.some(d => d.afectaCabana), // Indica si algún día afecta cabaña completa
    diasConflictivos: diasAnalizados.filter(d => d.disponible < capacidad),
    diasAnalizados
  };
}

// Función especial para cabaña completa
async function verificarDisponibilidadCabanaCompleta(
  fechaInicio: string,
  fechaFin: string
): Promise<ResultadoDisponibilidad> {
  // Primero verificar disponibilidad en ambas habitaciones
  const [disponibilidadEste, disponibilidadOeste] = await Promise.all([
    verificarDisponibilidadConDetallePorDia('este', fechaInicio, fechaFin),
    verificarDisponibilidadConDetallePorDia('oeste', fechaInicio, fechaFin)
  ]);

  const capacidadCabana = capacidadesUnidades['cabana'];
  const capacidadEste = capacidadesUnidades['este'];
  const capacidadOeste = capacidadesUnidades['oeste'];

const diasAnalizados = (disponibilidadEste.diasAnalizados || []).map((diaEste, index) => {
  const diaOesteDefault = {
    fecha: diaEste.fecha,
    bloqueos: 0,
    reservas: 0,
    disponible: capacidadesUnidades['oeste'],
    afectaCabana: false
  };
  
  const diaOeste = (disponibilidadOeste.diasAnalizados || [])[index] || diaOesteDefault;

  const disponibleCabana = diaEste.disponible === capacidadesUnidades['este'] && 
                         diaOeste.disponible === capacidadesUnidades['oeste']
                         ? capacidadesUnidades['cabana'] : 0;

  return {
    fecha: diaEste.fecha,
    bloqueos: capacidadesUnidades['cabana'] - disponibleCabana,
    reservas: 0,
    disponible: disponibleCabana,
    afectaCabana: disponibleCabana === 0,
    detallesHabitaciones: {
      este: diaEste.disponible,
      oeste: diaOeste.disponible
    },
    detallesBloqueos: [],
    detallesReservas: []
  } as DiaDisponibilidad; // Aserción de tipo aquí
});

return {
  disponible: Math.min(...diasAnalizados.map(d => d.disponible)),
  capacidad: capacidadesUnidades['cabana'],
  afectaCabana: diasAnalizados.some(d => d.afectaCabana), // Esta línea es crucial
  diasConflictivos: diasAnalizados.filter(d => d.disponible < capacidadesUnidades['cabana']),
  diasAnalizados
};
}

// VALIDACIÓN Y CREACIÓN DE BLOQUEOS
export async function validarYCrearBloqueo(bloqueo: BlockInput): Promise<string> {
  // Validación básica de fechas
  if (!bloqueo.fechaInicio || !bloqueo.fechaFin) {
    throw new Error('Fechas requeridas');
  }
  if (bloqueo.fechaInicio >= bloqueo.fechaFin) {
    throw new Error('Fecha de inicio debe ser anterior a fecha de fin');
  }

  // Validación para bloqueos parciales
  if (bloqueo.tipoBloqueo === 'bloqueo_parcial') {
    if (!bloqueo.cantidadBloqueada || bloqueo.cantidadBloqueada <= 0) {
      throw new Error('Cantidad bloqueada inválida');
    }
    if (bloqueo.cantidadBloqueada > capacidadesUnidades[bloqueo.unidad]) {
      throw new Error(`Cantidad excede capacidad de la unidad (máximo: ${capacidadesUnidades[bloqueo.unidad]})`);
    }
  }

  // Manejo especial para bloqueo de cabaña completa
  if (bloqueo.unidad === 'cabana' && bloqueo.tipoBloqueo === 'bloqueo_total') {
    return await manejarBloqueoCabanaCompleta(bloqueo);
  }

  // Verificación de disponibilidad
  const resultado = await verificarDisponibilidadConDetallePorDia(
    bloqueo.unidad, 
    bloqueo.fechaInicio, 
    bloqueo.fechaFin
  );

// Verificar conflictos con bloqueos de cabaña completa
const tieneBloqueosCabana = resultado.diasConflictivos.some(dia => {
  // Verificar si es DiaDisponibilidadHabitacion (que tiene detallesBloqueos)
  if ('detallesBloqueos' in dia) {
    return dia.detallesBloqueos?.some(bloqueo => bloqueo.origen === 'cabana');
  }
  return false;
});

if (tieneBloqueosCabana) {
  const fechasConflictivas = [...new Set(
    resultado.diasConflictivos
      .filter(dia => {
        // Verificar el tipo antes de acceder a detallesBloqueos
        if ('detallesBloqueos' in dia) {
          return dia.detallesBloqueos?.some(b => b.origen === 'cabana');
        }
        return false;
      })
      .map(dia => dia.fecha)
  )].join(', ');
  
  throw new Error(
    `No se puede crear el bloqueo porque existe un bloqueo de cabaña completa en las fechas: ${fechasConflictivas}`
  );
}

  // Validar disponibilidad según tipo de bloqueo
  if (bloqueo.tipoBloqueo === 'bloqueo_total' && resultado.disponible < resultado.capacidad) {
    throw generarErrorDisponibilidad(resultado, bloqueo.unidad);
  }

  if (bloqueo.tipoBloqueo === 'bloqueo_parcial' && resultado.disponible < (bloqueo.cantidadBloqueada || 0)) {
    throw generarErrorDisponibilidad(resultado, bloqueo.unidad, bloqueo.cantidadBloqueada);
  }

  // Si pasa todas las validaciones, crear el bloqueo
  return await crearBloqueo(bloqueo);
}

async function manejarBloqueoCabanaCompleta(bloqueo: BlockInput): Promise<string> {
  const { disponible, detalles } = await verificarDisponibilidadCabanaEstricta(
    bloqueo.fechaInicio, 
    bloqueo.fechaFin
  );

  if (!disponible) {
    throw new Error(`No se puede bloquear la cabaña completa. Disponibilidad:\n${detalles}`);
  }

  // Verificar disponibilidad en ambas habitaciones
  const [disponibilidadEste, disponibilidadOeste] = await Promise.all([
    verificarDisponibilidadConDetallePorDia('este', bloqueo.fechaInicio, bloqueo.fechaFin),
    verificarDisponibilidadConDetallePorDia('oeste', bloqueo.fechaInicio, bloqueo.fechaFin)
  ]);

  // Preparar mensaje de error si hay conflictos
  if (disponibilidadEste.diasConflictivos.length > 0 || disponibilidadOeste.diasConflictivos.length > 0) {
    const mensajeError = [
      'No se puede bloquear la cabaña completa debido a:',
      disponibilidadEste.diasConflictivos.length > 0 
        ? `- Habitación Este: ${disponibilidadEste.diasConflictivos.map(dia => 
            `${dia.fecha} (${dia.disponible}/${disponibilidadEste.capacidad} disp.)`).join(', ')}`
        : '',
      disponibilidadOeste.diasConflictivos.length > 0 
        ? `- Habitación Oeste: ${disponibilidadOeste.diasConflictivos.map(dia => 
            `${dia.fecha} (${dia.disponible}/${disponibilidadOeste.capacidad} disp.)`).join(', ')}`
        : ''
    ].filter(linea => linea.trim() !== '').join('\n');

    throw new Error(mensajeError);
  }

  // Crear bloqueos para ambas habitaciones
  await Promise.all([
    crearBloqueo({ 
      ...bloqueo, 
      unidad: 'este', 
      creadoDesdeCabana: true,
      tipoBloqueo: 'bloqueo_total'
    }),
    crearBloqueo({ 
      ...bloqueo, 
      unidad: 'oeste', 
      creadoDesdeCabana: true,
      tipoBloqueo: 'bloqueo_total'
    })
  ]);

  return 'cabana-creada';
}

function generarErrorDisponibilidad(
  resultado: ResultadoDisponibilidad,
  unidad: Unidad,
  cantidadRequerida?: number
): Error {
  const unidadStr = unidad === 'este' ? 'Habitación Este' : 
                   unidad === 'oeste' ? 'Habitación Oeste' : 
                   'Cabaña Completa';

  const mensajeBase = cantidadRequerida
    ? `${unidadStr}: No hay suficientes camas disponibles (necesitas ${cantidadRequerida}, hay ${resultado.disponible})`
    : `${unidadStr}: La unidad no está totalmente libre (disponible: ${resultado.disponible}/${resultado.capacidad})`;

  const detalles = resultado.diasConflictivos.map(dia => {
    // Primero verificamos si es un día de habitación
    if ('detallesBloqueos' in dia) {
      // Aquí TypeScript sabe que es DiaDisponibilidadHabitacion
      const bloqueoCabana = dia.detallesBloqueos?.find(b => b.origen === 'cabana');
      if (bloqueoCabana) {
        return `- ${dia.fecha}: BLOQUEADO POR CABAÑA COMPLETA`;
      }

      let detalle = `- ${dia.fecha}: ${dia.disponible}/${resultado.capacidad} camas disponibles.`;
      
      if (dia.bloqueos > 0 && dia.detallesBloqueos) {
        const bloqueosTotales = dia.detallesBloqueos.filter(b => b.tipo === 'bloqueo_total').length;
        const bloqueosParciales = dia.detallesBloqueos.filter(b => b.tipo === 'bloqueo_parcial').length;
        
        if (bloqueosTotales > 0) detalle += ` (${bloqueosTotales} bloqueo(s) total(es))`;
        if (bloqueosParciales > 0) detalle += ` (${bloqueosParciales} bloqueo(s) parcial(es))`;
      }
      
      if (dia.reservas > 0) detalle += ` (${dia.reservas} cama(s) reservada(s))`;

      return detalle;
    }
    
    // Si no es habitación, es cabaña (DiaDisponibilidadCabana)
    return `- ${dia.fecha}: ${dia.disponible}/${resultado.capacidad} camas (datos de cabaña)`;
  }).join('\n');

  return new Error(`${mensajeBase}\nDetalles por día:\n${detalles}`);
}

export async function obtenerFechasBloqueadasPorCabana(): Promise<string[]> {
  const [bloqueosEste, bloqueosOeste] = await Promise.all([
    obtenerBloqueosPorUnidad('este'),
    obtenerBloqueosPorUnidad('oeste'),
  ]);

  const fechasBloqueadas = new Set<string>();

  // Procesar ambos conjuntos de bloqueos
  for (const bloqueo of [...bloqueosEste, ...bloqueosOeste]) {
    if (bloqueo.creadoDesdeCabana && bloqueo.tipoBloqueo === 'bloqueo_total') {
      const fechas = generarRangoDeFechas(bloqueo.fechaInicio, bloqueo.fechaFin);
      fechas.forEach(fecha => fechasBloqueadas.add(fecha));
    }
  }

  return Array.from(fechasBloqueadas).sort();
}

export async function obtenerDisponibilidadCalendario(
  unidad: Unidad,
  fechaInicio: string,
  fechaFin: string
): Promise<{ fecha: string; disponible: number; bloqueoTotal: boolean }[]> {
  if (unidad === 'cabana') {
    const resultado = await verificarDisponibilidadCabanaEstricta(fechaInicio, fechaFin);
    return generarRangoDeFechas(fechaInicio, fechaFin).map(fecha => ({
      fecha,
      disponible: resultado.disponible ? capacidadesUnidades['cabana'] : 0,
      bloqueoTotal: !resultado.disponible
    }));
  }

  const resultado = await verificarDisponibilidadConDetallePorDia(unidad, fechaInicio, fechaFin);
  return (resultado.diasAnalizados || []).map(dia => ({
    fecha: dia.fecha,
    disponible: dia.disponible,
    bloqueoTotal: dia.bloqueos >= capacidadesUnidades[unidad]
  }));
}