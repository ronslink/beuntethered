export default function Loading() {
  return (
    <main className="lg:p-6 relative min-h-full pb-20 overflow-hidden">
      <div className="absolute top-[-10%] left-[30%] w-[500px] h-[500px] bg-tertiary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

      <div className="px-4 lg:px-0 relative z-10 max-w-7xl mx-auto w-full">
        {/* Header skeleton */}
        <div className="mb-8 border-b border-outline-variant/30 pb-8">
          <div className="h-6 w-32 rounded-full bg-surface-container-high animate-pulse mb-4"></div>
          <div className="h-12 w-80 rounded-xl bg-surface-container-high animate-pulse mb-4"></div>
          <div className="h-4 w-96 rounded-lg bg-surface-container-high animate-pulse"></div>
        </div>

        {/* Filter bar skeleton */}
        <div className="mb-8 flex flex-wrap gap-3">
          <div className="h-10 flex-1 min-w-[200px] rounded-xl bg-surface-container-high animate-pulse"></div>
          <div className="h-10 w-40 rounded-xl bg-surface-container-high animate-pulse"></div>
          <div className="h-10 w-40 rounded-xl bg-surface-container-high animate-pulse"></div>
          <div className="h-10 w-44 rounded-xl bg-surface-container-high animate-pulse"></div>
        </div>

        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface/60 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-8 animate-pulse">
              <div className="flex justify-between items-start mb-6">
                <div className="h-5 w-20 rounded-md bg-surface-container-high"></div>
                <div className="h-5 w-16 rounded-md bg-surface-container-high"></div>
              </div>
              <div className="mb-8 flex-1">
                <div className="h-7 w-full rounded-lg bg-surface-container-high mb-3"></div>
                <div className="h-7 w-3/4 rounded-lg bg-surface-container-high mb-6"></div>
                <div className="h-20 rounded-2xl bg-surface-container-high"></div>
              </div>
              <div className="h-10 w-full rounded-xl bg-surface-container-high mb-3"></div>
              <div className="h-10 w-full rounded-xl bg-surface-container-high"></div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
