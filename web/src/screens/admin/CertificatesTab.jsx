import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { t } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import { Award, Eye, Save, Upload, X, Send } from 'lucide-react'
import { CertificateCanvas } from '../../components/CertificateModal'


const TITLE_SIZES  = [
  { value: 'lg',  key: 'lbl_size_small' },
  { value: 'xl',  key: 'lbl_size_medium' },
  { value: '2xl', key: 'lbl_size_large' },
  { value: '3xl', key: 'lbl_size_xlarge' },
]
const BODY_SIZES = [
  { value: 'xs', key: 'lbl_size_small' },
  { value: 'sm', key: 'lbl_size_normal' },
  { value: 'md', key: 'lbl_size_large' },
]
const NAME_FONTS = [
  { value: 'serif', key: 'lbl_font_serif' },
  { value: 'sans',  key: 'lbl_font_sans' },
]
const ALIGNS = [
  { value: 'center', key: 'lbl_align_center' },
  { value: 'left',   key: 'lbl_align_left' },
]


export default function CertificatesTab({ language, isGlobal, adminCityId, onRequestConfirm }) {
  const { certificateTemplates, saveCertificateTemplate, cities, workshops, workshopRegistrations, users, sendEmail } = useApp()
  const inputClass = INPUT_BASE
  const saveTimerRef = useRef(null)
  const fileInputRef = useRef(null)
  const userHasEdited = useRef(false)
  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setSaveError(t('err_logo_too_large', language))
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => set('logo_url', ev.target.result)
    reader.readAsDataURL(file)
  }

  const existingTemplate = certificateTemplates.find(tmpl =>
    isGlobal ? !tmpl.city_id : String(tmpl.city_id) === String(adminCityId)
  )

  const [form, setForm] = useState({
    title: '', institution: '', body_text: '',
    signature_name: '', signature_title: '', footer_text: '',
    body_align: 'center', title_size: '2xl', body_size: 'sm',
    name_font: 'serif', logo_url: '', logo_size: 'md',
  })
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const [emailWorkshopId, setEmailWorkshopId] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState(null)

  useEffect(() => {
    if (!userHasEdited.current) {
      setForm({
        title:          existingTemplate?.title          || t('cert_default_title', language),
        institution:    existingTemplate?.institution    || 'Millî Eğitim Bakanlığı ÖGEDEP',
        body_text:      existingTemplate?.body_text      || t('cert_default_body', language),
        signature_name: existingTemplate?.signature_name  || '',
        signature_title:existingTemplate?.signature_title || '',
        footer_text:    existingTemplate?.footer_text    || '',
        body_align:     existingTemplate?.body_align     || 'center',
        title_size:     existingTemplate?.title_size     || '2xl',
        body_size:      existingTemplate?.body_size      || 'sm',
        name_font:      existingTemplate?.name_font      || 'serif',
        logo_url:       existingTemplate?.logo_url       || '',
        logo_size:      existingTemplate?.logo_size      || 'md',
      })
    }
  }, [existingTemplate, language])

  const set = (k, v) => { userHasEdited.current = true; setForm(p => ({ ...p, [k]: v })) }

  const handleSave = async () => {
    setSaveError('')
    if (!form.title?.trim() || !form.institution?.trim() || !form.body_text?.trim()) {
      setSaveError(t('err_cert_required', language))
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      city_id: isGlobal ? null : adminCityId,
      ...(existingTemplate ? { id: existingTemplate.id } : {}),
    }
    try {
      const result = await saveCertificateTemplate(payload)
      if (result.success) {
        setSaveSuccess(t('cert_template_saved', language))
        clearTimeout(saveTimerRef.current); saveTimerRef.current = setTimeout(() => setSaveSuccess(''), 3000)
      } else {
        setSaveError(t('err_generic', language))
      }
    } catch {
      setSaveError(t('err_generic', language))
    } finally {
      setSaving(false)
    }
  }

  const scopedWorkshops = isGlobal
    ? workshops
    : workshops.filter(w => String(w.city_id) === String(adminCityId))

  const execSendCertEmails = async () => {
    const ws = workshops.find(w => String(w.id) === String(emailWorkshopId))
    if (!ws) return
    const attendedUserIds = workshopRegistrations
      .filter(r => String(r.workshop_id) === String(emailWorkshopId) && r.attended)
      .map(r => r.user_id)
    if (attendedUserIds.length === 0) { setEmailResult({ sent: 0, total: 0 }); return }
    const recipients = attendedUserIds.map(uid => {
      const u = users.find(u => String(u.id) === String(uid))
      return u ? { email: u.email, name: `${u.name || ''} ${u.surname || ''}`.trim() } : null
    }).filter(Boolean)
    if (recipients.length === 0) { setEmailResult({ sent: 0, total: 0 }); return }
    setEmailSending(true)
    setEmailResult(null)
    const subject = t('email_subj_cert_ready', language).replace('{workshop}', ws.name)
    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;font-size:14px;color:#1a1a1a;padding:32px;max-width:600px;margin:0 auto">
      <div style="border-top:4px solid #1565C0;padding-top:20px;margin-bottom:24px">
        <p style="font-size:11px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.1em;margin:0">MEB ÖGEDEP</p>
      </div>
      <p>${t('email_p_dear_participant', language)}</p>
      <p>${t('email_p_cert_ready', language).replace('{workshop}', ws.name)}</p>
      <p>${t('email_p_cert_download', language)}</p>
      <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">${t('email_link_go_to_system', language)}</a></p>
      <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px">
        <p style="font-size:11px;color:#9ca3af;margin:0">${t('email_footer_auto', language)}</p>
      </div>
    </body></html>`
    try {
      const result = await sendEmail({ recipients, subject, html })
      setEmailResult(result)
    } catch {
      setEmailResult({ success: false })
    } finally {
      setEmailSending(false)
    }
  }

  const handleSendCertEmails = () => {
    if (!emailWorkshopId) return
    const ws = workshops.find(w => String(w.id) === String(emailWorkshopId))
    const count = workshopRegistrations.filter(r => String(r.workshop_id) === String(emailWorkshopId) && r.attended).length
    const label = t('cert_email_confirm', language).replace('{workshop}', ws?.name || '').replace('{count}', count)
    onRequestConfirm(label, execSendCertEmails)
  }

  const cityName = isGlobal ? '' : cities.find(c => String(c.id) === String(adminCityId))?.name || ''
  const sampleName     = t('sample_name', language)
  const sampleWorkshop = t('sample_workshop', language)
  const sampleDate     = t('sample_date', language)
  const sampleLocation = t('sample_location', language)

  const selectClass = `${inputClass} w-full`

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" aria-hidden="true" />
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
            {t('cert_template_title', language)}
            {cityName ? ` · ${cityName}` : ''}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(p => !p)}
          className="flex items-center gap-1.5 text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/40 dark:border-[#7DD4FC]/40 rounded-xl px-3 py-1.5 hover:bg-[#1565C0]/5 transition"
        >
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          {showPreview ? t('cert_show_form', language) : t('cert_preview', language)}
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3 mb-4 text-xs text-blue-700 dark:text-blue-300">
        {t('cert_vars_hint', language)}
      </div>

      {saveSuccess && <div role="status" aria-live="polite" className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-3">{saveSuccess}</div>}
      {saveError  && <div role="status" aria-live="polite" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm mb-3 flex items-center justify-between"><span>{saveError}</span><button type="button" onClick={() => setSaveError('')} aria-label={t('btn_close', language)} className="ml-2 text-red-400 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" aria-hidden="true" /></button></div>}

      {showPreview ? (
        /* ── Preview — same component as user-facing certificate ── */
        <CertificateCanvas
          template={form}
          fullName={sampleName}
          workshopName={sampleWorkshop}
          dateStr={sampleDate}
          locationStr={sampleLocation}
          language={language}
        />
      ) : (
        /* ── Form ── */
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 space-y-3">

          {/* Logo */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('lbl_logo_optional', language)}
            </label>
            <div className="flex gap-2">
              <input aria-label={t('lbl_logo_optional', language)} className={`flex-1 ${inputClass}`} value={form.logo_url.startsWith('data:') ? '' : form.logo_url}
                onChange={e => set('logo_url', e.target.value)} placeholder={t('url_placeholder', language)} />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition text-gray-600 dark:text-gray-300 whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                {t('btn_choose_file', language)}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">{t('logo_upload_hint', language)}</p>
            {form.logo_url && (
              <div className="mt-1.5 flex items-center gap-2">
                <img src={form.logo_url} alt={t('alt_cert_logo', language)} className="h-8 object-contain rounded border border-gray-200" onError={e => { e.target.style.display='none' }} />
                <button type="button" onClick={() => { set('logo_url', ''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  aria-label={t('btn_clear', language)}
                  className="text-gray-400 hover:text-red-500 transition">
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
            {form.logo_url && (
              <div className="mt-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_logo_size', language)}</label>
                <select aria-label={t('lbl_logo_size', language)} className={selectClass} value={form.logo_size} onChange={e => set('logo_size', e.target.value)}>
                  <option value="sm">{t('lbl_size_small', language)}</option>
                  <option value="md">{t('lbl_size_medium', language)}</option>
                  <option value="lg">{t('lbl_size_large', language)}</option>
                  <option value="xl">{t('lbl_size_xlarge', language)}</option>
                </select>
              </div>
            )}
          </div>

          {/* Institution */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_institution_name', language)}</label>
            <textarea
              className={`w-full ${inputClass} resize-y`} rows={3}
              value={form.institution} onChange={e => set('institution', e.target.value)}
              placeholder={t('placeholder_multiline', language)}
            />
          </div>

          {/* Title + size */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_cert_title', language)}</label>
            <textarea
              className={`w-full ${inputClass} resize-y`} rows={3}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder={t('placeholder_multiline', language)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_title_size', language)}</label>
            <select aria-label={t('lbl_title_size', language)} className={selectClass} value={form.title_size} onChange={e => set('title_size', e.target.value)}>
              {TITLE_SIZES.map(s => <option key={s.value} value={s.value}>{t(s.key, language)}</option>)}
            </select>
          </div>

          {/* Body text + size + align */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_cert_body', language)}</label>
            <textarea className={`w-full ${inputClass} h-20 resize-none`} value={form.body_text} onChange={e => set('body_text', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_body_size', language)}</label>
              <select aria-label={t('lbl_body_size', language)} className={selectClass} value={form.body_size} onChange={e => set('body_size', e.target.value)}>
                {BODY_SIZES.map(s => <option key={s.value} value={s.value}>{t(s.key, language)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_alignment', language)}</label>
              <select aria-label={t('lbl_alignment', language)} className={selectClass} value={form.body_align} onChange={e => set('body_align', e.target.value)}>
                {ALIGNS.map(a => <option key={a.value} value={a.value}>{t(a.key, language)}</option>)}
              </select>
            </div>
          </div>

          {/* Name font */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_name_font', language)}</label>
            <select aria-label={t('lbl_name_font', language)} className={selectClass} value={form.name_font} onChange={e => set('name_font', e.target.value)}>
              {NAME_FONTS.map(f => <option key={f.value} value={f.value}>{t(f.key, language)}</option>)}
            </select>
          </div>

          {/* Signature */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_signatory_name', language)}</label>
              <input aria-label={t('lbl_signatory_name', language)} className={`w-full ${inputClass}`} value={form.signature_name} onChange={e => set('signature_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_signatory_title', language)}</label>
              <input aria-label={t('lbl_signatory_title', language)} className={`w-full ${inputClass}`} value={form.signature_title} onChange={e => set('signature_title', e.target.value)} />
            </div>
          </div>

          {/* Footer */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_footer_optional', language)}</label>
            <input aria-label={t('lbl_footer_optional', language)} className={`w-full ${inputClass}`} value={form.footer_text} onChange={e => set('footer_text', e.target.value)} />
          </div>

          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" aria-hidden="true" />
            {saving ? '...' : t('btn_save_template', language)}
          </button>
        </div>
      )}

      {/* Certificate Email Section */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" aria-hidden="true" />
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
            {t('cert_email_section', language)}
          </h3>
        </div>
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('cert_email_desc', language)}
          </p>
          <select
            aria-label={t('select_workshop', language)}
            className={`${inputClass} w-full`}
            value={emailWorkshopId}
            onChange={e => { setEmailWorkshopId(e.target.value); setEmailResult(null) }}
          >
            <option value="">{t('select_workshop', language)}</option>
            {scopedWorkshops.map(w => (
              <option key={w.id} value={w.id}>{w.name}{w.date ? ` (${w.date})` : ''}</option>
            ))}
          </select>
          {emailWorkshopId && (() => {
            const count = workshopRegistrations.filter(r => String(r.workshop_id) === String(emailWorkshopId) && r.attended).length
            return <p className="text-xs text-gray-500 dark:text-gray-400">{t('cert_attendee_count', language).replace('{n}', count)}</p>
          })()}
          {emailResult && (
            <p className={`text-xs font-medium ${emailResult.success === false ? 'text-red-500' : emailResult.sent === 0 ? 'text-orange-500' : 'text-green-600 dark:text-green-400'}`}>
              {emailResult.success === false
                ? (emailResult.error || t('err_generic', language))
                : t('cert_emails_sent', language).replace('{sent}', emailResult.sent ?? 0).replace('{total}', emailResult.total ?? 0)}
            </p>
          )}
          <button
            type="button"
            onClick={handleSendCertEmails}
            disabled={!emailWorkshopId || emailSending}
            className="w-full py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            {emailSending ? '...' : t('msg_send', language)}
          </button>
        </div>
      </div>
    </div>
  )
}
