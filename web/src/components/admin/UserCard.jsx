import { t } from '../../lib/languages'

export default function UserCard({ user, language, processingId, onApprove, onRevoke, onResetPassword, showApprove, showRevoke, showDelete }) {
  return (
    <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[#1565C0] dark:text-[#7DD4FC] font-bold text-sm">{(user.name || '?').charAt(0).toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{user.name} {user.surname}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400 mb-3">
        {user.branch && <span><span className="font-medium">{t('lbl_branch', language)}:</span> {user.branch}</span>}
        {user.phone && <span><span className="font-medium">{t('lbl_phone', language)}:</span> {user.phone}</span>}
        {user.city_name && <span><span className="font-medium">{t('lbl_province', language)}:</span> {user.city_name}</span>}
        {user.district && <span><span className="font-medium">{t('lbl_district', language)}:</span> {user.district}</span>}
        {user.work_location && <span className="col-span-2"><span className="font-medium">{t('lbl_institution', language)}:</span> {user.work_location}</span>}
      </div>
      <div className="flex gap-2">
        {showApprove && (
          <button onClick={() => onApprove(user.id)} disabled={processingId === user.id} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
            {processingId === user.id ? '...' : t('btn_approve_member', language)}
          </button>
        )}
        {showRevoke && (
          <button onClick={() => onRevoke(user.id)} disabled={processingId === user.id} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
            {processingId === user.id ? '...' : t('btn_revoke_member', language)}
          </button>
        )}
        {showDelete && (
          <button onClick={() => onRevoke(user.id)} disabled={processingId === user.id} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
            {processingId === user.id ? '...' : t('btn_reject_member', language)}
          </button>
        )}
        <button
          onClick={onResetPassword}
          className="flex-1 py-2 border border-[#1565C0]/50 dark:border-[#7DD4FC]/50 text-[#1565C0] dark:text-[#7DD4FC] text-xs font-semibold rounded-xl hover:bg-[#1565C0]/5 dark:hover:bg-[#7DD4FC]/5 transition"
        >
          {t('btn_reset_password', language)}
        </button>
      </div>
    </div>
  )
}
