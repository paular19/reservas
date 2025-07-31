'use client';

import React from 'react';
import { BookingForm } from '@/app/lib/hooks/useBookingForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

interface StepTwoFormProps {
  form: BookingForm;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPrev: () => void;
  onNext: () => void;
}

const StepTwoForm: React.FC<StepTwoFormProps> = ({ form, handleChange, onPrev, onNext }) => (
  <Card>
    <CardHeader>
      <h3 className="text-xl font-semibold text-dark-navy">Datos personales</h3>
    </CardHeader>
    
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="nombreCompleto">Nombre completo</Label>
          <Input
            id="nombreCompleto"
            type="text"
            name="nombreCompleto"
            value={form.nombreCompleto}
            onChange={handleChange}
            placeholder="Nombre completo"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            type="tel"
            name="telefono"
            value={form.telefono}
            onChange={handleChange}
            placeholder="Teléfono"
            required
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 pt-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="desayuno"
            name="desayuno"
            checked={form.desayuno}
            onCheckedChange={(checked) => {
              handleChange({
                target: {
                  name: 'desayuno',
                  value: checked,
                  type: 'checkbox'
                }
              } as React.ChangeEvent<HTMLInputElement>);
            }}
          />
          <Label htmlFor="desayuno">¿Desea desayuno?</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="almuerzo"
            name="almuerzo"
            checked={form.almuerzo}
            onCheckedChange={(checked) => {
              handleChange({
                target: {
                  name: 'almuerzo',
                  value: checked,
                  type: 'checkbox'
                }
              } as React.ChangeEvent<HTMLInputElement>);
            }}
          />
          <Label htmlFor="almuerzo">¿Desea almuerzo?</Label>
        </div>
      </div>
    </CardContent>

    <CardFooter className="flex flex-col gap-4"> {/* Cambiado a flex-col */}
      <Button
        type="button"
        variant="outline"
        onClick={onPrev}
        className="w-full"
      >
        Volver
      </Button>
      <Button
        type="button"
        onClick={onNext}
        className="w-full"
      >
        Continuar
      </Button>
    </CardFooter>
  </Card>
);

export default StepTwoForm;