'use client';

import { useState, useEffect } from 'react';
import { Unidad } from '../../../lib/reservas';
import {
  agregarBloqueo,
  eliminarBloqueo,
  obtenerBloqueos,
  Bloqueo,
  TipoBloqueo,
  seSuperpone,
} from '../../../lib/bloqueos';

const BLOQUEO_INICIAL: Bloqueo = {
  fechaInicio: '',
  fechaFin: '',
  unidad: 'este',
  tipoBloqueo: 'bloqueo_total',
  cantidadBloqueada: undefined,
  motivo: '',
};

export default function PanelBloqueos() {
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [form, setForm] = useState<Bloqueo>({ ...BLOQUEO_INICIAL });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarBloqueos = async () => {
    setCargando(true);
    const datos = await obtenerBloqueos();
    setBloqueos(datos);
    setCargando(false);
  };

  // Llamá cargarBloqueos al montar (opcional, o manual según querés)
  useEffect(() => {
    cargarBloqueos();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'cantidadBloqueada'
          ? Number(value)
          : value,
    }));
  };

  // Validar que no se solapen las fechas con bloqueos existentes
  const validarBloqueoNuevo = (nuevo: Bloqueo): boolean => {
    for (const b of bloqueos) {
      if (b.unidad === nuevo.unidad) {
        if (seSuperpone(b.fechaInicio, b.fechaFin, nuevo.fechaInicio, nuevo.fechaFin)) {
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validarBloqueoNuevo(form)) {
      setError('El bloqueo se superpone con uno existente para la misma unidad.');
      return;
    }

    await agregarBloqueo(form);
    setForm({ ...BLOQUEO_INICIAL });
    await cargarBloqueos();
  };

  const handleEliminar = async (id: string) => {
    if (confirm('¿Seguro querés eliminar este bloqueo?')) {
      await eliminarBloqueo(id);
      await cargarBloqueos();
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={cargarBloqueos}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Cargar bloqueos
      </button>

      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="date"
          name="fechaInicio"
          value={form.fechaInicio}
          onChange={handleChange}
          className="border p-2"
          required
        />
        <input
          type="date"
          name="fechaFin"
          value={form.fechaFin}
          onChange={handleChange}
          className="border p-2"
          required
        />
        <select
          name="unidad"
          value={form.unidad}
          onChange={handleChange}
          className="border p-2"
        >
          <option value="este">Habitación Este</option>
          <option value="oeste">Habitación Oeste</option>
          <option value="cabana">Cabaña</option>
          <option value="camping">Camping</option>
        </select>
        <select
          name="tipoBloqueo"
          value={form.tipoBloqueo}
          onChange={handleChange}
          className="border p-2"
        >
          <option value="bloqueo_total">Bloqueo total</option>
          <option value="bloqueo_parcial">Bloqueo parcial</option>
        </select>
        {form.tipoBloqueo === 'bloqueo_parcial' && (
          <input
            type="number"
            name="cantidadBloqueada"
            value={form.cantidadBloqueada ?? ''}
            onChange={handleChange}
            className="border p-2"
            placeholder="Cantidad bloqueada"
            min={1}
            required
          />
        )}
        <input
          type="text"
          name="motivo"
          value={form.motivo}
          onChange={handleChange}
          className="border p-2"
          placeholder="Motivo del bloqueo"
          required
        />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded col-span-1 sm:col-span-2">
          Guardar Bloqueo
        </button>
      </form>

      {cargando ? (
        <p>Cargando bloqueos...</p>
      ) : bloqueos.length === 0 ? (
        <p>No hay bloqueos cargados.</p>
      ) : (
        <table className="table-auto w-full border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">Unidad</th>
              <th className="border px-2 py-1">Inicio</th>
              <th className="border px-2 py-1">Fin</th>
              <th className="border px-2 py-1">Tipo</th>
              <th className="border px-2 py-1">Cantidad</th>
              <th className="border px-2 py-1">Motivo</th>
              <th className="border px-2 py-1">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {bloqueos.map((b) => (
              <tr key={b.id}>
                <td className="border px-2 py-1 capitalize">{b.unidad}</td>
                <td className="border px-2 py-1">{b.fechaInicio}</td>
                <td className="border px-2 py-1">{b.fechaFin}</td>
                <td className="border px-2 py-1">{b.tipoBloqueo}</td>
                <td className="border px-2 py-1">{b.tipoBloqueo === 'bloqueo_parcial' ? b.cantidadBloqueada : '-'}</td>
                <td className="border px-2 py-1">{b.motivo}</td>
                <td className="border px-2 py-1">
                  <button
                    onClick={() => handleEliminar(b.id!)}
                    className="bg-red-600 text-white px-2 py-1 rounded"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
