export default function SearchLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4 border-b pb-8">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-10 w-full max-w-2xl rounded bg-muted" />
        <div className="h-5 w-full max-w-xl rounded bg-muted" />
      </div>
      <div className="mt-6 h-16 rounded-lg border bg-muted/30" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-36 rounded-lg border bg-muted/30" />
        ))}
      </div>
    </main>
  );
}
