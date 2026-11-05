"use client";

import { useMemo } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Download, MessageCircle } from "lucide-react";
import {
  ESTATUS_CONFIG,
  ESTATUS_VALIDOS,
  formatoTarifa,
  MODALIDAD_CONFIG,
  normalizarWhatsApp,
  type EventoDTO,
} from "@/lib/estatus";
import { SUPERFICIE_TARJETA } from "@/lib/temas";
import { fechaDisplay } from "@/lib/fechas";
import { useHoy } from "@/hooks/use-hoy";

interface Props {
  eventos: EventoDTO[];
}

const saldoDe = (e: EventoDTO) =>
  e.saldo ?? Math.max(e.tarifa - (e.anticipo ?? 0), 0);

function parsearLimite(t: string | null): Date | null {
  if (!t) return null;
  // Fecha de solo día: mediodía local (estable en cualquier zona horaria).
  // Instante ISO completo: fecha de exhibición (día de calendario UTC).
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return new Date(t + "T12:00:00");
  return fechaDisplay(t);
}

function rangoCorto(ini: Date, fin: Date | null): string {
  if (!fin || ini.toDateString() === fin.toDateString()) {
    return format(ini, "d MMM", { locale: es });
  }
  if (ini.getMonth() === fin.getMonth() && ini.getFullYear() === fin.getFullYear()) {
    return `${ini.getDate()}–${fin.getDate()} ${format(ini, "MMM", { locale: es })}`;
  }
  return `${format(ini, "d MMM", { locale: es })} – ${format(fin, "d MMM", { locale: es })}`;
}

