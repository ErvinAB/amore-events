export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <div className="h-9 w-48 animate-pulse rounded-control bg-tissue" />
      <div className="h-24 w-full animate-pulse rounded-control bg-tissue/70" />
    </div>
  );
}
