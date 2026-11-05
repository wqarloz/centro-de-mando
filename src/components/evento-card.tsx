"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Plane,
  Trash2,
  Undo2,
  User,
  Video,
  X,
  XCircle,
} from "lucide-react";
import {
  differenceInCalendarDays,
  format,
  isSameMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  calcularImpuestos,
  ESTATUS_CONFIG,
  EventoDTO,
  formatoDinero,
  formatoTarifa,
  MODALIDAD_CONFIG,
  normalizarWhatsApp,
  tituloImpuestos,
  type Estatus,
} from "@/lib/estatus";
import { SUPERFICIE_TARJETA } from "@/lib/temas";
import { fechaDisplay } from "@/lib/fechas";
import { useHoy } from "@/hooks/use-hoy";
import EventoForm from "@/components/evento-form";

interface Props {
  evento: EventoDTO;
  index: number;
  onCambiarEstatus: (id: string, estatus: Estatus, razon?: string) => void;
  onEliminar: (id: string) => void;
  onEditado: (evento: EventoDTO) => void;
}

function rangoFechas(ini: Date, fin: Date | null, hoy: Date | null): string {
  // El año solo se enseña cuando el evento cae en otro año distinto al del
  // reloj del cliente; sin reloj todavía (primer pintado) no se muestra —
  // así servidor y navegador coinciden a la primera.
  const anio =
    hoy && ini.getFullYear() !== hoy.getFullYear()
      ? ` '${format(ini, "yy")}`
      : "";
  if (!fin || ini.toDateString() === fin.toDateString()) {
    return `${format(ini, "d MMM", { locale: es })}${anio}`;
  }
  if (isSameMonth(ini, fin)) {
    return `${format(ini, "d", { locale: es })} – ${format(fin, "d MMM", { locale: es })}${anio}`;
  }
  return `${format(ini, "d MMM", { locale: es })} – ${format(fin, "d MMM", { locale: es })}${anio}`;
}

function formatoLimite(t: string | null): string | null {
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return format(new Date(t + "T12:00:00"), "d 'de' MMM", { locale: es });
  }
  return t;
}

const MINI_ICONO =
  "inline-flex h-7 w-7 items-center justify-center rounded-lg text-tinta-muda transition-colors";

