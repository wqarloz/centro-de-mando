"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart3, LayoutGrid } from "lucide-react";
import Analisis from "@/components/analisis";
import EventoCard from "@/components/evento-card";
import EventoForm from "@/components/evento-form";
import TemasDialog from "@/components/temas-dialog";
import { SUPERFICIE_TARJETA } from "@/lib/temas";
import {
  capitalizar,
  ESTATUS_CONFIG,
  ESTATUS_VALIDOS,
  formatoTarifa,
  type EventoDTO,
  type Estatus,
} from "@/lib/estatus";
import { useToast } from "@/hooks/use-toast";
import { useHoy } from "@/hooks/use-hoy";

type Filtro = "TODOS" | Estatus;
type Vista = "tarjetas" | "analisis";

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: "TODOS", label: "Todos" },
  ...ESTATUS_VALIDOS.map((e) => ({ valor: e as Filtro, label: `${ESTATUS_CONFIG[e].label}s` })),
];

interface Props {
  eventosIniciales: EventoDTO[];
}

export default function CommandCenter({ eventosIniciales }: Props) {
  const [eventos, setEventos] = useState(eventosIniciales);
  const [filtro, setFiltro] = useState<Filtro>("TODOS");
  const [vista, setVista] = useState<Vista>("tarjetas");
  const { toast } = useToast();

  // Actualización optimista: la UI cambia al instante y se revierte si falla.
  const cambiarEstatus = async (id: string, nuevo: Estatus) => {
    const snapshot = eventos;
    setEventos((prev) =>
      prev.map((e) => (e.id === id ? { ...e, estatus: nuevo } : e))
    );
    try {
      const res = await fetch(`/api/eventos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estatus: nuevo }),
      });
      if (!res.ok) throw new Error("respuesta no ok");
    } catch {
      setEventos(snapshot);
      toast({
        title: "No se pudo actualizar",
        description: "El cambio se revirtió. Revisa tu conexión e inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Registro de un evento nuevo (lo manda el formulario ya guardado en la base)
  const crearEvento = (evento: EventoDTO) => {
    setEventos((prev) => [evento, ...prev]);
  };

  // Edición de un evento (el formulario ya guardó los cambios en la base)
  const editarEvento = (actualizado: EventoDTO) => {
    setEventos((prev) =>
      prev.map((e) => (e.id === actualizado.id ? actualizado : e))
    );
  };

  // Eliminación optimista con reversión
  const eliminarEvento = async (id: string) => {
    const snapshot = eventos;
    setEventos((prev) => prev.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/eventos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("respuesta no ok");
    } catch {
      setEventos(snapshot);
      toast({
        title: "No se pudo eliminar",
        description: "El evento sigue en tu registro. Revisa tu conexión e inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const { conteo, saldoPorCobrar, carteraTotal, anticipos, activos } = useMemo(() => {
    const conteo: Record<Estatus, number> = {
      PROSPECTO: 0,
      CONFIRMADO: 0,
      FACTURADO: 0,
      CANCELADO: 0,
    };
    let saldoPorCobrar = 0;
    let carteraTotal = 0;
    let anticipos = 0;
    let activos = 0;
    for (const e of eventos) {
      conteo[e.estatus] += 1;
      if (e.estatus === "CANCELADO") continue;
      activos += 1;
      carteraTotal += e.tarifa;
      anticipos += e.anticipo ?? 0;
      saldoPorCobrar += e.saldo ?? Math.max(e.tarifa - (e.anticipo ?? 0), 0);
    }
    return { conteo, saldoPorCobrar, carteraTotal, anticipos, activos };
  }, [eventos]);

  // Orden: primero los que no tienen fecha (necesitan atención), luego por fecha.
  const ordenados = useMemo(() => {
    return [...eventos].sort((a, b) => {
      if (!a.fechaInicio && !b.fechaInicio) return 0;
      if (!a.fechaInicio) return -1;
      if (!b.fechaInicio) return 1;
      return a.fechaInicio.localeCompare(b.fechaInicio);
    });
  }, [eventos]);

  const filtrados =
    filtro === "TODOS" ? ordenados : ordenados.filter((e) => e.estatus === filtro);

  const stats: { label: string; valor: string; clase: string }[] =
    vista === "tarjetas"
      ? [
          { label: "Prospectos", valor: String(conteo.PROSPECTO), clase: "text-estado-prospecto" },
          { label: "Confirmados", valor: String(conteo.CONFIRMADO), clase: "text-estado-confirmado" },
          { label: "Facturados", valor: String(conteo.FACTURADO), clase: "text-estado-facturado" },
          { label: "Saldo por cobrar", valor: `$ ${formatoTarifa(saldoPorCobrar)}`, clase: "text-acento-claro" },
        ]
      : [
          { label: "Cartera total", valor: `$ ${formatoTarifa(carteraTotal)}`, clase: "text-tinta" },
          { label: "Por cobrar", valor: `$ ${formatoTarifa(saldoPorCobrar)}`, clase: "text-estado-prospecto" },
          { label: "Anticipos cobrados", valor: `$ ${formatoTarifa(anticipos)}`, clase: "text-estado-confirmado" },
          { label: "Ticket promedio", valor: `$ ${formatoTarifa(activos > 0 ? Math.round(carteraTotal / activos) : 0)}`, clase: "text-acento-claro" },
        ];

  // El "hoy" del reloj del cliente: se conoce al montar (ver use-hoy).
  // Antes de eso, la línea muestra un espacio reservado — así la cocina (SSR)
  // y el comedor (hidratación) entregan el mismo HTML y no hay desajuste.
  const hoyFecha = useHoy();
  const hoy = hoyFecha
    ? capitalizar(format(hoyFecha, "EEEE, d 'de' MMMM", { locale: es }))
    : null;

  return (
    <div className="relative flex min-h-screen flex-col bg-fondo text-tinta-suave">
      {/* Resplandor decorativo del tema */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_50%_at_50%_0%,var(--brillo),transparent)]"
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-6 sm:px-6">
        {/* Encabezado */}
        <header className="pt-10 sm:pt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-acento/80">
                Panel operativo — Interpretación profesional
              </p>
              <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-tinta sm:text-4xl">
                Centro de Mando
              </h1>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <p className="text-xs text-tinta-muda">{hoy ?? "\u00A0"}</p>
              <div className="flex items-center gap-2">
                <TemasDialog />
                <EventoForm onCreado={crearEvento} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                style={SUPERFICIE_TARJETA}
                className="radio-tarjeta border border-linea-suave bg-tarjeta-baja p-3"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-tinta-muda">
                  {s.label}
                </p>
                <p className={`font-display mt-1 text-xl tracking-tight sm:text-2xl ${s.clase}`}>
                  {s.valor}
                </p>
              </div>
            ))}
          </div>
        </header>

        {/* Vistas y filtros */}
        <nav
          aria-label="Vistas y filtros"
          className="sticky top-0 z-20 -mx-4 mt-6 bg-fondo/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6"
        >
          <div className="flex flex-col gap-2.5">
            <div
              role="tablist"
              aria-label="Cambiar vista"
              className="grid grid-cols-2 rounded-full border border-linea-fuerte bg-panel p-1"
            >
              <button
                role="tab"
                aria-selected={vista === "tarjetas"}
                onClick={() => setVista("tarjetas")}
                className="relative inline-flex h-10 items-center justify-center rounded-full outline-none focus-visible:ring-1 focus-visible:ring-acento/50"
              >
                {vista === "tarjetas" ? (
                  <motion.span
                    layoutId="indicador-vista"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    aria-hidden
                    className="absolute inset-0 rounded-full border border-acento/40 bg-acento/12"
                  />
                ) : null}
                <span
                  className={`relative z-10 inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    vista === "tarjetas"
                      ? "text-acento-claro"
                      : "text-tinta-muda hover:text-tinta-suave"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                  Tarjetas
                </span>
              </button>
              <button
                role="tab"
                aria-selected={vista === "analisis"}
                onClick={() => setVista("analisis")}
                className="relative inline-flex h-10 items-center justify-center rounded-full outline-none focus-visible:ring-1 focus-visible:ring-acento/50"
              >
                {vista === "analisis" ? (
                  <motion.span
                    layoutId="indicador-vista"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    aria-hidden
                    className="absolute inset-0 rounded-full border border-acento/40 bg-acento/12"
                  />
                ) : null}
                <span
                  className={`relative z-10 inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    vista === "analisis"
                      ? "text-acento-claro"
                      : "text-tinta-muda hover:text-tinta-suave"
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                  Análisis
                </span>
              </button>
            </div>

            {vista === "tarjetas" ? (
              <div className="relative">
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {FILTROS.map((f) => {
                    const activo = filtro === f.valor;
                    const n =
                      f.valor === "TODOS"
                        ? eventos.length
                        : conteo[f.valor as Estatus];
                    return (
                      <button
                        key={f.valor}
                        onClick={() => setFiltro(f.valor)}
                        aria-pressed={activo}
                        className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition-colors ${
                          activo
                            ? "border-acento/40 bg-acento/10 text-acento-claro"
                            : "border-linea-fuerte text-tinta-suave hover:border-linea-hover hover:text-tinta"
                        }`}
                      >
                        {f.valor !== "TODOS" ? (
                          <span
                            aria-hidden
                            className={`h-1.5 w-1.5 rounded-full ${ESTATUS_CONFIG[f.valor as Estatus].punto}`}
                          />
                        ) : null}
                        {f.label}
                        <span className={activo ? "text-acento/70" : "text-tinta-muda"}>
                          {n}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-fondo to-transparent"
                />
              </div>
            ) : null}
          </div>
        </nav>

        {/* Contenido */}
        <main className="flex-1">
          {vista === "analisis" ? (
            <Analisis eventos={ordenados} />
          ) : eventos.length === 0 ? (
            <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-linea-fuerte px-6 py-20 text-center">
              <p className="font-display text-xl text-tinta">
                Tu registro está listo — y vacío
              </p>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-tinta-muda">
                Toca <span className="text-acento-claro">Nuevo evento</span> para registrar tu
                primer evento real. Todo queda guardado al instante, en un solo lugar.
              </p>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-linea-fuerte py-16 text-sm text-tinta-muda">
              No hay eventos con este estatus.
            </div>
          ) : (
            <motion.div layout className="mt-4 grid grid-cols-1 gap-4 pb-6 lg:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {filtrados.map((evento, i) => (
                  <EventoCard
                    key={evento.id}
                    evento={evento}
                    index={i}
                    onCambiarEstatus={cambiarEstatus}
                    onEliminar={eliminarEvento}
                    onEditado={editarEvento}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </main>

        {/* Pie */}
        <footer className="mt-auto flex items-center justify-between border-t border-linea-suave pt-4 text-[11px] text-tinta-muda">
          <p>Centro de Mando · v0.4 — tu registro, tu negocio</p>
          <p>
            {eventos.length} {eventos.length === 1 ? "evento" : "eventos"} ·{" "}
            <span className="text-acento/70">0 ms</span> por toque
          </p>
        </footer>
      </div>
    </div>
  );
}
