export default function AppLoading() {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <div className="hidden w-64 shrink-0 border-r bg-sidebar md:block" />
      <div className="flex flex-1 flex-col">
        <div className="h-14 border-b bg-background" />
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-64 flex-1 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
