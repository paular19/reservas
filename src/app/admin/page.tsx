// admin/AdminPage.tsx
'use client';

import { useEffect, useState } from 'react';
import { auth } from '../../../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { ADMIN_EMAILS } from '../../../lib/autorizados';
import PanelReservas from './panelReservas';
import PanelBloqueos from './panelBloqueos';

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [panelActivo, setPanelActivo] = useState<'reservas' | 'bloqueos'>('reservas');

  useEffect(() => {
    onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
      setLoading(false);
    });
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

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
      <h1 className="text-2xl font-bold mb-4">Panel de Administración</h1>
      <div className="mb-4 space-x-2">
        <button onClick={() => setPanelActivo('reservas')} className={`px-3 py-2 rounded ${panelActivo === 'reservas' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
          Reservas
        </button>
        <button onClick={() => setPanelActivo('bloqueos')} className={`px-3 py-2 rounded ${panelActivo === 'bloqueos' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
          Bloqueos
        </button>
      </div>

      {panelActivo === 'reservas' ? <PanelReservas /> : <PanelBloqueos />}
    </div>
  );
}
