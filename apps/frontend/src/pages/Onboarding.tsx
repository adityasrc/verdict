import { Link } from "react-router-dom";

const STEPS = [
  {
    number: "01",
    title: "Define Rubric",
    description: "Create a strict grading contract with criteria and weights.",
    icon: "format_list_bulleted",
  },
  {
    number: "02",
    title: "Create Assignment",
    description: "Generate a secure, PIN-protected upload portal.",
    icon: "assignment_add",
  },
  {
    number: "03",
    title: "Students Submit",
    description: "Students upload PDFs. The AI pipeline starts instantly.",
    icon: "upload_file",
  },
  {
    number: "04",
    title: "Review & Export",
    description: "Approve AI evaluations and export grades to CSV.",
    icon: "check_circle",
  },
];

const FEATURES = [
  {
    title: "Custom Rubric Builder",
    description: "Define exactly what you're grading: criteria names, point values, and descriptions. The AI strictly follows your rubric.",
    icon: "format_list_bulleted",
  },
  {
    title: "Real-time Progress",
    description: "A live terminal streams grading updates via WebSocket as each submission moves through the pipeline.",
    icon: "bolt",
  },
  {
    title: "PDF Text Extraction",
    description: "A Python microservice parses student PDFs page-by-page before sending the text to Gemini for evaluation.",
    icon: "description",
  },
  {
    title: "Teacher Dashboard",
    description: "Manage all your assignments, view submission counts, and drill into per-student grades from one screen.",
    icon: "dashboard",
  },
  {
    title: "Student Feedback View",
    description: "Students can see their score and the AI-generated feedback breakdown as soon as grading completes.",
    icon: "school",
  },
  {
    title: "CSV Export",
    description: "Export the full grade sheet (student IDs, names, and scores) to a CSV file with one click.",
    icon: "download",
  },
];

const TECH_STACK = [
  { label: "React + Vite", icon: "web" },
  { label: "Node.js + Express", icon: "dns" },
  { label: "Gemini AI", icon: "auto_awesome" },
  { label: "BullMQ + Redis", icon: "queue" },
  { label: "Socket.io", icon: "sync" },
  { label: "PostgreSQL", icon: "storage" },
];

