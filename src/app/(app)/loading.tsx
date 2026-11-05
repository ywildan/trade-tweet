export default function AppLoading() {
  return (
    <div role="status" aria-label="Memuat halaman" className="p-4">
      <p className="mb-4 text-[14px] text-text-muted">Memuat halaman…</p>
      <div className="mb-4 h-10 rounded-xl bg-bg-input" aria-hidden="true" />
      <div className="space-y-3" aria-hidden="true">
        <div className="h-24 rounded-xl bg-bg-input" />
        <div className="h-24 rounded-xl bg-bg-input" />
        <div className="h-24 rounded-xl bg-bg-input" />
      </div>
    </div>
  );
}
