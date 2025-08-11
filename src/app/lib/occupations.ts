import {
  collection, addDoc, getDocs, getDoc, deleteDoc,
  updateDoc, doc, QueryDocumentSnapshot, DocumentData,
  startAfter, limit, Timestamp, query, where
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Unit,
  OccupationInput,
  OccupationOutput,
  ReservationOccupationInput,
} from "@/types/occupations";


// Maximum capacities
export const capacities = {
  east: 4,
  west: 4,
  cabin: 8,
  camping: 50,
  bed: 30,
} as const;

const PAGE_SIZE = 2;


const mapOccupationDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): OccupationOutput => {
  const data = docSnap.data() as OccupationInput;

  return {
    id: docSnap.id,
    ...data,
    createdAt: (docSnap.data().createdAt as any)?.toDate?.() || new Date(),
  };
};


export function overlaps(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();
  return s1 < e2 && s2 < e1;
}

// Basic CRUD

export async function getOccupations(): Promise<OccupationOutput[]> {
  const snap = await getDocs(collection(db, "occupations"));
  return snap.docs.map(mapOccupationDoc);
}

export async function getOccupationsPaginated(lastDoc?: any): Promise<OccupationOutput[]> {
  const q = query(
    collection(db, "occupations"),
    ...(lastDoc ? [startAfter(lastDoc)] : []),
    limit(PAGE_SIZE)
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapOccupationDoc);
}

export async function getOccupationsByUnit(unit: Unit): Promise<OccupationOutput[]> {
  const q = query(collection(db, "occupations"), where("unit", "==", unit));
  const snap = await getDocs(q);
  return snap.docs.map(mapOccupationDoc);
}

export async function getOverlappingOccupations(
  unit: Unit,
  startDate: string,
  endDate: string
): Promise<OccupationOutput[]> {
  const unitOccupations = await getOccupationsByUnit(unit);
  return unitOccupations.filter(o =>
    overlaps(o.checkInDate, o.checkOutDate, startDate, endDate)
  );
}

export async function createOccupation(data: OccupationInput): Promise<OccupationOutput> {
  const docRef = await addDoc(collection(db, "occupations"), {
    ...data,
    paid: data.source === "reservation" ? false : undefined,
    createdAt: Timestamp.now()
  });
  return mapOccupationDoc(await getDoc(docRef) as QueryDocumentSnapshot<DocumentData>);
}

export async function updateOccupation(id: string, changes: Partial<OccupationInput>): Promise<void> {
  await updateDoc(doc(db, "occupations", id), changes);
}

export async function deleteOccupation(id: string): Promise<void> {
  await deleteDoc(doc(db, "occupations", id));
}

function validateUnitCapacity(unit: Unit, quantity: number): void {
  if (quantity <= 0) throw new Error("Cantidad de personas debe ser mayor a cero");
  if (quantity > capacities[unit]) {
    throw new Error(`Excede la capacidad máxima de ${capacities[unit]} para ${unit}`);
  }
}

export async function calculateAvailability(
  unit: Unit,
  startDate: string,
  endDate: string
): Promise<number> {
  const occupations = await getOverlappingOccupations(unit, startDate, endDate);
  const totalOccupied = occupations.reduce((sum, o) => sum + o.numberOfPeople, 0);
  return Math.max(0, capacities[unit] - totalOccupied);
}

// Validation + creation with business rules

export async function validateAndCreateOccupation(data: OccupationInput): Promise<OccupationOutput | OccupationOutput[]> {
  validateUnitCapacity(data.unit, data.numberOfPeople);

  if (data.unit === "cabin") {
    if (data.occupationType !== "full_cabin") {
      throw new Error("La cabaña solo puede reservarse completa.");
    }

    // Force people count to exact cabin capacity
    data.numberOfPeople = capacities.cabin;

    const availEast = await calculateAvailability("east", data.checkInDate, data.checkOutDate);
    const availWest = await calculateAvailability("west", data.checkInDate, data.checkOutDate);

    if (availEast < capacities.east || availWest < capacities.west) {
      throw new Error("No hay disponibilidad para reservar la cabaña completa (habitaciones Este y Oeste).");
    }

    const reservationEast = await createOccupation({
      ...data,
      unit: "east",
      occupationType: "full_room",
      numberOfPeople: capacities.east,
    });

    const reservationWest = await createOccupation({
      ...data,
      unit: "west",
      occupationType: "full_room",
      numberOfPeople: capacities.west,
    });

    return [reservationEast, reservationWest];
  }

  if (data.unit === "east" || data.unit === "west") {
    if (data.occupationType !== "full_room") {
      throw new Error(`La habitación ${data.unit} debe reservarse completa.`);
    }

    // Force people count to fixed room capacity
    data.numberOfPeople = capacities[data.unit];

    const avail = await calculateAvailability(data.unit, data.checkInDate, data.checkOutDate);
    if (data.numberOfPeople > avail) {
      throw new Error(`No hay disponibilidad para reservar la habitación ${data.unit} completa.`);
    }

    return await createOccupation(data);
  }

  // Camping and bed keep the number as is, for per-person reservation
  if (data.unit === "camping") {
    if (data.occupationType !== "camping") {
      throw new Error("Para camping, el tipo de ocupación debe ser 'camping'.");
    }

    const avail = await calculateAvailability("camping", data.checkInDate, data.checkOutDate);
    if (data.numberOfPeople > avail) {
      throw new Error(`No hay disponibilidad suficiente para reservar ${data.numberOfPeople} plazas de camping.`);
    }

    return await createOccupation(data);
  }

  if (data.unit === "bed") {
    if (data.occupationType !== "single_bed") {
      throw new Error("Para cama, el tipo de ocupación debe ser 'cama_individual'.");
    }

    const avail = await calculateAvailability("bed", data.checkInDate, data.checkOutDate);
    if (data.numberOfPeople > avail) {
      throw new Error(`No hay disponibilidad suficiente para reservar ${data.numberOfPeople} camas.`);
    }

    return await createOccupation(data);
  }

  throw new Error("Unidad no válida para reserva");
}

export async function createOccupationWebhook(data: ReservationOccupationInput): Promise<OccupationOutput> {
  if (!data.source || data.source !== 'reservation') {
    throw new Error('El campo vieneDe debe ser "reserva"');
  }
  if (!data.reservationCode) {
    throw new Error('El campo codigoReserva es obligatorio');
  }
  if (typeof data.paid !== 'boolean') {
    throw new Error('El campo pagado debe ser boolean');
  }

  return createOccupation(data);
}
