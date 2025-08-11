// lib/hooks/useBloqueos.ts
import { useState } from 'react';
import { crearBloqueo } from '../bloqueos';
import type { BlockInput } from '@/types/bloqueos'; 

export function useBloqueos() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCrearBloqueo = async (data: BlockInput) => {
    setLoading(true);
    try {
      await crearBloqueo(data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { crearBloqueo: handleCrearBloqueo, loading, error };
}