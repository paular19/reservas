// types/reservas.d.ts
export type Unidad = "este" | "oeste" | "cabana" | "camping";
export type TipoReserva = "cama_individual" | "habitacion_completa" | "cabana_completa" | "camping";

export interface ReservaInput {
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
}

export interface ReservaOutput extends ReservaInput {
  id: string;
  pagado: boolean;
  creado: Date;
}

export interface ReservaWebhookInput extends Omit<ReservaInput, 'tipoReserva' | 'cantidadPersonas'> {
  codigoReserva: string;
}


export declare function seSuperpone(
  inicio1: string,
  fin1: string,
  inicio2: string,
  fin2: string
): boolean;