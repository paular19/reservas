// admin/PanelReservas.tsx
'use client';

import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { editarReserva, eliminarReserva } from '../../../lib/reservas';
import type { Unidad, TipoReserva, DatosReserva } from '../../../lib/reservas';

export type Reserva = DatosReserva & { id: string };

export default function PanelReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [form, setForm] = useState<Partial<Reserva>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const reservasPorPagina = 10;
  const [filtroUnidad, setFiltroUnidad] = useState('');

  const fetchReservas = async () => {
    const snapshot = await getDocs(collection(db, 'reservas'));
    const hoy = new Date();
    const validas: Reserva[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as DatosReserva;
      const fechaSalida = new Date(data.fechaSalida);
      if (fechaSalida >= hoy) {
        validas.push({ id: doc.id, ...data });
      }
    });

    validas.sort((a, b) => new Date(a.fechaIngreso).getTime() - new Date(b.fechaIngreso).getTime());
    setReservas(validas);
  };

  const handleEditarClick = (reserva: Reserva) => {
    setEditing(reserva.id);
    setForm(reserva);
  };

const handleFormChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
) => {
  const { name, value, type } = e.target;
  const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

  setForm((prev) => ({
    ...prev,
    [name]: type === 'checkbox' ? checked : value,
  }));
};


  const handleGuardar = async () => {
    if (!editing) return;
    await editarReserva(editing, form);
    setEditing(null);
    await fetchReservas();
  };

  const handleEliminar = async (id: string) => {
    if (confirm('¿Eliminar reserva?')) {
      await eliminarReserva(id);
      await fetchReservas();
    }
  };

  const reservasFiltradas = filtroUnidad ? reservas.filter((r) => r.unidad === filtroUnidad) : reservas;
  const totalPaginas = Math.ceil(reservasFiltradas.length / reservasPorPagina);
  const reservasPaginadas = reservasFiltradas.slice((paginaActual - 1) * reservasPorPagina, paginaActual * reservasPorPagina);

  return (
    <div>
      <button onClick={fetchReservas} className="mb-4 bg-blue-500 text-white px-4 py-2 rounded">Cargar Reservas</button>
      <select value={filtroUnidad} onChange={(e) => setFiltroUnidad(e.target.value)} className="border p-2 mb-4">
        <option value="">Todas</option>
        <option value="este">Habitación Este</option>
        <option value="oeste">Habitación Oeste</option>
        <option value="cabana">Cabaña</option>
        <option value="camping">Camping</option>
      </select>
      <table className="table-auto w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Nombre</th>
            <th className="border px-2 py-1">Unidad</th>
            <th className="border px-2 py-1">Tipo</th>
            <th className="border px-2 py-1">Ingreso</th>
            <th className="border px-2 py-1">Salida</th>
            <th className="border px-2 py-1">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {reservasPaginadas.map((r) => (
            <tr key={r.id} className="text-center">
              <td className="border px-2 py-1">{r.nombreCompleto}</td>
              <td className="border px-2 py-1">{r.unidad}</td>
              <td className="border px-2 py-1">{r.tipoReserva}</td>
              <td className="border px-2 py-1">{r.fechaIngreso}</td>
              <td className="border px-2 py-1">{r.fechaSalida}</td>
              <td className="border px-2 py-1 space-x-2">
                <button onClick={() => handleEditarClick(r)} className="bg-yellow-400 px-2 py-1 rounded">Editar</button>
                <button onClick={() => handleEliminar(r.id)} className="bg-red-600 text-white px-2 py-1 rounded">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex justify-center gap-2">
        <button disabled={paginaActual === 1} onClick={() => setPaginaActual((p) => p - 1)} className="bg-gray-200 px-3 py-1 rounded">Anterior</button>
        <span>Página {paginaActual} de {totalPaginas}</span>
        <button disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual((p) => p + 1)} className="bg-gray-200 px-3 py-1 rounded">Siguiente</button>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Editar Reserva</h2>
            <input name="nombreCompleto" value={form.nombreCompleto || ''} onChange={handleFormChange} className="w-full border p-2 mb-2" />
            <input name="email" value={form.email || ''} onChange={handleFormChange} className="w-full border p-2 mb-2" />
            <input name="telefono" value={form.telefono || ''} onChange={handleFormChange} className="w-full border p-2 mb-2" />
            <input type="date" name="fechaIngreso" value={form.fechaIngreso || ''} onChange={handleFormChange} className="w-full border p-2 mb-2" />
            <input type="date" name="fechaSalida" value={form.fechaSalida || ''} onChange={handleFormChange} className="w-full border p-2 mb-2" />
            <select name="unidad" value={form.unidad || ''} onChange={handleFormChange} className="w-full border p-2 mb-2">
              <option value="este">Este</option>
              <option value="oeste">Oeste</option>
              <option value="cabana">Cabaña</option>
              <option value="camping">Camping</option>
            </select>
            <select name="tipoReserva" value={form.tipoReserva || ''} onChange={handleFormChange} className="w-full border p-2 mb-2">
              <option value="cama_individual">Cama Individual</option>
              <option value="habitacion_completa">Habitación Completa</option>
              <option value="cabana_completa">Cabaña Completa</option>
              <option value="camping">Camping</option>
            </select>
            <input type="number" name="cantidadPersonas" value={form.cantidadPersonas || 0} onChange={handleFormChange} className="w-full border p-2 mb-2" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="bg-gray-400 px-4 py-2 rounded">Cancelar</button>
              <button onClick={handleGuardar} className="bg-green-600 text-white px-4 py-2 rounded">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
