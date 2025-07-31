// types/bloqueos.d.ts
import { Unidad } from './reservas';

export type TipoBloqueo = 'bloqueo_total' | 'bloqueo_parcial';

export interface BlockInput {
  unidad: Unidad;
  fechaInicio: string;
  fechaFin: string;
  tipoBloqueo: TipoBloqueo;
  cantidadBloqueada?: number;
  motivo?: string;
}

export interface BlockOutput extends BlockInput {
  id: string;
  creado: Date;
}

export declare function seSuperpone(
  inicio1: string, 
  fin1: string, 
  inicio2: string, 
  fin2: string
): boolean;

export declare function obtenerBloqueos(): Promise<BlockOutput[]>;

export declare function obtenerBloqueosSuperpuestos(
  unidad: Unidad,
  fechaIngreso: string,
  fechaSalida: string
): Promise<BlockOutput[]>;

export declare function validarContraBloqueos(
  bloqueos: BlockOutput[], 
  cantidad: number
): void;

export declare function crearBloqueo(bloqueo: BlockInput): Promise<string>;

export declare function actualizarBloqueo(
  id: string, 
  cambios: Partial<BlockInput>
): Promise<void>;

export declare function eliminarBloqueo(id: string): Promise<void>;