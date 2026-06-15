import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type BookingWizardShellProps = {
  onBack: () => void;
  title: string;
  subtitle: string;
  summary?: ReactNode;
  closeHref?: string;
  children: ReactNode;
  continueLabel: string;
  onContinue: () => void;
  continueDisabled?: boolean;
  continueHint?: string | null;
  continueLoading?: boolean;
  hideContinue?: boolean;
};

export function BookingWizardShell({
  onBack,
  title,
  subtitle,
  summary,
  closeHref = "/",
  children,
  continueLabel,
  onContinue,
  continueDisabled = false,
  continueHint = null,
  continueLoading = false,
  hideContinue = false,
}: BookingWizardShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-gray-900">
      <header className="flex items-center justify-between bg-white px-6 pt-12 pb-4">
        <button type="button" onClick={onBack} aria-label="Volver" className="cursor-pointer p-1">
          <ArrowLeft className="h-6 w-6" strokeWidth={2} />
        </button>
        <Link href={closeHref} className="text-lg font-normal text-gray-500">
          Cerrar
        </Link>
      </header>

      <section className="px-6 pb-6">
        <h1 className="font-heading text-5xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-xl text-gray-800">{subtitle}</p>
      </section>

      {summary ? (
        <div className="flex items-center justify-between border-y border-gray-100 bg-[#F5F5F5] px-6 py-3">
          {summary}
        </div>
      ) : null}

      <main className="flex-1 overflow-y-auto px-5 pt-8 pb-44">{children}</main>

      {!hideContinue ? (
        <div className="fixed inset-x-0 z-40 border-t border-gray-100 bg-white px-5 pt-3 pb-2 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            disabled={continueDisabled || continueLoading}
            onClick={onContinue}
            className={`w-full rounded-[30px] py-4 text-lg font-semibold text-white shadow-lg transition-transform ${
              continueDisabled || continueLoading
                ? "cursor-not-allowed bg-gray-300"
                : "cursor-pointer bg-[#B88E2F] active:scale-95"
            } ${continueLoading ? "cursor-wait opacity-80" : ""}`}
          >
            {continueLabel}
          </button>
          {continueHint && continueDisabled ? (
            <p className="mt-2 text-center text-[15px] text-[#B88E2F]">{continueHint}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