function Seccion({
  titulo,
  conteo,
  children,
}: {
  titulo: string;
  conteo?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      style={SUPERFICIE_TARJETA}
      className="radio-tarjeta border border-linea-suave bg-tarjeta-baja p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-acento/80">
          {titulo}
        </h2>
        {conteo !== undefined ? (
          <span className="rounded-full border border-linea-fuerte bg-panel px-2 py-0.5 text-[10px] font-medium text-tinta-muda">
            {conteo}
          </span>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function Analisis({ eventos }: Props) {
  // Reloj del cliente: al montar. Mientras no exista, los conteos relativos
  // se muestran neutros — la hidratación nunca ve dos calendarios distintos.
  const hoy = useHoy();
  // ── Distribución del dinero por estatus ────────────────────────────────────
  const dist = useMemo(() => {
    const montos = { PROSPECTO: 0, CONFIRMADO: 0, FACTURADO: 0, CANCELADO: 0 } as Record<
      string,
      number
    >;
    const conteo = { ...montos };
    for (const e of eventos) {
      montos[e.estatus] += e.tarifa;
      conteo[e.estatus] += 1;
    }
    const total = Object.values(montos).reduce((a, b) => a + b, 0);
    const filas = ESTATUS_VALIDOS.map((s) => ({
      estatus: s,
      monto: montos[s],
      n: conteo[s],
      pct: total > 0 ? Math.round((montos[s] / total) * 100) : 0,
    }));
    return { filas, total };
  }, [eventos]);

  // ── Prioridades de cobranza ────────────────────────────────────────────────
  const cobranza = useMemo(() => {
    return eventos
      .filter((e) => e.estatus !== "CANCELADO" && saldoDe(e) > 0)
      .sort((a, b) => {
        const fa = parsearLimite(a.fechaLimitePago);
        const fb = parsearLimite(b.fechaLimitePago);
        const ka = fa ? fa.getTime() : Infinity;
        const kb = fb ? fb.getTime() : Infinity;
        if (ka !== kb) return ka - kb;
        return (a.fechaInicio ?? "").localeCompare(b.fechaInicio ?? "");
      });
  }, [eventos]);

  // ── Próximos servicios ─────────────────────────────────────────────────────
  const proximos = useMemo(() => {
    if (!hoy) return [];
    return eventos
      .filter((e) => {
        if (e.estatus === "CANCELADO" || !e.fechaInicio) return false;
        const ini = fechaDisplay(e.fechaInicio);
        return ini !== null && differenceInCalendarDays(ini, hoy) >= 0;
      })
      .sort((a, b) => (a.fechaInicio ?? "").localeCompare(b.fechaInicio ?? ""))
      .slice(0, 6);
  }, [eventos, hoy]);

  if (eventos.length === 0) {
    return (
      <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-linea-fuerte px-6 py-20 text-center">
        <p className="font-display text-xl text-tinta">
          El análisis empieza con el primer evento
        </p>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-tinta-muda">
          Cuando registres eventos, aquí verás tu cartera, tus cobros pendientes y
          lo que viene — todo en un solo vistazo.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 pb-6">
      {/* Mini encabezado + exportación */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="font-display text-xl text-tinta">Análisis</h2>
          <p className="text-[11px] text-tinta-muda">
            Lo que tu registro dice de tu negocio.
          </p>
        </div>
        <a
          href="/api/exportar"
          download
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-linea-fuerte px-4 text-xs font-medium text-tinta-suave transition-colors hover:border-acento/40 hover:text-acento-claro"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Exportar CSV
        </a>
      </div>

      {/* ── Distribución por estatus ── */}
      <Seccion titulo="Distribución por estatus" conteo={eventos.length}>
        <div className="flex h-2.5 gap-[3px] overflow-hidden rounded-full bg-linea-suave">
          {dist.filas.map((f) =>
            f.monto > 0 ? (
              <div
                key={f.estatus}
                style={{ flexGrow: f.monto }}
                className={`h-full rounded-full ${ESTATUS_CONFIG[f.estatus].punto}`}
              />
            ) : null
          )}
        </div>
        <div className="mt-3">
          {dist.filas.map((f, i) => (
            <div
              key={f.estatus}
              className={`flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
                i > 0 ? "border-t border-linea-suave" : ""
              } ${f.estatus === "CANCELADO" ? "opacity-60" : ""}`}
            >
              <span className="inline-flex items-center gap-2 text-sm text-tinta-suave">
                <span
                  className={`h-2 w-2 rounded-full ${ESTATUS_CONFIG[f.estatus].punto}`}
                  aria-hidden
                />
                {ESTATUS_CONFIG[f.estatus].label}
              </span>
              <span className="text-xs text-tinta-muda sm:text-right">
                {f.n} {f.n === 1 ? "evento" : "eventos"} ·{" "}
                <span className="text-tinta">$ {formatoTarifa(f.monto)}</span>{" "}
                · {f.pct}%
              </span>
            </div>
          ))}
        </div>
      </Seccion>

      {/* ── Prioridades de cobranza ── */}
      <Seccion titulo="Prioridades de cobranza" conteo={cobranza.length}>
        {cobranza.length === 0 ? (
          <p className="py-6 text-center text-sm text-tinta-muda">
            Sin saldos pendientes — todo cobrado.
          </p>
        ) : (
          <div className="divide-y divide-linea-suave">
            {cobranza.map((e) => {
              const saldo = saldoDe(e);
              const limite = parsearLimite(e.fechaLimitePago);
              let venceTxt: string;
              let venceClase: string;
              if (!limite || !hoy) {
                venceTxt = !limite ? "sin fecha límite" : "—";
                venceClase = "text-tinta-suave";
              } else {
                const d = differenceInCalendarDays(limite, hoy);
                if (d < 0) {
                  venceTxt = `vencido hace ${-d} ${-d === 1 ? "día" : "días"}`;
                  venceClase = "text-peligro";
                } else if (d === 0) {
                  venceTxt = "vence hoy";
                  venceClase = "text-estado-prospecto";
                } else if (d <= 7) {
                  venceTxt = `en ${d} ${d === 1 ? "día" : "días"}`;
                  venceClase = "text-estado-prospecto";
                } else {
                  venceTxt = `vence ${format(limite, "d 'de' MMMM", { locale: es })}`;
                  venceClase = "text-tinta-muda";
                }
              }

              const waTel = normalizarWhatsApp(e.telefono);
              const nombre = e.contacto ? e.contacto.split(" ")[0] : "";
              const venceFrase = limite
                ? format(limite, "d 'de' MMMM", { locale: es })
                : null;
              const msg = `Hola${nombre ? ` ${nombre}` : ""}, le escribo respecto al servicio de interpretación para ${e.cliente}. Le comparto el estado de la cuenta: saldo pendiente de $ ${formatoTarifa(saldo)} MXN${venceFrase ? `, con fecha límite de pago el ${venceFrase}` : ""}. Quedo al pendiente por si tiene alguna duda. ¡Gracias!`;

              return (
                <div key={e.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-tinta">
                      {e.cliente}
                    </p>
                    <p className="mt-0.5 text-[11px]">
                      <span className={venceClase}>{venceTxt}</span>
                      {e.idEvento ? (
                        <span className="text-tinta-muda"> · {e.idEvento}</span>
                      ) : null}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-lg tracking-tight text-acento-claro">
                    $ {formatoTarifa(saldo)}
                  </p>
                  {waTel ? (
                    <a
                      href={`https://wa.me/${waTel}?text=${encodeURIComponent(msg)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Enviar recordatorio de saldo — ${e.cliente}`}
                      title="Enviar recordatorio de saldo por WhatsApp"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-tinta-muda transition-colors hover:bg-exito/10 hover:text-exito"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden />
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Seccion>

      {/* ── Próximos servicios ── */}
      <Seccion titulo="Próximos servicios" conteo={proximos.length}>
        {proximos.length === 0 ? (
          <p className="py-6 text-center text-sm text-tinta-muda">
            Sin servicios próximos con fecha registrada.
          </p>
        ) : (
          <div className="divide-y divide-linea-suave">
            {proximos.map((e) => {
              const ini = fechaDisplay(e.fechaInicio) as Date;
              const fin = fechaDisplay(e.fechaFin);
              const dias = hoy ? differenceInCalendarDays(ini, hoy) : null;
              const mod = MODALIDAD_CONFIG[e.modalidad];
              const modTexto =
                e.modalidad === "PRESENCIAL_CDMX"
                  ? "Presencial · CDMX"
                  : mod.conCiudad && e.ciudad
                    ? `${mod.label} · ${e.ciudad}`
                    : mod.label;
              return (
                <div key={e.id} className="flex items-center gap-3 py-3">
                  <p className="w-20 shrink-0 text-xs font-medium text-tinta-suave">
                    {rangoCorto(ini, fin)}
                  </p>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-tinta">{e.cliente}</p>
                    <p className="mt-0.5 truncate text-[11px] text-tinta-muda">
                      {e.idiomas ? `${e.idiomas} · ` : ""}
                      {modTexto}
                      {e.horario ? ` · ${e.horario}` : ""}
                    </p>
                  </div>
                  {dias !== null && dias <= 7 ? (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        dias === 0
                          ? "bg-acento/15 text-acento-claro"
                          : "bg-acento/10 text-acento-claro/80"
                      }`}
                    >
                      {dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Seccion>
    </div>
  );
}
