'use client';

import React, { useState, useEffect } from 'react';
import { Check, Clock } from 'lucide-react';
import { Wallet, initMercadoPago } from '@mercadopago/sdk-react';

// Inicializa Mercado Pago
initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, { locale: 'es-AR' });

const Booking = () => {
  const [form, setForm] = useState({
    nombreCompleto: '',
    email: '',
    telefono: '',
    fechaIngreso: '',
    fechaSalida: '',
    unidad: 'este',
    tipoReserva: 'cama_individual',
    cantidadPersonas: 1,
    desayuno: false,
    almuerzo: false,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loadingMP, setLoadingMP] = useState(false);
  const [showWallet, setShowWallet] = useState(false);

  // Ajustar tipoReserva según unidad
  useEffect(() => {
    if (form.unidad === 'cabana') {
      setForm((f) => ({ ...f, tipoReserva: 'cabana_completa' }));
    } else if (form.unidad === 'camping') {
      setForm((f) => ({ ...f, tipoReserva: 'camping' }));
    } else if (form.unidad === 'este' || form.unidad === 'oeste') {
      if (form.tipoReserva !== 'cama_individual' && form.tipoReserva !== 'habitacion_completa') {
        setForm((f) => ({ ...f, tipoReserva: 'cama_individual' }));
      }
    }
  }, [form.unidad]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : name === 'cantidadPersonas'
        ? Number(value)
        : value;

    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    setShowWallet(false);
    setPreferenceId(null);
  };

  const calculateNights = () => {
    if (form.fechaIngreso && form.fechaSalida) {
      const inDate = new Date(form.fechaIngreso);
      const outDate = new Date(form.fechaSalida);
      const diff = outDate.getTime() - inDate.getTime();
      return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
    }
    return 0;
  };

  const getRoomPrice = () => {
    if (form.unidad === 'cabana') return 20000;
    if (form.unidad === 'camping') return 5000;
    if (form.tipoReserva === 'habitacion_completa') return 15000;
    return 8000; // cama_individual
  };

  const getTotal = () => {
    const nights = calculateNights();
    const base = nights * getRoomPrice();
    const extras = (form.desayuno ? 2000 : 0) + (form.almuerzo ? 3000 : 0);
    const personas = form.tipoReserva === 'cama_individual' || form.unidad === 'camping' ? form.cantidadPersonas : 1;
    return (base + extras) * personas;
  };

  const handleCrearPreference = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.fechaSalida <= form.fechaIngreso) {
      alert('La fecha de salida debe ser posterior a la de ingreso.');
      return;
    }

    setLoadingMP(true);
    try {
      const res = await fetch('/api/mercadopago/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.preferenceId) {
        setPreferenceId(data.preferenceId);
        setShowWallet(true);
      } else {
        alert('No se recibió el preferenceId.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al conectar con Mercado Pago.');
    } finally {
      setLoadingMP(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center gap-4">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= step ? 'bg-navy-blue text-white' : 'bg-gray-200'
              }`}
            >
              {currentStep > step ? <Check size={16} /> : step}
            </div>
            {step < 3 && (
              <div
                className={`w-12 h-1 ${currentStep > step ? 'bg-navy-blue' : 'bg-gray-200'}`}
              ></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <section className="py-20 bg-light-beige">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-dark-navy mb-4">Reserva tu Estadía</h2>
          <p className="text-xl text-dark-navy/70">
            Completá los pasos para reservar tu lugar en el refugio
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <StepIndicator />

          <form onSubmit={handleCrearPreference} className="space-y-6">
            {currentStep === 1 && (
              <>
                <h3 className="text-xl font-semibold text-dark-navy">Fechas y unidad</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input type="date" name="fechaIngreso" value={form.fechaIngreso} onChange={handleChange} className="border p-2 rounded" required />
                  <input type="date" name="fechaSalida" value={form.fechaSalida} onChange={handleChange} className="border p-2 rounded" required />
                  <select name="unidad" value={form.unidad} onChange={handleChange} className="border p-2 rounded">
                    <option value="este">Habitación Este</option>
                    <option value="oeste">Habitación Oeste</option>
                    <option value="cabana">Cabaña Completa</option>
                    <option value="camping">Camping</option>
                  </select>
                  {(form.unidad === 'este' || form.unidad === 'oeste') && (
                    <select name="tipoReserva" value={form.tipoReserva} onChange={handleChange} className="border p-2 rounded">
                      <option value="cama_individual">Cama individual</option>
                      <option value="habitacion_completa">Habitación completa</option>
                    </select>
                  )}
                  {(form.tipoReserva === 'cama_individual' || form.unidad === 'camping') && (
                    <input
                      type="number"
                      name="cantidadPersonas"
                      value={form.cantidadPersonas}
                      onChange={handleChange}
                      className="border p-2 rounded"
                      min={1}
                      max={form.unidad === 'camping' ? 50 : 4}
                    />
                  )}
                </div>
                <button type="button" onClick={() => setCurrentStep(2)} className="btn-primary w-full">
                  Continuar
                </button>
              </>
            )}

            {currentStep === 2 && (
              <>
                <h3 className="text-xl font-semibold text-dark-navy">Datos personales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input type="text" name="nombreCompleto" value={form.nombreCompleto} onChange={handleChange} placeholder="Nombre completo" required className="border p-2 rounded" />
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email" required className="border p-2 rounded" />
                  <input type="tel" name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" required className="border p-2 rounded" />
                </div>
                <div className="flex gap-4">
                  <label className="flex gap-2 items-center">
                    <input type="checkbox" name="desayuno" checked={form.desayuno} onChange={handleChange} />
                    ¿Desea desayuno?
                  </label>
                  <label className="flex gap-2 items-center">
                    <input type="checkbox" name="almuerzo" checked={form.almuerzo} onChange={handleChange} />
                    ¿Desea almuerzo?
                  </label>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary w-full">Volver</button>
                  <button type="button" onClick={() => setCurrentStep(3)} className="btn-primary w-full">Continuar</button>
                </div>
              </>
            )}

            {currentStep === 3 && (
              <>
                <h3 className="text-xl font-semibold text-dark-navy">Resumen</h3>
                <ul className="space-y-2 text-dark-navy">
                  <li><strong>Fechas:</strong> {form.fechaIngreso} a {form.fechaSalida} ({calculateNights()} noches)</li>
                  <li><strong>Unidad:</strong> {form.unidad}</li>
                  <li><strong>Tipo de reserva:</strong> {form.tipoReserva}</li>
                  <li><strong>Personas:</strong> {form.cantidadPersonas}</li>
                  <li><strong>Extras:</strong> {form.desayuno ? 'Desayuno' : ''} {form.almuerzo ? 'Almuerzo' : ''}</li>
                  <li className="text-xl font-bold mt-2">Total: ${getTotal().toLocaleString()}</li>
                </ul>

                <div className="bg-yellow-100 text-yellow-900 p-4 rounded flex items-center gap-2 text-sm">
                  <Clock size={18} />
                  Te redirigiremos al medio de pago para confirmar tu reserva.
                </div>

                <div className="flex gap-4 mt-4">
                  <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary w-full">Volver</button>
                  <button type="submit" className="btn-primary w-full">Pagar con Mercado Pago</button>
                </div>

                {loadingMP && <p className="mt-4 text-sm text-gray-500">Cargando medios de pago...</p>}

                {showWallet && preferenceId && (
                  <div className="mt-6">
                    <Wallet initialization={{ preferenceId }} />
                  </div>
                )}
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default Booking;
