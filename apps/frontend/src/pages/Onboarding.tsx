import { Link } from "react-router-dom";

const STEPS = [
  {
    number: "01",
    title: "Define Your Rubric",
    description:
      "Create a grading rubric with named criteria, point weights, and descriptions. The AI uses this as its grading contract.",
    icon: "format_list_bulleted",
  },
  {
    number: "02",
    title: "Create an Assignment",
    description:
      "Set up an assignment with a due date and attach your rubric. A unique 4-digit PIN is generated for student access control.",
    icon: "assignment_add",
  },
  {
    number: "03",
    title: "Students Submit",
    description:
      "Share the upload link. Students enter the PIN, upload their PDF, and the grading pipeline starts automatically.",
    icon: "upload_file",
  },
  {
    number: "04",
    title: "Review & Export",
    description:
      "Watch live grading progress in real time. Review AI feedback per student, re-evaluate if needed, and export grades to CSV.",
    icon: "check_circle",
  },
];

const FEATURES = [
  {
    title: "Custom Rubric Builder",
    description:
      "Define exactly what you're grading: criteria names, point values, and descriptions. The AI strictly follows your rubric.",
    icon: "format_list_bulleted",
  },
  {
    title: "Real-time Progress",
    description:
      "A live terminal streams grading updates via WebSocket as each submission moves through the pipeline.",
    icon: "bolt",
  },
  {
    title: "PDF Text Extraction",
    description:
      "A Python microservice parses student PDFs page-by-page before sending the text to Gemini for evaluation.",
    icon: "description",
  },
  {
    title: "Teacher Dashboard",
    description:
      "Manage all your assignments, view submission counts, and drill into per-student grades from one screen.",
    icon: "dashboard",
  },
  {
    title: "Student Feedback View",
    description:
      "Students can see their score and the AI-generated feedback breakdown as soon as grading completes.",
    icon: "school",
  },
  {
    title: "CSV Export",
    description:
      "Export the full grade sheet (student IDs, names, and scores) to a CSV file with one click.",
    icon: "download",
  },
];

const TECH_STACK = [
  { label: "React + Vite", icon: "web" },
  { label: "Node.js + Express", icon: "dns" },
  { label: "Gemini AI", icon: "auto_awesome" },
  { label: "BullMQ + Redis", icon: "queue" },
  { label: "Socket.io", icon: "sync" },
  { label: "PostgreSQL + Prisma", icon: "storage" },
];

