import React from 'react';

// Skeleton Loading Components
export const Skeleton = ({ className = '', variant = 'rect' }) => {
  const baseClass = 'animate-pulse bg-slate-200 rounded';
  if (variant === 'circle') return <div className={`${baseClass} rounded-full ${className}`} />;
  if (variant === 'text') return <div className={`${baseClass} h-4 ${className}`} />;
  return <div className={`${baseClass} ${className}`} />;
};

export const CardSkeleton = () => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
    <div className="flex items-center justify-between mb-2">
      <Skeleton variant="text" className="w-20 h-3" />
      <Skeleton className="w-12 h-5 rounded-full" />
    </div>
    <Skeleton variant="text" className="w-32 h-7 mb-1" />
    <Skeleton variant="text" className="w-24 h-3" />
  </div>
);

export const ChartSkeleton = () => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
    <div className="flex items-center justify-between mb-4">
      <Skeleton variant="text" className="w-48 h-5" />
      <Skeleton className="w-32 h-8 rounded-lg" />
    </div>
    <div className="h-64 flex items-end gap-2 pt-8">
      {[40, 65, 45, 80, 55, 70, 60, 75, 50, 85, 65, 72].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

export const DeptListSkeleton = () => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
    <div className="flex items-center justify-between mb-3">
      <Skeleton variant="text" className="w-48 h-5" />
    </div>
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="py-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="w-3 h-3" />
            <Skeleton variant="text" className="w-24 h-4" />
            <div className="flex-1" />
            <Skeleton variant="text" className="w-8 h-4" />
            <Skeleton variant="text" className="w-12 h-4" />
            <Skeleton variant="text" className="w-20 h-4" />
          </div>
          <Skeleton className="h-1 mt-1.5 ml-5" />
        </div>
      ))}
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-100">
    <div className="p-6 border-b border-slate-100">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-40 h-5" />
        <div className="flex gap-3">
          <Skeleton className="w-48 h-10 rounded-lg" />
          <Skeleton className="w-32 h-10 rounded-lg" />
        </div>
      </div>
    </div>
    <div className="divide-y divide-slate-100">
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton variant="text" className="w-32 h-4 mb-1" />
            <Skeleton variant="text" className="w-20 h-3" />
          </div>
          <Skeleton variant="text" className="w-16 h-4" />
          <Skeleton variant="text" className="w-24 h-5" />
        </div>
      ))}
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header */}
    <div className="flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <div>
        <Skeleton variant="text" className="w-40 h-6 mb-1" />
        <Skeleton variant="text" className="w-24 h-4" />
      </div>
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>

    {/* Chart */}
    <ChartSkeleton />

    {/* Departments */}
    <DeptListSkeleton />
  </div>
);

export const CDRTableSkeleton = () => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm animate-pulse mt-4">
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
      <div className="h-3 bg-slate-200 rounded w-20" />
      <div className="h-3 bg-slate-100 rounded w-32" />
      <div className="ml-auto h-7 bg-slate-200 rounded w-24" />
      <div className="h-7 bg-slate-200 rounded w-24" />
    </div>
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-slate-900">
          <th className="w-[200px] px-3 py-3 text-left">
            <div className="h-3 bg-slate-700 rounded w-20" />
          </th>
          {Array.from({ length: 12 }).map((_, i) => (
            <th key={i} className="px-2 py-3">
              <div className="h-3 bg-slate-700 rounded w-6 ml-auto" />
            </th>
          ))}
          <th className="px-3 py-3">
            <div className="h-3 bg-slate-700 rounded w-10 ml-auto" />
          </th>
        </tr>
      </thead>
      <tbody>
        {[32, 24, 24, 32, 24, 24, 24, 32].map((w, i) => (
          <tr key={i} className={`border-b border-slate-100 ${i % 3 === 0 ? 'bg-slate-50' : ''}`}>
            <td className="px-3 py-2">
              <div className="h-3 bg-slate-200 rounded" style={{ width: `${w * 3}px` }} />
            </td>
            {Array.from({ length: 12 }).map((_, j) => (
              <td key={j} className="px-2 py-2">
                <div className="h-3 bg-slate-100 rounded w-10 ml-auto" />
              </td>
            ))}
            <td className="px-3 py-2 bg-slate-50/50">
              <div className="h-3 bg-slate-200 rounded w-12 ml-auto" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const SuppliersSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="h-3 bg-slate-200 rounded w-36 mb-3" />
      <div className="h-6 bg-slate-200 rounded w-64 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-48" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="h-3 bg-slate-100 rounded w-20 mb-3" />
          <div className="h-6 bg-slate-200 rounded w-24 mb-1" />
          <div className="h-2.5 bg-slate-100 rounded w-16" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="h-3 bg-slate-200 rounded w-32 mb-4" />
          <div className="h-48 bg-slate-100 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
