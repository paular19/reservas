import { useState } from 'react';
import { getOccupations, deleteOccupation } from '@/app/lib/occupations'; 
import { OccupationOutput } from '@/types/occupations';

export function useOccupations() {
  const [occupations, setOccupations] = useState<OccupationOutput[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOccupations = async () => {
    setLoading(true);
    try {
      const allOccupations = await getOccupations();
      const today = new Date();

      const validOccupations: OccupationOutput[] = [];
      const expiredOccupationsIds: string[] = [];

      allOccupations.forEach((occupation) => {
        const checkOutDate = new Date(occupation.checkOutDate);
        if (checkOutDate < today) {
          expiredOccupationsIds.push(occupation.id);
        } else {
          validOccupations.push(occupation);
        }
      });

      for (const id of expiredOccupationsIds) {
        await deleteOccupation(id);
      }

      validOccupations.sort(
        (a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime()
      );

      setOccupations(validOccupations);
    } finally {
      setLoading(false);
    }
  };

  return { occupations, loading, loadOccupations, setOccupations };
}