const Onboarding = () => {
  return (
    <div className="bg-surface text-on-surface">

      <section className="relative overflow-hidden border-b-[4px] border-on-surface">
        {/* Decorative grid lines */}
        <div className="absolute inset-0 pointer-events-none opacity-5"
          style={{ backgroundImage: "linear-gradient(#191c1e 1px, transparent 1px), linear-gradient(90deg, #191c1e 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20 md:pt-44 md:pb-28">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary text-on-primary border-[4px] border-on-surface px-4 py-1 brutal-shadow mb-8">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span className="font-label-caps text-label-caps uppercase">AI-Powered Grading</span>
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-[100px] font-black tracking-tighter leading-none mb-8 uppercase text-on-surface">
            Grade faster.<br />
            <span className="text-primary">Grade smarter.</span>
          </h1>

          <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mb-12 leading-relaxed font-medium">
            Verdict automates the first pass of assignment grading using Gemini AI.
            You define the rubric, and the system handles evaluation, feedback, and scoring.
            You review and finalize.
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Link
              to="/signup"
              className="group inline-flex items-center justify-center bg-primary text-on-primary border-[4px] border-on-surface px-8 py-4 font-label-caps uppercase font-bold brutal-shadow brutal-button hover:bg-primary-container"
            >
              Get Started Free
              <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
            <a
              href="https://github.com/adityasrc/verdict"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-surface text-on-surface border-[4px] border-on-surface px-8 py-4 font-label-caps uppercase font-bold brutal-shadow brutal-button hover:bg-surface-variant"
            >
              <span className="material-symbols-outlined mr-2">code</span>
              View Source
            </a>
          </div>
        </div>
      </section>

      <section className="border-b-[4px] border-on-surface bg-on-surface text-surface px-6 py-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-label-caps text-primary mb-4 uppercase border-b-[2px] border-primary inline-block pb-1">
              The Problem
            </p>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-6">
              Manual grading is a bottleneck.
            </h2>
            <p className="text-surface-variant text-lg leading-relaxed">
              Teachers spend hours giving the same feedback on the same mistakes.
              Verdict eliminates the repetitive first pass, so you can spend time
              on what actually requires human judgment.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { label: "Without Verdict", detail: "Read every submission manually. Write feedback from scratch. Hours lost.", icon: "close", accent: "bg-error" },
              { label: "With Verdict", detail: "AI reads, grades, and explains. You review and approve in minutes.", icon: "check", accent: "bg-secondary" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-6 p-6 border-[4px] border-surface brutal-shadow bg-inverse-surface">
                <div className={`${item.accent} w-10 h-10 border-[2px] border-surface flex items-center justify-center flex-shrink-0`}>
                  <span className="material-symbols-outlined text-on-primary font-bold">{item.icon}</span>
                </div>
                <div>
                  <p className="font-bold uppercase font-label-caps mb-1">{item.label}</p>
                  <p className="text-inverse-on-surface text-sm leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-[4px] border-on-surface bg-accent-yellow px-6 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <p className="font-label-caps text-on-surface-variant uppercase border-b-[2px] border-on-surface inline-block pb-1 mb-4">
              Process
            </p>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-on-surface">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-[4px] border-on-surface brutal-shadow">
            {STEPS.map((step, index) => (
              <div
                key={step.number}
                className={`p-8 flex flex-col gap-6 relative bg-surface hover:-translate-y-1 transition-transform duration-200
                  ${index < STEPS.length - 1 ? "border-b-[4px] lg:border-b-0 lg:border-r-[4px] border-on-surface" : ""}`}
              >
                {/* Step number badge */}
                <span className="font-black text-6xl text-on-surface opacity-10 absolute top-4 right-4 leading-none select-none">
                  {step.number}
                </span>

                <div className="w-14 h-14 bg-primary border-[4px] border-on-surface brutal-shadow flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-on-primary">{step.icon}</span>
                </div>

                <div>
                  <h3 className="font-bold text-xl uppercase tracking-tight text-on-surface mb-2">{step.title}</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-[4px] border-on-surface px-6 py-24 md:py-32 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <p className="font-label-caps text-on-surface-variant uppercase border-b-[2px] border-on-surface inline-block pb-1 mb-4">
              Capabilities
            </p>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-on-surface">
              What Verdict Does
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-[4px] border-on-surface brutal-shadow">
            {FEATURES.map((feature, index) => {
              // Create a border grid: right border for all except last in row, bottom border for all except last row
              const isLastInRowMd = (index + 1) % 2 === 0;
              const isLastInRowLg = (index + 1) % 3 === 0;
              const isLastRow = index >= FEATURES.length - 3;

              return (
                <div
                  key={feature.title}
                  className={`p-8 bg-surface hover:bg-surface-variant transition-colors duration-200 group
                    ${!isLastInRowLg ? "lg:border-r-[4px]" : ""}
                    ${!isLastInRowMd ? "md:border-r-[4px] lg:border-r-0" : ""}
                    ${!isLastRow ? "border-b-[4px]" : ""}
                    border-on-surface`}
                >
                  <div className="w-12 h-12 bg-accent-yellow border-[4px] border-on-surface brutal-shadow flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-on-surface">{feature.icon}</span>
                  </div>
                  <h3 className="font-bold text-xl uppercase tracking-tight text-on-surface mb-3">{feature.title}</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b-[4px] border-on-surface px-6 py-20 bg-surface-variant">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-16">
            <div className="md:w-1/3">
              <p className="font-label-caps text-on-surface-variant uppercase border-b-[2px] border-on-surface inline-block pb-1 mb-4">
                Stack
              </p>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-on-surface">
                Built with production-grade tools.
              </h2>
            </div>
            <div className="md:w-2/3 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {TECH_STACK.map((tech) => (
                <div key={tech.label} className="flex items-center gap-3 p-4 bg-surface border-[4px] border-on-surface brutal-shadow">
                  <span className="material-symbols-outlined text-primary">{tech.icon}</span>
                  <span className="font-label-caps text-label-caps uppercase font-bold">{tech.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-24 bg-primary border-b-[4px] border-on-surface">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-on-primary leading-none mb-4">
              Ready to try it?
            </h2>
            <p className="text-on-primary opacity-80 text-lg max-w-md">
              Create a free account as a Teacher, build your first rubric, and run your first grading pipeline.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
            {/* White button with dark text - visible on purple background */}
            <Link
              to="/signup"
              className="inline-flex items-center justify-center bg-surface text-on-surface border-[4px] border-on-surface px-8 py-4 font-label-caps uppercase font-bold brutal-shadow brutal-button hover:bg-surface-variant"
            >
              Create Account
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center bg-transparent text-on-primary border-[4px] border-on-primary px-8 py-4 font-label-caps uppercase font-bold hover:bg-primary-container brutal-button"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Onboarding;