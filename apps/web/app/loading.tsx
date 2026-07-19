// Skeleton loading halaman browse (PRD §5: skeleton yang meniru bentuk konten asli, bukan spinner).
export default function BrowseLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto mb-10 max-w-3xl space-y-4 text-center">
        <div className="skeleton mx-auto h-12 w-3/4" />
        <div className="skeleton mx-auto h-5 w-1/2" />
        <div className="skeleton mx-auto h-13 w-full max-w-xl rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="skeleton h-[150px] rounded-none" />
            <div className="space-y-2.5 p-4">
              <div className="skeleton h-3.5 w-16" />
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-3.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
