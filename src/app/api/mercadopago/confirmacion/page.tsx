// app/confirmacion/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ConfirmacionPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('verificando');

  useEffect(() => {
    const paymentStatus = searchParams.get('status');
    if (paymentStatus === 'approved') {
      setStatus('aprobado');
    } else if (paymentStatus === 'pending') {
      setStatus('pendiente');
    } else {
      setStatus('fallido');
    }
  }, [searchParams]);

  return (
    <div className="p-4 text-center">
      {status === 'aprobado' && <h1 className="text-green-700 text-2xl font-bold">¡Gracias por tu reserva! El pago fue aprobado ✅</h1>}
      {status === 'pendiente' && <h1 className="text-yellow-600 text-2xl font-bold">Tu pago está pendiente ⏳</h1>}
      {status === 'fallido' && <h1 className="text-red-600 text-2xl font-bold">Hubo un error con el pago ❌</h1>}
    </div>
  );
}
