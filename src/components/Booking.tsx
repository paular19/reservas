'use client';

import React, { useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { Wallet, initMercadoPago } from '@mercadopago/sdk-react';
import { useBookingForm } from '@/app/lib/hooks/useBookingForm';
import { useMP } from '@/app/lib/hooks/useMP';
import StepOneForm from './StepOneForm';
import StepTwoForm from './StepTwoForm';
import StepThreeSummary from './StepThreeSummary';
import StepIndicator from './StepIndicator';

initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, { locale: 'es-AR' });

const Booking = () => {
  const {
    form,
    setForm,
    handleChange,
    calculateNights,
    getTotal,
  } = useBookingForm();

  const {
    preferenceId,
    loading,
    showWallet,
    createPreference,
  } = useMP();

  const [currentStep, setCurrentStep] = useState(1);

  const handleCreatePreference = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPreference(form);
  };

  const handleNextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

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
          <StepIndicator currentStep={currentStep} />
          
          <form onSubmit={handleCreatePreference} className="space-y-6">
            {currentStep === 1 && (
              <StepOneForm 
                form={form}
                handleChange={handleChange}
                onNext={handleNextStep}
                setForm={setForm}
              />
            )}

            {currentStep === 2 && (
              <StepTwoForm 
                form={form}
                handleChange={handleChange}
                onPrev={handlePrevStep}
                onNext={handleNextStep}
              />
            )}

            {currentStep === 3 && (
              <StepThreeSummary
                form={form}
                calculateNights={calculateNights}
                getTotal={getTotal}
                onPrev={handlePrevStep}
                loading={loading}
                showWallet={showWallet}
                preferenceId={preferenceId}
              />
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default Booking;