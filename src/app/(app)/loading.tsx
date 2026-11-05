export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Memuat halaman" className="p-4">
      <div className="mb-4 h-10 animate-pulse rounded-2xl bg-bg-input" />
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-2xl bg-bg-input" />
        <div className="h-24 animate-pulse rounded-2xl bg-bg-input" />
        <div className="h-24 animate-pulse rounded-2xl bg-bg-input" />
      </div>
    </div>
  );
}
