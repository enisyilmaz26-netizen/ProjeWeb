export default function StatCard({ label, value, color }) {
  return (
    <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  )
}
