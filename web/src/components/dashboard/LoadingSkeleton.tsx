interface Props {
  type: 'table' | 'cards' | 'form';
  rows?: number;
}

export default function LoadingSkeleton({ type, rows = 5 }: Props) {
  if (type === 'cards') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-20 mb-3" />
            <div className="h-6 bg-gray-100 rounded w-32 mb-2" />
            <div className="h-2 bg-gray-100 rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className="bg-white rounded-xl p-6 space-y-5 animate-pulse">
        {[...Array(rows)].map((_, i) => (
          <div key={i}>
            <div className="h-3 bg-gray-100 rounded w-24 mb-2" />
            <div className="h-9 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // type === 'table'
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
      <div className="px-6 py-3 border-b border-gray-100 flex gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-3 bg-gray-100 rounded w-20" />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-gray-50 flex items-center gap-4">
          <div className="w-8 h-8 bg-gray-100 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-40" />
            <div className="h-2 bg-gray-100 rounded w-24" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
      ))}
    </div>
  );
}
