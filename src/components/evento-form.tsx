"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ESTATUS_CONFIG,
  ESTATUS_VALIDOS,
  type EventoDTO,
  type Estatus,
  formatoTarifa,
  type Modalidad,
  MODALIDAD_CONFIG,
} from "@/lib/estatus";
import { useToast } from "@/hooks/use-toast";
import { SUPERFICIE_TARJETA } from "@/lib/temas";
import { fechaDisplay } from "@/lib/fechas";

interface Props {
  /** Modo crear: avisa cuando un evento nuevo queda guardado. */
  onCreado?: (evento: EventoDTO) => void;
  /** Modo editar: el evento a precargar. */
  evento?: EventoDTO;
  /** Modo editar: avisa cuando los cambios quedan guardados. */
  onEditado?: (evento: EventoDTO) => void;
}

const SECCION = "text-[10px] font-medium uppercase tracking-[0.18em] text-acento/70";
const ETIQUETA = "text-xs font-medium text-tinta-suave";

type FormState = {
  cliente: string;
  contacto: string;
  telefono: string;
  correo: string;
  idiomas: string;
  tema: string;
  modalidad: Modalidad;
  ciudad: string;
  estatus: Estatus;
  fechaInicio: string;
  fechaFin: string;
  fechasExtra: string;
  horaInicio: string;
  horaFin: string;
  tarifa: string;
  anticipo: string;
  fechaLimitePago: string;
  linkGlosario: string;
  notas: string;
};

const VACIO: FormState = {
  cliente: "",
  contacto: "",
  telefono: "",
  correo: "",
  idiomas: "",
  tema: "",
  modalidad: "PRESENCIAL_CDMX",
  ciudad: "",
  estatus: "PROSPECTO",
  fechaInicio: "",
  fechaFin: "",
  fechasExtra: "",
  horaInicio: "",
  horaFin: "",
  tarifa: "",
  anticipo: "",
  fechaLimitePago: "",
  linkGlosario: "",
  notas: "",
};

/** Pasa de un evento guardado a los valores que muestran los inputs. */
function desdeEvento(e: EventoDTO): FormState {
  // El instante ISO se lee como fecha de exhibición (día de calendario UTC):
  // así el input muestra el día que el usuario registró, sin importar su
  // zona horaria — y sin corrimientos de un día al editar.
  const fecha = (s: string | null) => {
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = fechaDisplay(s);
    return d ? format(d, "yyyy-MM-dd") : "";
  };
  return {
    cliente: e.cliente,
    contacto: e.contacto ?? "",
    telefono: e.telefono ?? "",
    correo: e.correo ?? "",
    idiomas: e.idiomas ?? "",
    tema: e.tema ?? "",
    modalidad: e.modalidad,
    ciudad: e.ciudad ?? "",
    estatus: e.estatus,
    fechaInicio: fecha(e.fechaInicio),
    fechaFin: fecha(e.fechaFin),
    fechasExtra: e.fechasExtra ?? "",
    horaInicio: e.horaInicio ?? "",
    horaFin: e.horaFin ?? "",
    tarifa: e.tarifa != null ? String(e.tarifa) : "",
    anticipo: e.anticipo != null ? String(e.anticipo) : "",
    fechaLimitePago:
      e.fechaLimitePago && /^\d{4}-\d{2}-\d{2}$/.test(e.fechaLimitePago)
        ? e.fechaLimitePago
        : "",
    linkGlosario: e.linkGlosario ?? "",
    notas: e.notas ?? "",
  };
}

