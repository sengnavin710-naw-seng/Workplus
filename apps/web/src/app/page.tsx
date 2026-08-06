import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0b211b] px-6 py-8 text-white sm:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between border-b border-white/15 pb-6">
          <Link className="inline-flex items-center gap-3 font-semibold" href="/">
            <span className="grid size-9 place-items-center bg-emerald-300 text-sm font-black text-[#0b211b]">W</span>
            <span className="text-lg">Workplus</span>
          </Link>
          <Link className="text-sm font-semibold text-emerald-100 hover:text-white" href="/login">
            Sign in
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Foundation phase</p>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              A visible, accountable workspace for workforce operations.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-emerald-50/70">
              Create an owner account and a private workspace today. Employee device enrollment will arrive before any activity collection.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                className="bg-emerald-300 px-5 py-3 text-sm font-semibold text-[#0b211b] transition hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
                href="/signup"
              >
                Create your workspace
              </Link>
              <Link
                className="border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                href="/login"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="border-t border-white/15 lg:border-l lg:border-t-0 lg:pl-12">
            <p className="text-sm font-semibold text-emerald-200">What exists now</p>
            <ol className="mt-6 space-y-0">
              {[
                ["01", "Public owner accounts"],
                ["02", "Private workspace boundaries"],
                ["03", "Role-aware dashboard access"],
              ].map(([number, label]) => (
                <li className="grid grid-cols-[3rem_1fr] border-t border-white/15 py-5" key={number}>
                  <span className="text-xs text-emerald-300">{number}</span>
                  <span className="font-medium">{label}</span>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-sm leading-6 text-emerald-50/60">
              No hidden monitoring. No keylogging. No screenshots or activity tracking are implemented.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
