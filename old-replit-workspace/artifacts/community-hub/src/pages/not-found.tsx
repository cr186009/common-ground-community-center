import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm uppercase tracking-[0.14em] text-slate-500">404</p>
      <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">Page not found</h1>
      <p className="mt-4 text-sm text-slate-600">
        The page you're looking for doesn't exist. Did you forget to add it to the router?
      </p>
      <Link href="/" className="mt-6 rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--navy-dark)]">
        Go home
      </Link>
    </div>
  );
}
