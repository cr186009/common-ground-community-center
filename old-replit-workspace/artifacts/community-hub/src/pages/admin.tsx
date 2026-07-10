import { useState } from 'react';
import { Link } from 'wouter';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthed(true);
      } else {
        setError('The password did not match the admin configuration.');
      }
    } catch {
      setError('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  if (!authed) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-8">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Admin access</p>
          <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">Local moderation dashboard</h1>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Sign in with the password in <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">ADMIN_PASSWORD</code> to review submissions, manage sources, and run scrapers.
          </p>
        </section>

        {error ? (
          <div className="rounded-[1.75rem] border border-[color:var(--alert)]/20 bg-[color:var(--alert-soft)] p-4 text-sm text-[color:var(--alert)]">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-4 rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--navy-dark)] disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Admin dashboard</p>
            <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">Moderation, sources, and community ops</h1>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              Review pending submissions, add manual records, manage sources, and preview the weekly digest structure.
            </p>
          </div>
          <button
            onClick={() => setAuthed(false)}
            className="rounded-full border border-[color:var(--line)] px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 lg:self-end"
          >
            Sign out
          </button>
        </div>
      </section>

      <div className="rounded-[1.75rem] border border-[color:var(--forest)]/20 bg-[color:var(--forest-soft)] p-6">
        <p className="font-semibold text-[color:var(--forest)]">Admin panel — full moderation UI</p>
        <p className="mt-2 text-sm text-slate-700">
          The full admin panel with submission review, manual event creation, source management, scraper controls, and digest preview is available in the original Next.js app at <code className="rounded bg-white/70 px-1 py-0.5 text-xs">/admin</code>. Use the API server at <code className="rounded bg-white/70 px-1 py-0.5 text-xs">/api</code> to build more admin functionality here on Replit.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/events" className="rounded-full bg-[color:var(--navy)] px-4 py-2 text-sm font-semibold text-white">
            View events
          </Link>
          <Link href="/submit" className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm font-semibold text-slate-700">
            Submit content
          </Link>
        </div>
      </div>
    </div>
  );
}
