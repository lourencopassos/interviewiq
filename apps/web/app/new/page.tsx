import { SetupForm } from "@/components/setup/setup-form";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function NewInterviewPage() {
  const { t } = await getServerDictionary();

  return (
    <div className="container pb-24 pt-10 lg:pt-14">
      <header className="mb-8 max-w-2xl">
        <p className="eyebrow animate-fade-up">
          <span className="text-ink">{t.setup.header.eyebrowLead}</span> ·{" "}
          {t.setup.header.eyebrowRest}
        </p>
        <h1
          className="mt-3 text-balance text-3xl leading-[1.05] sm:text-4xl animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          {t.setup.header.title}
        </h1>
        <p
          className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-ink-2 animate-fade-up"
          style={{ animationDelay: "160ms" }}
        >
          {t.setup.header.body}
        </p>
      </header>

      <SetupForm />
    </div>
  );
}
