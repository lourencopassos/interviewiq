import { SetupForm } from "@/components/setup/setup-form";

export default function NewInterviewPage() {
  return (
    <div className="container pb-24 pt-10 lg:pt-14">
      <header className="mb-8 max-w-2xl">
        <p className="eyebrow animate-fade-up">
          <span className="text-ink">new session</span> · paste · analyze · start
        </p>
        <h1
          className="mt-3 text-balance text-3xl leading-[1.05] sm:text-4xl animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          Set up the interview.
        </h1>
        <p
          className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-ink-2 animate-fade-up"
          style={{ animationDelay: "160ms" }}
        >
          Paste a job posting. The interviewer pulls out the role and the stack, reads up on
          the company, then asks you questions out loud.
        </p>
      </header>

      <SetupForm />
    </div>
  );
}
