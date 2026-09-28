/** Structural placeholder: hairlines in the final layout, no spinner and no pulse. */
export default function Loading() {
  return (
    <main className="pt-14" aria-busy="true" aria-label="Loading documentation">
      <div className="mx-auto w-full max-w-[1280px] px-5 md:px-6 lg:px-8">
        <div className="pb-10 pt-14 lg:pb-16 lg:pt-20">
          <p className="mono-caps text-dim">Documentation</p>
          <div className="mt-5 h-[38px] w-[180px] rounded-[4px] bg-deep" />
          <div className="mt-6 h-px w-full max-w-[60ch] bg-line" />
        </div>
        <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)_170px] lg:gap-7 xl:grid-cols-[240px_minmax(0,1fr)_200px] xl:gap-10">
          <div className="hidden lg:block">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="mb-4 h-px w-full bg-line2" />
            ))}
          </div>
          <div className="min-w-0 max-w-[720px] pt-12 lg:pt-0">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="mb-6 h-px w-full bg-line2" />
            ))}
          </div>
          <div />
        </div>
      </div>
    </main>
  );
}
