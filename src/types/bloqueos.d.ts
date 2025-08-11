import { Unidad } from './reservas';

/**
 * Tipos de bloqueo disponibles:
 * - 'bloqueo_total': Bloquea toda la unidad
 * - 'bloqueo_parcial': Bloquea solo una cantidad específica de camas
 */
export type TipoBloqueo = 'bloqueo_total' | 'bloqueo_parcial';

/**
 * Datos necesarios para crear un nuevo bloqueo
 */
export interface BlockInput {
  unidad: Unidad;
  fechaInicio: string;
  fechaFin: string;
  tipoBloqueo: TipoBloqueo;
  cantidadBloqueada?: number;  // Obligatorio para bloqueo_parcial
  motivo?: string;
  // creadoDesdeCabana?: boolean;
}

/**
 * Datos de un bloqueo existente, incluye metadatos de Firebase
 */
export interface BlockOutput extends BlockInput {
  id: string;
  creado: Date;
}

/**
 * Origen del bloqueo:
 * - 'directo': Bloqueo creado directamente para la habitación
 * - 'cabana': Bloqueo creado como parte de un bloqueo de cabaña completa
 */
export type OrigenBloqueo = 'habitacion' | 'cabana';

/**
 * Detalles de una reserva para mostrar en información de conflictos
 */
export interface DetalleReserva {
  id: string;
  cantidadPersonas: number;
}

/**
 * Detalles de un bloqueo para mostrar en información de conflictos
 */
export interface DetalleBloqueo {
  id?: string;
  tipo: TipoBloqueo;
  cantidad?: number;
  origen: OrigenBloqueo;
  creadoDesdeCabana: boolean;
  afectaCabana: boolean;
}

interface DiaDisponibilidadBase {
  fecha: string;
  bloqueos: number;
  reservas: number;
  disponible: number;
  afectaCabana: boolean;
}

interface DiaDisponibilidadHabitacion extends DiaDisponibilidadBase {
  detallesBloqueos?: DetalleBloqueo[];
  detallesReservas?: DetalleReserva[];
}

interface DiaDisponibilidadCabana extends DiaDisponibilidadBase {
  detallesHabitaciones: {
    este: number;
    oeste: number;
  };
}

type DiaDisponibilidad = DiaDisponibilidadHabitacion | DiaDisponibilidadCabana;

/**
 * Resultado de verificación de disponibilidad
 */
export interface ResultadoDisponibilidad {
  disponible: number;
  capacidad: number;
  diasConflictivos: DiaDisponibilidad[];
  diasAnalizados: DiaDisponibilidad[];
  afectaCabana: boolean;
}

/**
 * Resultado de verificación para bloqueo de cabaña completa
 */
export interface ResultadoVerificacionCabana {
  puedeBloquear: boolean;
  mensaje: string;
  detalles: {
    este: {
      disponibles: number;
      capacidad: number;
      diasConflictivos: DiaDisponibilidad[];
    };
    oeste: {
      disponibles: number;
      capacidad: number;
      diasConflictivos: DiaDisponibilidad[];
    };
  };
}