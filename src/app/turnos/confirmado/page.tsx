import { BrandLogo } from "@/components/brand-logo";
import { ConfirmadoIrPerfilButton } from "@/components/confirmado-ir-perfil-button";
import { CalendarDays, CheckCircle2 } from "lucide-react";

type ConfirmPageProps = {
  searchParams?: Promise<{
    treatment?: string;
    subtitle?: string;
    date?: string;
    time?: string;
    name?: string;
    phone?: string;
    id?: string;
  }>;
};

export default async function TurnoConfirmadoPage({ searchParams }: ConfirmPageProps) {
  const params = (await searchParams) ?? {};
  const treatment = params.treatment ?? "Servicio Color Studio";
  const subtitle = params.subtitle ?? "";
  const date = params.date ?? "";
  const time = params.time ?? "";
  const clientName = params.name ?? "";
  const clientPhone = params.phone ?? "";
  const reservationId = params.id ?? "";

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="mx-auto w-full max-w-md px-5 pt-10 pb-28">
        <header className="mb-8 text-center">
          <BrandLogo size="compact" className="mx-auto" />
        </header>

        <section className="overflow-hidden rounded-[28px] border border-gray-100 bg-white px-5 py-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#B88E2F]/12">
              <CheckCircle2 className="h-6 w-6 text-[#B88E2F]" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-heading text-[32px] leading-tight font-bold text-[#B88E2F]">
                ¡Reserva confirmada!
              </h1>
              <p className="mt-1 text-[16px] text-gray-600">Tu turno ha sido agendado con éxito.</p>
            </div>
          </div>

          {reservationId ? (
            <p className="mb-5 text-[11px] tracking-[0.06em] text-gray-400">
              Referencia: <span className="font-mono text-gray-500">{reservationId}</span>
            </p>
          ) : null}

          <div className="rounded-[24px] border border-gray-100 bg-[#F5F5F5] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-[28px] leading-tight font-bold text-gray-900">{treatment}</h2>
                {date && time ? (
                  <p className="mt-2 text-[17px] font-medium text-gray-800">
                    {date} · {time} hs
                  </p>
                ) : null}
                {subtitle ? (
                  <p className="mt-1 text-[13px] tracking-[0.08em] text-gray-500 uppercase">{subtitle}</p>
                ) : null}
                {(clientName || clientPhone) && (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-[13px] text-gray-600">
                    {clientName ? <p className="font-medium text-gray-900">{clientName}</p> : null}
                    {clientPhone ? <p className="mt-1 text-gray-500">WhatsApp: {clientPhone}</p> : null}
                  </div>
                )}
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white">
                <CalendarDays className="h-6 w-6 text-[#B88E2F]" strokeWidth={1.8} />
              </div>
            </div>
          </div>

          <ConfirmadoIrPerfilButton phone={clientPhone} />
        </section>
      </main>
    </div>
  );
}
