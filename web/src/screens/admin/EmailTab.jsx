import { useState, useMemo, useRef, useEffect } from 'react'
import { Mail, Search, X, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { t } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'

function RecipientPanel({ title, items, selected, onToggle, onSelectAll, onDeselectAll, language }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(true)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
  }, [items, search])

  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.email))
  const someSelected = filtered.some(r => selected.has(r.email))
  const selectedCount = items.filter(r => selected.has(r.email)).length

  return (
    <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700"
      >
        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
          {title}
          {selectedCount > 0 && (
            <span className="px-2 py-0.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs rounded-full font-bold">
              {t('email_selected_n', language).replace('{n}', selectedCount)}
            </span>
          )}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="p-3 space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('email_search_ph', language)}
              className={`${INPUT_BASE} w-full pl-8 text-xs py-1.5`}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>

          {/* Select all / deselect buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSelectAll(filtered.map(r => r.email))}
              disabled={allSelected || filtered.length === 0}
              className="text-xs text-[#1565C0] dark:text-[#7DD4FC] font-semibold disabled:opacity-40 hover:underline"
            >
              {t('email_select_all', language)}
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              type="button"
              onClick={() => onDeselectAll(filtered.map(r => r.email))}
              disabled={!someSelected}
              className="text-xs text-gray-500 dark:text-gray-400 font-semibold disabled:opacity-40 hover:underline"
            >
              {t('email_deselect_all', language)}
            </button>
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 py-2 text-center">{t('email_no_match', language)}</p>
            ) : filtered.map(r => {
              const checked = selected.has(r.email)
              return (
                <label key={r.email} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                  <span className="flex-shrink-0 text-[#1565C0] dark:text-[#7DD4FC]">
                    {checked
                      ? <CheckSquare className="w-4 h-4" />
                      : <Square className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
                  </span>
                  <input type="checkbox" className="sr-only" checked={checked} onChange={() => onToggle(r.email)} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{r.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{r.email}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function EmailTab({ language }) {
  const { users, admins, sendEmail } = useApp()

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedUsers, setSelectedUsers] = useState(new Set())
  const [selectedAdmins, setSelectedAdmins] = useState(new Set())
  const [sendingUsers, setSendingUsers] = useState(false)
  const [sendingAdmins, setSendingAdmins] = useState(false)
  const [msgUsers, setMsgUsers] = useState(null)
  const [msgAdmins, setMsgAdmins] = useState(null)
  const timerRef = useRef({})
  useEffect(() => () => { clearTimeout(timerRef.current.u); clearTimeout(timerRef.current.a) }, [])

  const userItems = useMemo(() =>
    (users || [])
      .filter(u => u.is_approved && u.email)
      .map(u => ({ email: u.email, name: `${u.name || ''} ${u.surname || ''}`.trim() || u.email })),
    [users]
  )

  const adminItems = useMemo(() =>
    (admins || [])
      .filter(a => a.email)
      .map(a => ({ email: a.email, name: a.name || a.email })),
    [admins]
  )

  function toggleUser(email) {
    setSelectedUsers(prev => {
      const next = new Set(prev)
      next.has(email) ? next.delete(email) : next.add(email)
      return next
    })
  }

  function toggleAdmin(email) {
    setSelectedAdmins(prev => {
      const next = new Set(prev)
      next.has(email) ? next.delete(email) : next.add(email)
      return next
    })
  }

  function selectAllUsers(emails) {
    setSelectedUsers(prev => { const next = new Set(prev); emails.forEach(e => next.add(e)); return next })
  }
  function deselectAllUsers(emails) {
    setSelectedUsers(prev => { const next = new Set(prev); emails.forEach(e => next.delete(e)); return next })
  }
  function selectAllAdmins(emails) {
    setSelectedAdmins(prev => { const next = new Set(prev); emails.forEach(e => next.add(e)); return next })
  }
  function deselectAllAdmins(emails) {
    setSelectedAdmins(prev => { const next = new Set(prev); emails.forEach(e => next.delete(e)); return next })
  }

  function setMsg(type, msg) {
    if (type === 'users') { setMsgUsers(msg); clearTimeout(timerRef.current.u); if (msg?.ok) timerRef.current.u = setTimeout(() => setMsgUsers(null), 5000) }
    else { setMsgAdmins(msg); clearTimeout(timerRef.current.a); if (msg?.ok) timerRef.current.a = setTimeout(() => setMsgAdmins(null), 5000) }
  }

  function buildHtml() {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;font-size:14px;color:#1a1a1a;padding:24px;max-width:600px">${body.replace(/\n/g, '<br>')}</body></html>`
  }

  async function handleSend(type) {
    setMsg(type, null)
    if (!subject.trim() || !body.trim()) { setMsg(type, { ok: false, text: t('email_err_subject', language) }); return }
    const selected = type === 'users' ? selectedUsers : selectedAdmins
    if (selected.size === 0) { setMsg(type, { ok: false, text: t('email_err_no_recipients', language) }); return }

    const itemList = type === 'users' ? userItems : adminItems
    const recipients = itemList.filter(r => selected.has(r.email))

    if (type === 'users') setSendingUsers(true)
    else setSendingAdmins(true)

    let result
    try {
      result = await sendEmail({ recipients, subject, html: buildHtml() })
    } finally {
      if (type === 'users') setSendingUsers(false)
      else setSendingAdmins(false)
    }

    if (!result.success) {
      setMsg(type, { ok: false, text: t('email_err_send', language) })
      return
    }

    if (result.failed > 0) {
      setMsg(type, { ok: false, text: t('email_sent_partial', language).replace('{sent}', result.sent).replace('{total}', result.total).replace('{failed}', result.failed) })
    } else {
      setMsg(type, { ok: true, text: t('email_sent_ok', language).replace('{n}', result.sent) })
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t('tab_email', language)}</h3>

      {/* Compose */}
      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 space-y-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('email_subject', language)} *</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={t('email_subject_ph', language)}
            className={`${INPUT_BASE} w-full`}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('email_body', language)} *</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={t('email_body_ph', language)}
            rows={6}
            className={`${INPUT_BASE} w-full resize-y`}
          />
        </div>
      </div>

      {/* Recipient panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Users */}
        <div className="space-y-2">
          <RecipientPanel
            title={t('email_recipients_users', language)}
            items={userItems}
            selected={selectedUsers}
            onToggle={toggleUser}
            onSelectAll={selectAllUsers}
            onDeselectAll={deselectAllUsers}
            language={language}
          />
          {msgUsers && (
            <p className={`text-xs px-1 ${msgUsers.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {msgUsers.text}
            </p>
          )}
          <button
            type="button"
            onClick={() => handleSend('users')}
            disabled={sendingUsers || selectedUsers.size === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            {sendingUsers
              ? t('email_sending', language)
              : `${t('email_send_users', language)}${selectedUsers.size > 0 ? ` (${selectedUsers.size})` : ''}`}
          </button>
        </div>

        {/* Admins */}
        <div className="space-y-2">
          <RecipientPanel
            title={t('email_recipients_admins', language)}
            items={adminItems}
            selected={selectedAdmins}
            onToggle={toggleAdmin}
            onSelectAll={selectAllAdmins}
            onDeselectAll={deselectAllAdmins}
            language={language}
          />
          {msgAdmins && (
            <p className={`text-xs px-1 ${msgAdmins.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {msgAdmins.text}
            </p>
          )}
          <button
            type="button"
            onClick={() => handleSend('admins')}
            disabled={sendingAdmins || selectedAdmins.size === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            {sendingAdmins
              ? t('email_sending', language)
              : `${t('email_send_admins', language)}${selectedAdmins.size > 0 ? ` (${selectedAdmins.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