export default function EventoCard({ evento, index, onCambiarEstatus, onEliminar, onEditado }: Props) {
  const [flash, setFlash] = useState(false);
  const [razon, setRazon] = useState("");
  const timeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    []
  );

  const cfg = ESTATUS_CONFIG[evento.estatus];
  // Fechas de exhibición: el día de calendario del evento, idéntico en
  // cualquier zona horaria (ver lib/fechas). El "hoy" del reloj del cliente
  // se conoce al montar; antes de eso no hay etiquetas relativas — así el
  // HTML de la cocina y del comedor coinciden y la hidratación no se rompe.
  const hoy = useHoy();
  const inicio = fechaDisplay(evento.fechaInicio);
  const fin = fechaDisplay(evento.fechaFin);
  const dias = hoy && inicio ? differenceInCalendarDays(inicio, hoy) : null;

  const mod = MODALIDAD_CONFIG[evento.modalidad];
  const modTexto =
    evento.modalidad === "PRESENCIAL_CDMX"
      ? "Presencial · CDMX"
      : mod.conCiudad && evento.ciudad
        ? `${mod.label} · ${evento.ciudad}`
        : mod.label;
  const IconoModalidad =
    evento.modalidad === "REMOTO"
      ? Video
      : evento.modalidad === "FORANEO"
        ? Plane
        : MapPin;

  // ── El paso siguiente del ciclo de vida ──
  // Prospecto → Confirmado → Realizado → Pagado. Cancelado se reactiva.
  const primaria =
    evento.estatus === "PROSPECTO"
      ? { label: "Confirmar", siguiente: "CONFIRMADO" as Estatus, exito: "Confirmado", estilo: "bg-exito text-exito-tinta hover:bg-exito/85" }
      : evento.estatus === "CONFIRMADO"
        ? { label: "Marcar realizado", siguiente: "REALIZADO" as Estatus, exito: "Realizado", estilo: "bg-acento text-acento-tinta hover:bg-acento-claro" }
        : evento.estatus === "REALIZADO"
          ? { label: "Marcar pagado", siguiente: "PAGADO" as Estatus, exito: "Pagado", estilo: "bg-exito text-exito-tinta hover:bg-exito/85" }
          : evento.estatus === "CANCELADO"
            ? { label: "Reactivar", siguiente: "PROSPECTO" as Estatus, exito: "Reactivado", estilo: "border border-linea-hover bg-tarjeta-baja text-tinta-suave hover:border-acento/40" }
            : null; // PAGADO: ciclo completado

  const deshacer: { siguiente: Estatus; titulo: string } | null =
    evento.estatus === "CONFIRMADO"
      ? { siguiente: "PROSPECTO", titulo: "Regresar a prospecto" }
      : evento.estatus === "REALIZADO"
        ? { siguiente: "CONFIRMADO", titulo: "Regresar a confirmado" }
        : evento.estatus === "PAGADO"
          ? { siguiente: "REALIZADO", titulo: "Reabrir el pago — regresar a realizado" }
          : null;

  // La cancelación solo procede antes de que el evento se trabaje.
  const puedeCancelar =
    evento.estatus === "PROSPECTO" || evento.estatus === "CONFIRMADO";

  const manejarPrimaria = () => {
    if (!primaria) return;
    setFlash(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setFlash(false), 1600);
    onCambiarEstatus(evento.id, primaria.siguiente);
  };

  // Etiqueta de urgencia
  const etiquetaDias =
    dias === 0
      ? "hoy"
      : dias === 1
        ? "mañana"
        : dias !== null && dias > 1
          ? `en ${dias} días`
          : null;
  const diasUrgente =
    dias !== null &&
    dias >= 0 &&
    dias <= 7 &&
    evento.estatus !== "CANCELADO" &&
    evento.estatus !== "PAGADO";

  // Fechas para mostrar
  const fechasMostrar = inicio
    ? rangoFechas(inicio, fin, hoy)
    : evento.fechasTexto || "Fecha por definir";

  // Contacto: WhatsApp
  const waTel = normalizarWhatsApp(evento.telefono);
  const primerNombre = evento.contacto ? evento.contacto.split(" ")[0] : "";
  const mensajeWa = `Hola${primerNombre ? ` ${primerNombre}` : ""}, le escribo respecto al servicio de interpretación${evento.idiomas ? ` ${evento.idiomas}` : ""} para ${evento.cliente}.`;
  const waHref = waTel
    ? `https://wa.me/${waTel}?text=${encodeURIComponent(mensajeWa)}`
    : null;

  // Dinero
  const anticipo = evento.anticipo ?? 0;
  const saldo = evento.saldo ?? Math.max(evento.tarifa - anticipo, 0);
  const saldoPendiente =
    saldo > 0 && evento.estatus !== "CANCELADO" && evento.estatus !== "PAGADO";
  const vence = formatoLimite(evento.fechaLimitePago);
  const porDia = evento.tarifaPorDia ?? null;
  const imp = evento.impuestosTipo
    ? calcularImpuestos(evento.tarifa, evento.impuestosTipo)
    : null;
  const impTitulo = evento.impuestosTipo
    ? tituloImpuestos(evento.impuestosTipo)
    : null;

  const tarifaClase =
    evento.estatus === "PAGADO"
      ? "text-estado-facturado"
      : evento.estatus === "CANCELADO"
        ? "text-tinta-muda"
        : "text-tinta";

  const hayContacto = Boolean(evento.contacto || waHref || evento.correo || evento.linkGlosario);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{
        duration: 0.28,
        delay: index < 10 ? index * 0.04 : 0,
        layout: { duration: 0.25 },
      }}
      className={`relative radio-tarjeta border p-4 transition-colors duration-300 sm:p-5 ${
        evento.estatus === "CANCELADO"
          ? "border-linea-suave bg-tarjeta-baja opacity-70 hover:opacity-90"
          : "border-linea bg-gradient-to-b from-tarjeta to-tarjeta-baja hover:border-acento/25"
      }`}
      style={SUPERFICIE_TARJETA}
    >
      {/* Código del evento (identificador del registro) */}
      {evento.idEvento ? (
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-tinta-muda">
          {evento.idEvento}
        </p>
      ) : null}

      {/* Encabezado: cliente + editar + estatus */}
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`min-w-0 flex-1 text-[15px] font-semibold leading-snug text-tinta ${
            evento.estatus === "CANCELADO" ? "line-through decoration-tinta-muda" : ""
          }`}
        >
          {evento.cliente}
        </h3>
        <EventoForm evento={evento} onEditado={onEditado} />
        <span aria-live="polite" className="shrink-0">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={evento.estatus}
              initial={{ opacity: 0, y: -5, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.9 }}
              transition={{ duration: 0.18 }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${cfg.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.punto}`} />
              {cfg.label}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      {/* Contacto + accesos directos */}
      {hayContacto ? (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-tinta-muda">
          {evento.contacto ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
              <User className="h-3 w-3 shrink-0 text-tinta-muda" aria-hidden />
              <span className="truncate">{evento.contacto}</span>
            </span>
          ) : null}
          <span className="flex-1" />
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir chat de WhatsApp — ${evento.contacto || evento.cliente}`}
              title="Abrir chat de WhatsApp"
              className={`${MINI_ICONO} hover:bg-exito/10 hover:text-exito`}
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
          {evento.correo ? (
            <a
              href={`mailto:${evento.correo}`}
              aria-label={`Escribir correo — ${evento.contacto || evento.cliente}`}
              title="Escribir correo"
              className={`${MINI_ICONO} hover:bg-panel hover:text-tinta-suave`}
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
          {evento.linkGlosario ? (
            <a
              href={evento.linkGlosario}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir glosario"
              title="Abrir glosario"
              className={`${MINI_ICONO} hover:bg-acento/10 hover:text-acento-claro`}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Meta: idiomas · modalidad · tema · horario */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-tinta-suave">
        {evento.idiomas ? (
          <span className="inline-flex items-center rounded-md border border-acento/30 bg-acento/[0.07] px-2 py-0.5 font-semibold tracking-wide text-acento-claro">
            {evento.idiomas}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <IconoModalidad className="h-3.5 w-3.5 text-tinta-muda" aria-hidden />
          {modTexto}
        </span>
        {evento.tema ? (
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-tinta-muda" aria-hidden />
            {evento.tema}
          </span>
        ) : null}
        {evento.horario ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-tinta-muda" aria-hidden />
            {evento.horario}
          </span>
        ) : null}
      </div>

      {/* Fechas */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 font-medium ${
            inicio ? "text-tinta-suave" : "text-tinta-muda italic"
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5 text-acento/70" aria-hidden />
          {fechasMostrar}
        </span>
        {evento.dias && evento.dias > 1 ? (
          <span className="text-tinta-muda">· {evento.dias} días</span>
        ) : null}
        {etiquetaDias ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              diasUrgente
                ? "bg-acento/10 text-acento-claro"
                : "bg-estado-cancelado/10 text-tinta-muda"
            }`}
          >
            {etiquetaDias}
          </span>
        ) : null}
      </div>

      {evento.notas ? (
        <p className="mt-2 truncate text-[11px] italic text-tinta-muda">
          {evento.notas}
        </p>
      ) : null}

      {/* Motivo de la cancelación */}
      {evento.estatus === "CANCELADO" && evento.razonCancelacion ? (
        <p className="mt-1.5 truncate text-[11px] italic text-peligro/90">
          <XCircle className="mr-1 inline h-3 w-3" aria-hidden />
          Motivo: {evento.razonCancelacion}
        </p>
      ) : null}

      <div className="my-4 h-px bg-gradient-to-r from-transparent via-linea-fuerte to-transparent" />

      {/* Tarifa + detalles de dinero */}
      <div>
        <p className="flex items-baseline gap-1.5">
          <span className={`font-display text-2xl leading-none tracking-tight ${tarifaClase}`}>
            $ {formatoTarifa(evento.tarifa)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-tinta-muda">MXN</span>
        </p>
        {anticipo > 0 || saldo > 0 || porDia || imp ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-tinta-muda">
            {porDia ? (
              <span>
                Por día{" "}
                <span className="font-medium text-tinta-suave">
                  $ {formatoDinero(porDia)}
                </span>
              </span>
            ) : null}
            {anticipo > 0 ? (
              <span>
                Anticipo{" "}
                <span className="font-medium text-tinta-suave">$ {formatoTarifa(anticipo)}</span>
              </span>
            ) : null}
            {saldo > 0 ? (
              <span>
                Saldo{" "}
                <span
                  className={`font-medium ${
                    saldoPendiente ? "text-estado-prospecto" : "text-tinta-suave"
                  }`}
                >
                  $ {formatoTarifa(saldo)}
                </span>
                {saldoPendiente && vence ? (
                  <span className="text-tinta-muda"> · vence {vence}</span>
                ) : null}
              </span>
            ) : null}
            {imp ? (
              <span title={impTitulo ?? undefined}>
                {evento.impuestosTipo === "MORAL" ? "Neto a recibir" : "A recibir (con IVA)"}{" "}
                <span className="font-medium text-tinta-suave">
                  $ {formatoDinero(imp.neto)}
                </span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Acciones de un toque */}
      <div className="mt-4 flex items-center gap-2">
        {primaria ? (
          <Button
            onClick={manejarPrimaria}
            aria-label={`${primaria.label} — ${evento.cliente}`}
            className={`h-11 min-w-0 flex-1 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] ${primaria.estilo}`}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {flash ? (
                <motion.span
                  key="flash"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.16 }}
                  className="inline-flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  {primaria.exito}
                </motion.span>
              ) : (
                <motion.span
                  key="label"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.16 }}
                  className="truncate"
                >
                  {primaria.label}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        ) : (
          <span className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-linea-fuerte bg-tarjeta-baja text-xs font-medium text-tinta-suave">
            <Check className="h-3.5 w-3.5 text-acento" aria-hidden />
            Ciclo completado
          </span>
        )}

        {deshacer ? (
          <Button
            variant="outline"
            size="icon"
            onClick={() => onCambiarEstatus(evento.id, deshacer.siguiente)}
            aria-label={`${deshacer.titulo} — ${evento.cliente}`}
            title={deshacer.titulo}
            className="h-11 w-11 shrink-0 rounded-lg border-linea-fuerte bg-tarjeta text-tinta-muda hover:border-linea-hover hover:bg-tarjeta-baja hover:text-tinta"
          >
            <Undo2 className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}

        {/* Cancelar — con motivo opcional */}
        {puedeCancelar ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Cancelar evento — ${evento.cliente}`}
                title="Cancelar evento"
                className="h-11 w-11 shrink-0 rounded-lg border-linea-fuerte bg-tarjeta text-tinta-muda hover:border-peligro/30 hover:bg-peligro/10 hover:text-peligro"
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              style={SUPERFICIE_TARJETA}
              className="radio-tarjeta border-linea-fuerte bg-tarjeta-baja text-tinta-suave"
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-lg text-tinta">
                  ¿Cancelar «{evento.cliente}»?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-tinta-muda">
                  El evento pasará a cancelado. Si hubo multa o anticipo
                  retenido, puedes ajustar el anticipo editando el evento
                  después.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-tinta-suave"
                  htmlFor={`razon-${evento.id}`}
                >
                  Motivo de la cancelación (opcional)
                </label>
                <Input
                  id={`razon-${evento.id}`}
                  value={razon}
                  onChange={(e) => setRazon(e.target.value)}
                  placeholder="El cliente dio marcha atrás, presupuesto…"
                  className="h-10 border-linea-fuerte bg-panel placeholder:text-tinta-muda"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setRazon("")}
                  className="rounded-lg border-linea-fuerte bg-tarjeta text-tinta-suave hover:text-tinta"
                >
                  Mejor no
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onCambiarEstatus(evento.id, "CANCELADO", razon.trim() || undefined);
                    setRazon("");
                  }}
                  className="rounded-lg bg-peligro text-sm font-semibold text-peligro-tinta hover:bg-peligro/80"
                >
                  Sí, cancelar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        {/* Eliminar — con confirmación */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={`Eliminar evento — ${evento.cliente}`}
              title="Eliminar del registro"
              className="h-11 w-11 shrink-0 rounded-lg border-linea-fuerte bg-tarjeta text-tinta-muda hover:border-peligro/30 hover:bg-peligro/10 hover:text-peligro"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent
            style={SUPERFICIE_TARJETA}
            className="radio-tarjeta border-linea-fuerte bg-tarjeta-baja text-tinta-suave"
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-lg text-tinta">
                ¿Eliminar este evento?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-tinta-muda">
                «{evento.cliente}» se quitará por completo de tu registro. Esta acción no
                se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-lg border-linea-fuerte bg-tarjeta text-tinta-suave hover:text-tinta">
                Mejor no
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onEliminar(evento.id)}
                className="rounded-lg bg-peligro text-sm font-semibold text-peligro-tinta hover:bg-peligro/80"
              >
                Sí, eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.article>
  );
}
