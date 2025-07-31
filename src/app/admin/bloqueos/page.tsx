// app/admin/bloqueos/page.tsx
'use client';

import { obtenerBloqueos, eliminarBloqueo } from '@/app/lib/bloqueos';
import { TablaBloqueos } from '../components/TablaBloqueos';
import { FormularioBloqueo } from '../components/FormBloqueos';
import { useEffect, useState } from 'react';
import type { BlockOutput } from '@/types/bloqueos';
import { toast } from 'sonner';

export default function Page() {
  const [bloqueos, setBloqueos] = useState<BlockOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const cargarBloqueos = async () => {
    setLoading(true);
    try {
      const datos = await obtenerBloqueos();
      setBloqueos(datos);
    } catch (error) {
      console.error('Error cargando bloqueos:', error);
      toast.error('Error al cargar bloqueos');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarBloqueo = async (id: string) => {
    try {
      await eliminarBloqueo(id);
      // Actualización optimista del estado local
      setBloqueos(prev => prev.filter(bloqueo => bloqueo.id !== id));
      toast.success('Bloqueo eliminado correctamente');
    } catch (error) {
      console.error('Error eliminando bloqueo:', error);
      toast.error('No se pudo eliminar el bloqueo');
      // Recargar para sincronizar con el servidor si falla
      cargarBloqueos();
    }
  };

  useEffect(() => {
    cargarBloqueos();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Cargando bloqueos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestión de Bloqueos</h2>
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {mostrarFormulario ? 'Ocultar formulario' : 'Nuevo Bloqueo'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <FormularioBloqueo 
            onSuccess={() => {
              cargarBloqueos();
              setMostrarFormulario(false);
            }} 
          />
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow-md">
        {bloqueos.length === 0 ? (
          <p className="text-gray-500">No hay bloqueos registrados</p>
        ) : (
          <TablaBloqueos 
            data={bloqueos} 
            onDelete={handleEliminarBloqueo} 
          />
        )}
      </div>
    </div>
  );
}