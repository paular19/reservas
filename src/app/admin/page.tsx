'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '../../../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { ADMIN_EMAILS } from '../../../lib/autorizados';
import { eliminarReserva, editarReserva } from '../../../lib/reservas';

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReserva, setEditingReserva] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [paginaActual, setPaginaActual] = useState(1);
  const reservasPorPagina = 10;
  const [filtroUnidad, setFiltroUnidad] = useState("");

  useEffect(() => {
    onAuthStateChanged(auth, async (usuario) => {
      setUser(usuario);
      setLoading(false);
      if (usuario?.email && ADMIN_EMAILS.includes(usuario.email)) {
    await cargarReservas();
    }
    });
  }, []);

  const cargarReservas = async () => {
    const snapshot = await getDocs(collection(db, 'reservas'));
    const hoy = new Date();

    const reservasValidas: any[] = [];
    const reservasVencidas: string[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const fechaSalida = new Date(data.fechaSalida);

      if (fechaSalida < hoy) {
        reservasVencidas.push(doc.id);
      } else {
        reservasValidas.push({ id: doc.id, ...data });
      }
    });

    for (const id of reservasVencidas) {
      await eliminarReserva(id);
    }

    reservasValidas.sort((a, b) => new Date(a.fechaIngreso).getTime() - new Date(b.fechaIngreso).getTime());
    setReservas(reservasValidas);
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setReservas([]);
  };

  const handleEliminar = async (id: string) => {
    if (confirm("¿Seguro querés eliminar esta reserva?")) {
      await eliminarReserva(id);
      await cargarReservas();
    }
  };

  const handleEditarClick = (reserva: any) => {
    setEditingReserva(reserva);
    setForm({ ...reserva });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleGuardar = async () => {
    try {
      await editarReserva(editingReserva.id, form);
      setEditingReserva(null);
      await cargarReservas();
      alert("Reserva actualizada");
    } catch (error) {
      alert("Error al actualizar la reserva");
    }
  };

  const reservasFiltradas = reservas.filter((r) =>
    filtroUnidad ? r.unidad === filtroUnidad : true
  );

  const totalPaginas = Math.ceil(reservasFiltradas.length / reservasPorPagina);
  const reservasPaginadas = reservasFiltradas.slice(
    (paginaActual - 1) * reservasPorPagina,
    paginaActual * reservasPorPagina
  );

  if (loading) return <p className="p-4">Cargando...</p>;

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p className="mb-4">Iniciá sesión para acceder al panel de administración.</p>
        <button onClick={login} className="bg-blue-600 text-white px-4 py-2 rounded">Ingresar con Google</button>
      </div>
    );
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    return <p className="p-4 text-red-600">Acceso denegado: este email no está autorizado.</p>;
  }

  return (
    <div className="p-4">
      <button onClick={logout} className="mb-4 bg-red-600 text-white px-3 py-1 rounded">Cerrar sesión</button>
      <h1 className="text-2xl font-bold mb-4">Reservas del Refugio</h1>

      <div className="mb-4">
        <select
          value={filtroUnidad}
          onChange={(e) => {
            setFiltroUnidad(e.target.value);
            setPaginaActual(1);
          }}
          className="border p-2"
        >
          <option value="">Todas las unidades</option>
          <option value="este">Habitación Este</option>
          <option value="oeste">Habitación Oeste</option>
          <option value="cabana">Cabaña</option>
          <option value="camping">Camping</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="table-auto w-full border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">Nombre</th>
              <th className="border px-2 py-1">Unidad</th>
              <th className="border px-2 py-1">Tipo</th>
              <th className="border px-2 py-1">Ingreso</th>
              <th className="border px-2 py-1">Salida</th>
              <th className="border px-2 py-1">Personas</th>
              <th className="border px-2 py-1">Desayuno</th>
              <th className="border px-2 py-1">Almuerzo</th>
              <th className="border px-2 py-1">Email</th>
              <th className="border px-2 py-1">Teléfono</th>
              <th className="border px-2 py-1">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservasPaginadas.map((r) => (
              <tr key={r.id} className="text-center">
                <td className="border px-2 py-1">{r.nombreCompleto}</td>
                <td className="border px-2 py-1 capitalize">{r.unidad}</td>
                <td className="border px-2 py-1">{r.tipoReserva}</td>
                <td className="border px-2 py-1">{r.fechaIngreso}</td>
                <td className="border px-2 py-1">{r.fechaSalida}</td>
                <td className="border px-2 py-1">{r.cantidadPersonas}</td>
                <td className="border px-2 py-1">{r.desayuno ? 'Sí' : 'No'}</td>
                <td className="border px-2 py-1">{r.almuerzo ? 'Sí' : 'No'}</td>
                <td className="border px-2 py-1">{r.email}</td>
                <td className="border px-2 py-1">{r.telefono}</td>
                <td className="border px-2 py-1 space-x-2">
                  <button onClick={() => handleEditarClick(r)} className="bg-yellow-400 px-2 py-1 rounded">Editar</button>
                  <button onClick={() => handleEliminar(r.id)} className="bg-red-600 text-white px-2 py-1 rounded">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
          disabled={paginaActual === 1}
          className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
        >Anterior</button>
        <span>Página {paginaActual} de {totalPaginas}</span>
        <button
          onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
          disabled={paginaActual === totalPaginas}
          className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
        >Siguiente</button>
      </div>

      {editingReserva && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded max-w-lg w-full space-y-4 relative">
            <h2 className="text-xl font-bold mb-2">Editar Reserva</h2>
            <input type="text" name="nombreCompleto" value={form.nombreCompleto} onChange={handleFormChange} className="w-full border p-2" />
            <input type="email" name="email" value={form.email} onChange={handleFormChange} className="w-full border p-2" />
            <input type="text" name="telefono" value={form.telefono} onChange={handleFormChange} className="w-full border p-2" />
            <input type="date" name="fechaIngreso" value={form.fechaIngreso} onChange={handleFormChange} className="w-full border p-2" />
            <input type="date" name="fechaSalida" value={form.fechaSalida} onChange={handleFormChange} className="w-full border p-2" />
            <select name="unidad" value={form.unidad} onChange={handleFormChange} className="w-full border p-2">
              <option value="este">Habitación Este</option>
              <option value="oeste">Habitación Oeste</option>
              <option value="cabana">Cabaña Completa</option>
              <option value="camping">Camping</option>
            </select>
            <select name="tipoReserva" value={form.tipoReserva} onChange={handleFormChange} className="w-full border p-2">
              <option value="cama_individual">Cama Individual</option>
              <option value="habitacion_completa">Habitación Completa</option>
              <option value="cabana_completa">Cabaña Completa</option>
              <option value="camping">Camping</option>
            </select>
            {(form.tipoReserva === 'cama_individual' || form.unidad === 'camping') && (
              <input type="number" name="cantidadPersonas" min={1} value={form.cantidadPersonas} onChange={handleFormChange} className="w-full border p-2" />
            )}
            <label className="inline-flex items-center space-x-2">
              <input type="checkbox" name="desayuno" checked={form.desayuno || false} onChange={handleFormChange} />
              <span>Desayuno</span>
            </label>
            <label className="inline-flex items-center space-x-2">
              <input type="checkbox" name="almuerzo" checked={form.almuerzo || false} onChange={handleFormChange} />
              <span>Almuerzo</span>
            </label>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setEditingReserva(null)} className="bg-gray-400 px-4 py-2 rounded">Cancelar</button>
              <button onClick={handleGuardar} className="bg-green-600 text-white px-4 py-2 rounded">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
