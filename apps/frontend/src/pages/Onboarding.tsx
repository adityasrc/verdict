import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Sparkles,
  Upload,
  Users,
  Zap,
} from "lucide-react";

const steps = [
  {
    title: "Set Your Rubric",
    description: "Define criteria and point allocations for each assignment.",
    icon: ClipboardList,
  },
  {
    title: "Upload Submissions",
    description: "Bulk upload student work or add files one by one.",
    icon: Upload,
  },
  {
    title: "AI Evaluation",
    description: "The engine grades each submission against your rubric.",
    icon: Sparkles,
  },
  {
    title: "Review & Finalize",
    description: "Adjust grades if needed and export the results.",
    icon: CheckCircle,
  },
];

const features = [
  {
    title: "Rubric-Based Grading",
    description:
      "The AI follows your custom criteria. You stay in control of what matters.",
    icon: ClipboardList,
  },
  {
    title: "Instant Results",
    description: "Get preliminary grades in seconds. No more all-nighters.",
    icon: Zap,
  },
  {
    title: "Organized Dashboard",
    description: "Track assignments, submissions, and grades in one clean view.",
    icon: LayoutDashboard,
  },
];

const Onboarding = () => {
  return (
    <div className="bg-zinc-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-600/[8%] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-16 md:pt-40 md:pb-24 text-center">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.9] mb-8 animate-fade-in-up">
            Grade assignments
            <br />
            <span className="text-zinc-500">with AI</span>
          </h1>

          <p
            className="text-lg md:text-xl text-zinc-400 max-w-xl mx-auto mb-12 leading-relaxed animate-fade-in-up"
            style={{ animationDelay: "80ms" }}
          >
            Define rubrics, upload submissions, and let Verdict handle the first
            pass. You review and finalize.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 animate-fade-in-up"
            style={{ animationDelay: "160ms" }}
          >
            <Link
              to="/signup"
              className="group inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-zinc-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-transparent px-8 py-3.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Sign In
            </Link>
          </div>

          <div className="relative mx-auto max-w-5xl animate-fade-in-up" style={{ animationDelay: "240ms" }}>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-7 w-full max-w-xs mx-auto rounded-md bg-zinc-800 border border-zinc-700 flex items-center px-3 text-xs text-zinc-500 font-mono">
                    verdict.app/dashboard
                  </div>
                </div>
              </div>

              <div className="flex min-h-[420px]">
                <div className="hidden sm:flex w-60 flex-col border-r border-zinc-800 bg-zinc-900/50 p-4 gap-1">
                  <div className="flex items-center gap-2 px-3 py-2 mb-4">
                    <div className="bg-violet-600 p-1 rounded-md">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-sm">Verdict</span>
                  </div>

                  {[
                    { label: "Dashboard", icon: LayoutDashboard, active: true },
                    { label: "Assignments", icon: FolderOpen, active: false },
                    { label: "Submissions", icon: Upload, active: false },
                    { label: "Analytics", icon: BarChart3, active: false },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                        item.active
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </div>
                  ))}

                  <div className="mt-auto pt-4 border-t border-zinc-800">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Users className="h-4 w-4 text-zinc-500" />
                      </div>
                      <div>
                        <div className="text-xs font-medium">Jane Doe</div>
                        <div className="text-[10px] text-zinc-600">
                          jane@edu.com
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-6 md:p-8 bg-zinc-950">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Spring 2026</p>
                      <h2 className="text-2xl font-bold tracking-tight">
                        CS101 Assignments
                      </h2>
                    </div>
                    <div className="h-9 px-4 bg-violet-600 rounded-lg flex items-center text-xs font-medium">
                      New Assignment
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                      { label: "Total", value: "12", color: "text-white" },
                      { label: "Graded", value: "8", color: "text-emerald-400" },
                      { label: "Pending", value: "4", color: "text-amber-400" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                      >
                        <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
                        <p className={`text-2xl font-bold tracking-tight ${stat.color}`}>
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      <div className="col-span-5">Assignment</div>
                      <div className="col-span-3">Due</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2 text-right">Avg</div>
                    </div>
                    {[
                      {
                        name: "Binary Search Tree",
                        due: "Mar 15",
                        status: "Graded",
                        statusColor: "bg-emerald-500/10 text-emerald-400",
                        avg: "87%",
                      },
                      {
                        name: "Dynamic Programming",
                        due: "Mar 22",
                        status: "Graded",
                        statusColor: "bg-emerald-500/10 text-emerald-400",
                        avg: "92%",
                      },
                      {
                        name: "Graph Traversal",
                        due: "Mar 29",
                        status: "Pending",
                        statusColor: "bg-amber-500/10 text-amber-400",
                        avg: "—",
                      },
                      {
                        name: "Hash Tables",
                        due: "Apr 05",
                        status: "Pending",
                        statusColor: "bg-amber-500/10 text-amber-400",
                        avg: "—",
                      },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-4 px-4 py-3.5 border-b border-zinc-800 last:border-0 items-center text-sm hover:bg-zinc-900/30 transition-colors"
                      >
                        <div className="col-span-5 font-medium text-zinc-300">
                          {row.name}
                        </div>
                        <div className="col-span-3 text-zinc-500">{row.due}</div>
                        <div className="col-span-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.statusColor}`}
                          >
                            {row.status}
                          </span>
                        </div>
                        <div className="col-span-2 text-right font-medium text-zinc-300">
                          {row.avg}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: "400ms" }}>
            <span className="text-xs text-zinc-600 tracking-widest uppercase">Scroll to explore</span>
            <ChevronDown className="h-4 w-4 text-zinc-700 animate-bounce" />
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">
              How It Works
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto">
              From rubric to final grade in four steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="relative flex flex-col items-center text-center"
              >
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-1/2 ml-6 w-[calc(100%-12px)] h-px bg-zinc-800" />
                )}
                <div className="relative z-10 mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm">
                  <step.icon
                    className="h-5 w-5 text-violet-400"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="text-xs font-semibold text-zinc-600 mb-2 uppercase tracking-wider">
                  Step {index + 1}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">
              What Verdict Does
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto">
              Focused features that solve real problems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition-all duration-200 hover:shadow-xl hover:shadow-black/20 hover:border-zinc-700 hover:-translate-y-1"
              >
                <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-900/20 text-violet-400">
                  <feature.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
};

export default Onboarding;