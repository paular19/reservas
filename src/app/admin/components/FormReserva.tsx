// app/admin/reservas/components/FormReserva.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ReservaOutput, Unidad, TipoReserva } from '@/types/reservas';

interface FormReservaProps {
  reserva?: Partial<ReservaOutput>;
  onSave: (data: Partial<ReservaOutput>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function FormReserva({ 
  reserva = {}, 
  onSave, 
  onCancel, 
  loading = false 
}: FormReservaProps) {
  const [form, setForm] = useState<Partial<ReservaOutput>>({
    ...reserva,
    fechaIngreso: reserva.fechaIngreso?.split('T')[0] || '',
    fechaSalida: reserva.fechaSalida?.split('T')[0] || ''
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? Number(value) : 
              value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {reserva?.id ? 'Editar Reserva' : 'Nueva Reserva'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
              <input
                name="nombreCompleto"
                value={form.nombreCompleto || ''}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  name="email"
                  value={form.email || ''}
                  onChange={handleChange}
                  type="email"
                  className="w-full border p-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input
                  name="telefono"
                  value={form.telefono || ''}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha Ingreso</label>
                <input
                  type="date"
                  name="fechaIngreso"
                  value={form.fechaIngreso || ''}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha Salida</label>
                <input
                  type="date"
                  name="fechaSalida"
                  value={form.fechaSalida || ''}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Unidad</label>
                <select
                  name="unidad"
                  value={form.unidad || ''}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="este">Habitación Este</option>
                  <option value="oeste">Habitación Oeste</option>
                  <option value="cabana">Cabaña Completa</option>
                  <option value="camping">Camping</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  name="tipoReserva"
                  value={form.tipoReserva || ''}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="cama_individual">Cama Individual</option>
                  <option value="habitacion_completa">Habitación Completa</option>
                  <option value="cabana_completa">Cabaña Completa</option>
                  <option value="camping">Camping</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cantidad de Personas</label>
              <input
                type="number"
                name="cantidadPersonas"
                value={form.cantidadPersonas || 0}
                onChange={handleChange}
                min="1"
                className="w-full border p-2 rounded"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="desayuno"
                checked={!!form.desayuno}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Incluye Desayuno</label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="almuerzo"
                checked={!!form.almuerzo}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Incluye Almuerzo</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}