export default function EventoForm({ onCreado, evento, onEditado }: Props) {
  const esEdicion = Boolean(evento);
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(() =>
    evento ? desdeEvento(evento) : VACIO
  );
  const { toast } = useToast();

  // Si el evento cambia por fuera (edición o toque), el formulario se sincroniza.
  useEffect(() => {
    if (evento) setForm(desdeEvento(evento));
  }, [evento]);

  const set = (k: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Vista previa de lo que se calculará automáticamente
  const previa = useMemo(() => {
    const partes: string[] = [];
    if (form.fechaInicio) {
      const ini = new Date(form.fechaInicio + "T12:00:00");
      const fin = form.fechaFin ? new Date(form.fechaFin + "T12:00:00") : null;
      const dias = fin
        ? Math.round((fin.getTime() - ini.getTime()) / 86400000) + 1
        : 1;
      partes.push(`${dias} ${dias === 1 ? "día" : "días"}`);
    }
    if (/^\d{1,2}:\d{2}$/.test(form.horaInicio) && /^\d{1,2}:\d{2}$/.test(form.horaFin)) {
      const [h1, m1] = form.horaInicio.split(":").map(Number);
      const [h2, m2] = form.horaFin.split(":").map(Number);
      const mins = h2 * 60 + m2 - (h1 * 60 + m1);
      if (mins > 0) {
        partes.push(
          mins >= 360 ? "Jornada Completa" : mins >= 180 ? "Medio Día" : "Por Hora"
        );
      }
    }
    const tarifa = parseFloat(form.tarifa);
    const anticipo = parseFloat(form.anticipo) || 0;
    if (Number.isFinite(tarifa)) {
      partes.push(`saldo $ ${formatoTarifa(Math.max(tarifa - anticipo, 0))}`);
    }
    return partes.join(" · ");
  }, [form.fechaInicio, form.fechaFin, form.horaInicio, form.horaFin, form.tarifa, form.anticipo]);

  const guardar = async () => {
    setError("");
    if (!form.cliente.trim()) {
      setError("El cliente o empresa es el único campo obligatorio junto con la tarifa.");
      return;
    }
    const tarifa = form.tarifa.trim() === "" ? 0 : parseFloat(form.tarifa);
    if (!Number.isFinite(tarifa) || tarifa < 0) {
      setError("La tarifa debe ser un número (puede ser 0 si aún no la defines).");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(
        esEdicion ? `/api/eventos/${evento!.id}` : "/api/eventos",
        {
          method: esEdicion ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliente: form.cliente,
            contacto: form.contacto || null,
            telefono: form.telefono || null,
            correo: form.correo || null,
            idiomas: form.idiomas || null,
            tema: form.tema || null,
            modalidad: form.modalidad,
            ciudad: form.modalidad === "FORANEO" ? form.ciudad || null : null,
            estatus: form.estatus,
            fechaInicio: form.fechaInicio || null,
            fechaFin: form.fechaFin || null,
            fechasExtra: form.fechasExtra || null,
            horaInicio: form.horaInicio || null,
            horaFin: form.horaFin || null,
            tarifa,
            anticipo: form.anticipo.trim() === "" ? 0 : parseFloat(form.anticipo) || 0,
            fechaLimitePago: form.fechaLimitePago || null,
            linkGlosario: form.linkGlosario || null,
            notas: form.notas || null,
          }),
        }
      );
      if (!res.ok) throw new Error("respuesta no ok");
      const dato: EventoDTO = await res.json();
      if (esEdicion) {
        onEditado?.(dato);
      } else {
        onCreado?.(dato);
        setForm(VACIO);
      }
      setAbierto(false);
      toast({
        title: esEdicion ? "Cambios guardados" : "Evento registrado",
        description: esEdicion
          ? `${dato.cliente} quedó actualizado.`
          : `${dato.cliente} quedó en tu registro.`,
      });
    } catch {
      toast({
        title: "No se pudo guardar",
        description: "Revisa tu conexión e inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {esEdicion ? (
          <button
            type="button"
            aria-label={`Editar evento — ${evento!.cliente}`}
            title="Editar evento"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-tinta-muda transition-colors hover:bg-acento/10 hover:text-acento-claro"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : (
          <Button className="h-10 rounded-lg bg-acento px-4 text-sm font-semibold text-acento-tinta transition-colors hover:bg-acento-claro">
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo evento
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        style={SUPERFICIE_TARJETA}
        className="max-h-[88vh] overflow-y-auto radio-tarjeta border-linea-fuerte bg-tarjeta-baja text-tinta-suave sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-tinta">
            {esEdicion ? "Editar evento" : "Nuevo evento"}
          </DialogTitle>
          <DialogDescription className="text-xs text-tinta-muda">
            {esEdicion ? (
              <>
                Actualiza lo que necesites — tarifas, nombres, horarios… el resto
                de la tarjeta se recalcula solo.
                {evento!.idEvento ? (
                  <>
                    {" "}
                    Código:{" "}
                    <span className="font-mono text-tinta-suave">
                      {evento!.idEvento}
                    </span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                Solo <span className="text-tinta-suave">cliente</span> y{" "}
                <span className="text-tinta-suave">tarifa</span> son obligatorios.
                Todo lo demás lo puedes dejar vacío y completar después.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── Cliente ── */}
          <section className="space-y-3">
            <p className={SECCION}>Cliente</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className={ETIQUETA} htmlFor="f-cliente">
                  Cliente / Empresa <span className="text-acento">*</span>
                </label>
                <Input
                  id="f-cliente"
                  value={form.cliente}
                  onChange={(e) => set("cliente")(e.target.value)}
                  placeholder="AdWeek, Grupo Balanca…"
                  className="h-10 border-linea-fuerte bg-panel placeholder:text-tinta-muda"
                />
              </div>
              <div className="space-y-1.5">
                <label className={ETIQUETA} htmlFor="f-contacto">
                  Nombre del contacto
                </label>
                <Input
                  id="f-contacto"
                  value={form.contacto}
                  onChange={(e) => set("contacto")(e.target.value)}
                  placeholder="Ana María Tlatolli"
                  className="h-10 border-linea-fuerte bg-panel placeholder:text-tinta-muda"
                />
              </div>
              <div className="space-y-1.5">
                <label className={ETIQUETA} htmlFor="f-tel">
                  Teléfono (WhatsApp)
                </label>
                <Input
                  id="f-tel"
                  type="tel"
                  inputMode="numeric"
                  value={form.telefono}
                  onChange={(e) => set("telefono")(e.target.value)}
                  placeholder="5636020401"
                  className="h-10 border-linea-fuerte bg-panel placeholder:text-tinta-muda"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={ETIQUETA} htmlFor="f-correo">
                  Correo del contacto
                </label>
                <Input
                  id="f-correo"
                  type="email"
                  value={form.correo}
                  onChange={(e) => set("correo")(e.target.value)}
                  placeholder="contacto@empresa.com"
                  className="h-10 border-linea-fuerte bg-panel placeholder:text-tinta-muda"
                />
              </div>
            </div>
          </section>

          {/* ── Evento ── */}
          <section className="space-y-3">
            <p className={SECCION}>El evento</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className={ETIQUETA} htmlFor="f-idiomas">
                  Idiomas
                </label>
                <Input
                  id="f-idiomas"
                  value={form.idiomas}
                  onChange={(e) => set("idiomas")(e.target.value)}
                  placeholder="EN - ES"
                  className="h-10 border-linea-fuerte bg-panel placeholder:text-tinta-muda"
                />
              </div>
              <div className="space-y-1.5">
                <label className={ETIQUETA} htmlFor="f-tema">
                  Tema / Industria
                </label>
                <Input
                  id="f-tema"
                  value={form.tema}
                  onChange={(e) => set("tema")(e.target.value)}
                  placeholder="Marketing, legal, médico…"
                  className="h-10 border-linea-fuerte bg-panel placeholder:text-tinta-muda"
                />
              </div>
              <div className="space-y-1.5">
                <label className={ETIQUETA}>Modalidad</label>
                <Select
                  value={form.modalidad}
                  onValueChange={(v) => set("modalidad")(v as Modalidad)}
                >
                  <SelectTrigger className="h-10 border-linea-fuerte bg-panel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-linea-fuerte bg-tarjeta text-tinta-suave">
                    {(Object.keys(MODALIDAD_CONFIG) as Modalidad[]).map((m) => (
                      <SelectItem key={m} value={m} className="focus:bg-panel">
                        {MODALIDAD_CONFIG[m].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className={ETIQUETA}>Estatus</label>
                <Select value={form.estatus} onValueChange={(v) => set("estatus")(v as Estatus)}>
                  <SelectTrigger className="h-10 border-linea-fuerte bg-panel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-linea-fuerte bg-tarjeta text-tinta-suave">
                    {ESTATUS_VALIDOS.map((e) => (
                      <SelectItem key={e} value={e} className="focus:bg-panel">
                        {ESTATUS_CONFIG[e].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.modalidad === "FORANEO" ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <label className={ETIQUETA} htmlFor="f-ciudad">
                    Ciudad
                  </label>
                  <Input
                    id="f-ciudad"
                    value={form.ciudad}
                    onChange={(e) => set("ciudad")(e.target.value)}
                    placeholder="Monterrey, León, Tijuana…"
                    className="h-10 border-linea-fuerte bg-panel placeholder:text-tinta-muda"
                  />
                </div>
              ) : null}
            </div>
          </section>

          {/* ── Fechas y horario ── */}
          <section className="space-y-3">
            <p className={SECCION}>Fechas y horario</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={ETIQUETA} htmlFor="f-ini">
                  Fecha inicio
                </label>
                <Input
                  id="f-ini"
                  type="date"
                  value={form.fechaInicio}
                  onChange={(e) => set("fechaInicio")(e.target.value)}
                  className="h-10 border-linea-fuerte bg-panel"
                />
              </div>
              <div className="space-y-1.5">
                <label className={ETIQUETA} htmlFor="f-fin">
                  Fecha fin
                </label>
                <Input
                  id="f-fin"
                  type="date"
                  value={form.fechaFin}
                  onChange={(e) => set("fechaFin")(e.target.value)}
                  className="h-10 border-linea-fuerte bg-panel"
                />
              </div>
              <div className="space-y-1.5">
                <label className={ETIQUETA} htmlFor="f-hini">
                  Hora inicio
                </label>
                <Input
                  id="f-hini"
                  type="time"
                  value={form.horaInicio}
                  onChange={(e) => set("horaInicio")(e.target.value)}
                  className="h-10 border-linea-fuerte bg-panel"
                />
              </div>
              <div className="space-y-1.5">
                <label className={ETIQUETA} htmlFor="f-hfin">
                  Hora fin
                </label>
                <Input
                  id="f-hfin"
                  type="time"
                  value={form.horaFin}
                  onChange={(e) => set("horaFin")(e.target.value)}
                  className="h-10 border-linea-fuerte bg-panel"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className={ETIQUETA} htmlFor="f-extra">
                  Fechas adicionales (opcional)
                </label>
                <Input
                  id="f-extra"
                  value={form.fechasExtra}
                  onChange={(e) => set("fechasExtra")(e.target.value)}
                  placeholder="ej. 24 nov · 1 dic"
                  className="h-10 border-linea-fuerte bg-panel placeholder:text-tinta-muda"
                />
              </div>
            </div>
          </section>

          {/* ── Dinero ── */}
          <section className="space-y-3">
            <p className={SECCION}>Dinero (MXN)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={ETIQUETA} htmlFor="f-tarifa">
                  Tarifa total <span className="text-acento">*</span>
                </label>
                <Input
                  id="f-tarifa"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={form.tarifa}
                  onChange={(e) => set("tarifa")(e.target.value)}
                  placeholder="4500"
                  className="h-10 border-linea-fuerte bg-panel placeholder:text-tinta-muda"
                />
              </div>
              <div className="space-y-1.5">
                <label className={ETIQUETA} htmlFor="f-anticipo">
                  Anticipo pagado
                </label>
                <Input
                  id="f-anticipo"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={form.anticipo}
                  onChange={(e) => set("anticipo")(e.target.value)}
                  placeholder="0"
                  className="h-10 border-linea-fuerte bg-panel placeholder:text-tinta-muda"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className={ETIQUETA} htmlFor="f-limite">
                  Fecha límite de pago (opcional)
                </label>
                <Input
                  id="f-limite"
                  type="date"
                  value={form.fechaLimitePago}
                  onChange={(e) => set("fechaLimitePago")(e.target.value)}
                  className="h-10 border-linea-fuerte bg-panel"
                />
              </div>
            </div>
          </section>

          {/* ── Notas y glosario ── */}
          <section className="space-y-3">
            <p className={SECCION}>Notas y glosario</p>
            <div className="space-y-1.5">
              <label className={ETIQUETA} htmlFor="f-glos">
                Link a glosario (opcional)
              </label>
              <Input
                id="f-glos"
                value={form.linkGlosario}
                onChange={(e) => set("linkGlosario")(e.target.value)}
                placeholder="https://docs.google.com/…"
                className="h-10 border-linea-fuerte bg-panel placeholder:text-tinta-muda"
              />
            </div>
            <Textarea
              value={form.notas}
              onChange={(e) => set("notas")(e.target.value)}
              placeholder="Dress code, equipo de cabina, contactos alternos…"
              rows={2}
              className="border-linea-fuerte bg-panel placeholder:text-tinta-muda"
            />
          </section>

          {previa ? (
            <p className="rounded-lg border border-linea-fuerte bg-panel px-3 py-2 text-[11px] text-tinta-muda">
              Se calculará automáticamente:{" "}
              <span className="text-acento-claro">{previa}</span>
            </p>
          ) : null}

          {error ? <p className="text-xs text-peligro">{error}</p> : null}

          <div className="flex gap-2 pt-1">
            <Button
              onClick={guardar}
              disabled={enviando}
              className="h-11 flex-1 rounded-lg bg-acento text-sm font-semibold text-acento-tinta hover:bg-acento-claro"
            >
              {enviando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Guardar evento"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAbierto(false)}
              className="h-11 rounded-lg border-linea-fuerte bg-tarjeta text-tinta-suave hover:text-tinta"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
