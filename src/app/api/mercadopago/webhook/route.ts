import { NextRequest, NextResponse } from "next/server";
import { crearReservaWebhook } from "../../../lib/reservas";
import { MercadoPagoConfig, Payment } from "mercadopago";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
const paymentClient = new Payment(mp);

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("📥 Webhook recibido:", body);

  if (body.type === "payment") {
    const paymentId = body.data.id;

    try {
      console.log("🔍 Consultando payment ID:", paymentId);
      const payment = await paymentClient.get({ id: paymentId });

      console.log("✅ Pago obtenido:", payment);

      if (payment.status === "approved") {
        const metadata = payment.metadata;
        console.log("📦 Metadata recibida:", metadata);

        if (!metadata?.nombre_completo || !metadata?.email) {
          console.error("❌ Metadata incompleta:", metadata);
          return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }

        await crearReservaWebhook({
          nombreCompleto: metadata.nombre_completo,
          email: metadata.email,
          unidad: metadata.unidad,
          fechaIngreso: metadata.fecha_ingreso,
          fechaSalida: metadata.fecha_salida,
          telefono: metadata.telefono,
          pagado: true,
        });

        console.log("✅ Reserva guardada correctamente");
      }

      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("❌ Error en el webhook:", err);
      return NextResponse.json({ error: "Error procesando webhook" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
