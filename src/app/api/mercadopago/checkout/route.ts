import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export const runtime = 'nodejs';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

const preference = new Preference(client);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombreCompleto, email, unidad, fechaIngreso, fechaSalida, telefono } = body;

  try {
    const result = await preference.create({
      body: {
        items: [
          {
            id: 'reserva_unica',
            title: `Reserva en ${unidad}`,
            quantity: 1,
            currency_id: 'ARS',
            unit_price: 1,
          },
        ],
        payer: {
          name: nombreCompleto,
          email,
        },
        
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_RETURN_URL}/api/mercadopago/confirmacion`,
          failure: `${process.env.NEXT_PUBLIC_RETURN_URL}/api/mercadopago/error`,
          pending: `${process.env.NEXT_PUBLIC_RETURN_URL}/api/mercadopago/pendiente`,
        },
        auto_return: 'approved',
        metadata: {
          nombreCompleto,
          email,
          unidad,
          fechaIngreso,
          fechaSalida,
          telefono,
        },
      },
    });

    return NextResponse.json({ preferenceId: result.id, init_point: result.init_point });
  } catch (err) {
    console.error('❌ Error al crear preferencia de Mercado Pago:', err);
    return NextResponse.json({ error: 'Error al crear preferencia' }, { status: 500 });
  }
}