const Onboarding = () => {
  return (
    <div className="bg-surface text-on-surface selection:bg-primary selection:text-on-primary">

      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden border-b-[4px] border-on-surface bg-surface">
        <div className="absolute inset-0 pointer-events-none opacity-5"
          style={{ backgroundImage: "linear-gradient(#191c1e 1px, transparent 1px), linear-gradient(90deg, #191c1e 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-24">
          <div className="flex flex-col lg:flex-row gap-16 items-center">

            {/* Left Column: Copy & CTA */}
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-primary text-on-primary border-[4px] border-on-surface px-4 py-1 brutal-shadow mb-8">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span className="font-label-caps text-label-caps uppercase">AI-Powered Grading Pipeline</span>
              </div>

              <h1 className="text-5xl sm:text-7xl lg:text-[90px] font-black tracking-tighter leading-none mb-6 uppercase text-on-surface">
                Grade faster.<br />
                <span className="text-primary">Grade smarter.</span>
              </h1>

              <p className="text-lg md:text-xl text-on-surface-variant max-w-xl mb-12 leading-relaxed font-medium">
                Verdict automates the first pass of assignment grading using Gemini AI.
                You define the rubric. The system handles PDF extraction, evaluation, and scoring.
                You review and finalize.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4 mb-16">
                <Link
                  to="/signup"
                  className="group inline-flex items-center justify-center bg-primary text-on-primary border-[4px] border-on-surface px-8 py-4 font-label-caps uppercase font-bold brutal-shadow brutal-button hover:opacity-90"
                >
                  Start Grading Free
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

              {/* Tech Stack (Clean, Static) */}
              <div>
                <p className="font-label-caps text-on-surface-variant uppercase mb-4 text-xs font-bold">Built for scale with</p>
                <div className="flex flex-wrap gap-3">
                  {TECH_STACK.map(tech => (
                    <div key={tech.label} className="flex items-center gap-2 border-[2px] border-on-surface px-3 py-1.5 bg-surface-variant">
                      <span className="material-symbols-outlined text-sm text-primary">{tech.icon}</span>
                      <span className="font-label-mono text-xs font-bold uppercase">{tech.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Terminal Preview */}
            <div className="w-full lg:w-[500px] flex-shrink-0">
              <div className="bg-on-surface border-[4px] border-on-surface brutal-shadow-lg overflow-hidden flex flex-col h-[400px]">
                <div className="bg-surface border-b-[4px] border-on-surface px-4 py-3 flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 border-[2px] border-on-surface bg-error rounded-full"></div>
                    <div className="w-3 h-3 border-[2px] border-on-surface bg-accent-yellow rounded-full"></div>
                    <div className="w-3 h-3 border-[2px] border-on-surface bg-secondary rounded-full"></div>
                  </div>
                  <span className="font-label-mono text-xs uppercase font-bold text-on-surface-variant ml-2">Pipeline Log</span>
                </div>
                <div className="flex-1 p-6 font-label-mono text-sm text-surface/60 flex flex-col gap-3 overflow-hidden">
                  <div className="flex gap-3">
                    <span className="text-surface/40 w-16">10:01:12</span>
                    <span className="text-accent-yellow">[SYS] Received submission std_084f92</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-surface/40 w-16">10:01:13</span>
                    <span className="text-secondary">[OK] Extracted text from 4 pages (PDF)</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-surface/40 w-16">10:01:13</span>
                    <span className="text-surface/60">Evaluating criteria: 'Code Quality' (20 pts)...</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-surface/40 w-16">10:01:15</span>
                    <span className="text-secondary">[OK] Score: 18/20. Reason: Good structure.</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-surface/40 w-16">10:01:16</span>
                    <span className="text-surface/60">Evaluating criteria: 'Testing' (10 pts)...</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-surface/40 w-16">10:01:17</span>
                    <span className="text-error">[FAIL] Score: 4/10. Reason: Missing unit tests.</span>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <span className="text-surface/40 w-16">10:01:18</span>
                    <span className="text-secondary font-bold">✓ Grading complete. Total: 82/100</span>
                  </div>
                  <div className="flex gap-3 mt-auto">
                    <span className="text-secondary animate-pulse">_</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM ── */}
      <section className="border-b-[4px] border-on-surface bg-on-surface text-surface px-6 py-12 md:py-16">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-start">
          <div className="lg:w-1/2">
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-8 text-primary">
              The<br />Bottleneck
            </h2>
            <p className="text-surface-variant text-xl md:text-2xl leading-relaxed font-medium">
              Teachers spend hours writing the same feedback for the same mistakes.
              Verdict eliminates this repetitive first pass, allowing educators to focus on what actually requires human judgment.
            </p>
          </div>
          <div className="lg:w-1/2 flex flex-col gap-6 w-full">
            <div className="p-8 border-[4px] border-surface brutal-shadow bg-on-surface">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-error border-[4px] border-surface flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-error font-bold text-2xl">close</span>
                </div>
                <h3 className="font-headline-md text-2xl uppercase font-black tracking-tighter">Without Verdict</h3>
              </div>
              <p className="text-surface-variant text-lg">
                Read every submission manually. Write feedback from scratch. Burn hours on boilerplate grading.
              </p>
            </div>
            <div className="p-8 border-[4px] border-surface brutal-shadow bg-surface text-on-surface ml-0 lg:ml-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-secondary border-[4px] border-on-surface flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-secondary font-bold text-2xl">check</span>
                </div>
                <h3 className="font-headline-md text-2xl uppercase font-black tracking-tighter">With Verdict</h3>
              </div>
              <p className="text-on-surface-variant text-lg font-medium">
                AI reads, grades, and explains based on your exact rubric. You review and approve in minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-b-[4px] border-on-surface bg-surface px-6 py-12 md:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-on-surface mb-6">
              How It Works
            </h2>
            <p className="text-on-surface-variant text-xl font-medium max-w-2xl mx-auto">
              A frictionless pipeline from rubric creation to final grades.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-[4px] border-on-surface brutal-shadow">
            {STEPS.map((step, index) => (
              <div
                key={step.number}
                className={`p-8 bg-surface hover:bg-surface-variant transition-colors duration-200 group relative
                  ${index < STEPS.length - 1 ? "border-b-[4px] lg:border-b-0 lg:border-r-[4px] border-on-surface" : ""}`}
              >
                <span className="font-black text-6xl text-on-surface opacity-5 absolute top-4 right-4 leading-none select-none">
                  {step.number}
                </span>
                <div className="w-14 h-14 bg-accent-yellow border-[4px] border-on-surface brutal-shadow flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-2xl text-on-surface">{step.icon}</span>
                </div>
                <div>
                  <h3 className="font-bold text-xl uppercase tracking-tight text-on-surface mb-3">{step.title}</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed font-medium">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ENGINEERING / UNDER THE HOOD ── */}
      <section className="border-b-[4px] border-on-surface px-6 py-12 md:py-16 bg-accent-yellow">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-on-surface mb-6">
              Under The Hood
            </h2>
            <p className="text-on-surface text-xl font-medium max-w-2xl mx-auto">
              A robust, event-driven pipeline designed for concurrent grading.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch border-[4px] border-on-surface brutal-shadow bg-surface">
            <div className="flex-1 p-8 border-b-[4px] lg:border-b-0 lg:border-r-[4px] border-on-surface">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary border-[4px] border-on-surface flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined">queue</span>
                </div>
                <h3 className="font-bold text-2xl uppercase tracking-tighter">Event-Driven Workers</h3>
              </div>
              <p className="text-on-surface-variant text-lg leading-relaxed">
                Submissions are queued via BullMQ and Redis. Background workers process jobs asynchronously to prevent API blocking during heavy loads.
              </p>
            </div>

            <div className="flex-1 p-8 border-b-[4px] lg:border-b-0 lg:border-r-[4px] border-on-surface">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary border-[4px] border-on-surface flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <h3 className="font-bold text-2xl uppercase tracking-tighter">PDF Parsing</h3>
              </div>
              <p className="text-on-surface-variant text-lg leading-relaxed">
                A dedicated microservice handles text extraction from complex student PDFs before streaming the content to the Gemini API for evaluation.
              </p>
            </div>

            <div className="flex-1 p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary border-[4px] border-on-surface flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined">sync</span>
                </div>
                <h3 className="font-bold text-2xl uppercase tracking-tighter">Live WebSockets</h3>
              </div>
              <p className="text-on-surface-variant text-lg leading-relaxed">
                As the worker progresses through rubric criteria, state updates are broadcasted back to the client via Socket.io in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-[4px] border-on-surface px-6 py-12 md:py-16 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
            <div>
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-on-surface">
                Features
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="p-8 border-[4px] border-on-surface brutal-shadow bg-surface-variant flex flex-col">
                <div className="w-14 h-14 bg-surface border-[4px] border-on-surface brutal-shadow flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-on-surface text-2xl">{feature.icon}</span>
                </div>
                <h3 className="font-black text-xl uppercase tracking-tighter text-on-surface mb-3">{feature.title}</h3>
                <p className="text-on-surface-variant text-base leading-relaxed flex-1 font-medium">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MASSIVE CTA ── */}
      <section className="px-6 py-16 md:py-24 bg-primary border-b-[4px] border-on-surface text-center">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-6xl sm:text-7xl md:text-[80px] font-black uppercase tracking-tighter text-on-primary leading-none mb-8">
            Ready for<br />The Verdict?
          </h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center bg-surface text-on-surface border-[4px] border-on-surface px-12 py-6 font-label-caps text-lg uppercase font-black brutal-shadow brutal-button hover:bg-surface-variant"
            >
              Create Free Account
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center bg-transparent text-on-primary border-[4px] border-on-primary px-12 py-6 font-label-caps text-lg uppercase font-black hover:bg-primary-container brutal-button"
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