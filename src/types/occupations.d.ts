export type Unit = "bed" | "camping" | "cabin" | "east" | "west";
export type OccupationType = "single_bed" | "full_room" | "full_cabin" | "camping";
export type SourceType = 'reservation' | 'block';

export interface OccupationBase {
  fullName: string;
  email: string;
  phone: string;
  checkInDate: string;
  checkOutDate: string;
  unit: Unit;
  occupationType: OccupationType;
  numberOfPeople: number;
  reason?: string;
  breakfast: boolean;
  lunch: boolean;
}

export interface ReservationOccupationInput extends OccupationBase {
  source: "reservation";
  reservationCode: string;
  paid: boolean;  // actual payment handled
}

export interface BlockOccupationInput extends OccupationBase {
  source: "block";
  paid: false; // admin blocks, no payment
  reservationCode?: never;
}

export type OccupationInput =
  | (ReservationOccupationInput & OccupationBase)
  | (BlockOccupationInput & OccupationBase);


export interface OccupationOutput extends OccupationBase {
  id: string;
  createdAt: Date;
  source: 'reservation' | 'block';
  reservationCode?: string;
  paid: boolean;
}


// Booking form values (without reason)
export type BookingFormValues = Omit<OccupationBase, 'reason'>;
