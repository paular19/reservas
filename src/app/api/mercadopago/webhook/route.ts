import { NextRequest, NextResponse } from "next/server";
import { crearReservaWebhook } from "../../../../../lib/reservas";
import { MercadoPagoConfig, Payment } from "mercadopago";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
const paymentClient = new Payment(mp);

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.type === "payment") {
    const paymentId = body.data.id;

    try {
      const payment = await paymentClient.get({ id: paymentId });

      if (payment.status === "approved") {
        const metadata = payment.metadata;

        if (metadata) {
          await crearReservaWebhook({
            nombreCompleto: metadata.nombre,
            email: metadata.email,
            unidad: metadata.unidad,
            fechaIngreso: metadata.fechaIngreso,
            fechaSalida: metadata.fechaSalida,
            telefono: metadata.telefono,
            pagado: true,
          });
        }
      }

      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("Error en el webhook:", err);
      return NextResponse.json({ error: "Error procesando webhook" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
