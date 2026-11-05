import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aEventoDTO, ESTATUS_VALIDOS } from "@/lib/estatus";
import { parsearEventoPayload } from "@/lib/evento-payload";

// Actualización de estatus "en un toque".
// Reglas de la casa que el mesero aplica en la base:
//   · PAGADO      → el anticipo se liquida (anticipo = tarifa, saldo = 0)
//   · reabrir     → PAGADO regresa a REALIZADO con anticipo en 0
//   · CANCELADO   → guarda el motivo (razonCancelacion)
//   · reactivar  → el motivo de la cancelación se limpia
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as {
    estatus?: string;
    razonCancelacion?: string | null;
  } | null;

  if (!body?.estatus || !ESTATUS_VALIDOS.includes(body.estatus as never)) {
    return NextResponse.json(
      { error: "Estatus inválido" },
      { status: 400 }
    );
  }

  const estatus = body.estatus;
  const razon =
    typeof body.razonCancelacion === "string" &&
    body.razonCancelacion.trim() !== ""
      ? body.razonCancelacion.trim()
      : null;

  try {
    const actual = await db.evento.findUnique({ where: { id } });
    if (!actual) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = { estatus };
    if (estatus === "CANCELADO") {
      data.razonCancelacion = razon;
    } else if (actual.estatus === "CANCELADO") {
      // Al reactivar un evento cancelado, el motivo ya no aplica.
      data.razonCancelacion = null;
    }
    if (estatus === "PAGADO") {
      data.anticipo = actual.tarifa;
      data.saldo = 0;
    } else if (actual.estatus === "PAGADO" && estatus === "REALIZADO") {
      // Reabrir un pago: la caja vuelve a deber el total completo.
      data.anticipo = 0;
      data.saldo = actual.tarifa;
    }

    const actualizado = await db.evento.update({
      where: { id },
      data,
    });
    return NextResponse.json(aEventoDTO(actualizado));
  } catch {
    return NextResponse.json(
      { error: "Evento no encontrado" },
      { status: 404 }
    );
  }
}

// Eliminación de un evento (con confirmación en pantalla en el comedor)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.evento.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Evento no encontrado" },
      { status: 404 }
    );
  }
}

// Edición completa de un evento: tarifas, nombres, horarios, fechas…
// Los campos derivados (días, tipo de bloque, saldo) se recalculan solos.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const parsed = parsearEventoPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const actualizado = await db.evento.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(aEventoDTO(actualizado));
  } catch {
    return NextResponse.json(
      { error: "Evento no encontrado" },
      { status: 404 }
    );
  }
}
