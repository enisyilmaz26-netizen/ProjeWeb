import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { t } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import { Award, Eye, Save, Upload, X, Send } from 'lucide-react'
import { CertificateCanvas } from '../../components/CertificateModal'

const DEFAULT_BODY_TR = '{{tarih}} tarihinde {{konum}} adresinde gerçekleştirilen "{{atolye}}" atölyesine katıldığınız için bu belgeyi almaya hak kazandınız.'
const DEFAULT_BODY_EN = 'This certificate is awarded for attending the "{{atolye}}" workshop held at {{konum}} on {{tarih}}.'

const TITLE_SIZES  = [
  { value: 'lg',  labelTR: 'Küçük',     labelEN: 'Small' },
  { value: 'xl',  labelTR: 'Orta',      labelEN: 'Medium' },
  { value: '2xl', labelTR: 'Büyük',     labelEN: 'Large' },
  { value: '3xl', labelTR: 'Çok Büyük', labelEN: 'X-Large' },
]
const BODY_SIZES = [
  { value: 'xs', labelTR: 'Küçük',  labelEN: 'Small' },
  { value: 'sm', labelTR: 'Normal', labelEN: 'Normal' },
  { value: 'md', labelTR: 'Büyük',  labelEN: 'Large' },
]
const NAME_FONTS = [
  { value: 'serif',  labelTR: 'Serif (klasik)',  labelEN: 'Serif (classic)' },
  { value: 'sans',   labelTR: 'Sans (modern)',   labelEN: 'Sans (modern)' },
]
const ALIGNS = [
  { value: 'center', labelTR: 'Ortalı',   labelEN: 'Center' },
  { value: 'left',   labelTR: 'Sola Hizalı', labelEN: 'Left' },
]


export default function CertificatesTab({ language, isGlobal, adminCityId }) {
  const { certificateTemplates, saveCertificateTemplate, cities, workshops, workshopRegistrations, users, sendEmail } = useApp()
  const inputClass = INPUT_BASE
  const saveTimerRef = useRef(null)
  const fileInputRef = useRef(null)
  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setSaveError(language === 'TR' ? 'Logo dosyası 2 MB\'dan büyük olamaz.' : 'Logo file must be under 2 MB.')
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
  const [initialized, setInitialized] = useState(false)

  const [emailWorkshopId, setEmailWorkshopId] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState(null)

  useEffect(() => {
    if (!initialized) {
      setForm({
        title:          existingTemplate?.title          || (language === 'TR' ? 'KATILIM SERTİFİKASI' : 'CERTIFICATE OF ATTENDANCE'),
        institution:    existingTemplate?.institution    || 'Millî Eğitim Bakanlığı ÖGEDEP',
        body_text:      existingTemplate?.body_text      || (language === 'TR' ? DEFAULT_BODY_TR : DEFAULT_BODY_EN),
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
      setInitialized(true)
    }
  }, [existingTemplate, initialized, language])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaveError('')
    setSaving(true)
    const payload = {
      ...form,
      city_id: isGlobal ? null : adminCityId,
      ...(existingTemplate ? { id: existingTemplate.id } : {}),
    }
    const result = await saveCertificateTemplate(payload)
    setSaving(false)
    if (result.success) {
      setSaveSuccess(language === 'TR' ? 'Şablon kaydedildi.' : 'Template saved.')
      clearTimeout(saveTimerRef.current); saveTimerRef.current = setTimeout(() => setSaveSuccess(''), 3000)
    } else {
      setSaveError(result.error || 'Hata')
    }
  }

  const scopedWorkshops = isGlobal
    ? workshops
    : workshops.filter(w => String(w.city_id) === String(adminCityId))

  const handleSendCertEmails = async () => {
    if (!emailWorkshopId) return
    const ws = workshops.find(w => String(w.id) === String(emailWorkshopId))
    if (!ws) return
    const attendedUserIds = workshopRegistrations
      .filter(r => String(r.workshop_id) === String(emailWorkshopId) && r.attended)
      .map(r => r.user_id)
    if (attendedUserIds.length === 0) {
      setEmailResult({ sent: 0, total: 0 })
      return
    }
    const recipients = attendedUserIds.map(uid => {
      const u = users.find(u => String(u.id) === String(uid))
      return u ? { email: u.email, name: `${u.name || ''} ${u.surname || ''}`.trim() } : null
    }).filter(Boolean)
    if (recipients.length === 0) {
      setEmailResult({ sent: 0, total: 0 })
      return
    }
    setEmailSending(true)
    setEmailResult(null)
    const subject = language === 'TR'
      ? `Sertifikanız Hazır – ${ws.name}`
      : `Your Certificate is Ready – ${ws.name}`
    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;font-size:14px;color:#1a1a1a;padding:32px;max-width:600px;margin:0 auto">
      <div style="border-top:4px solid #1565C0;padding-top:20px;margin-bottom:24px">
        <p style="font-size:11px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.1em;margin:0">MEB ÖGEDEP</p>
      </div>
      ${language === 'TR'
        ? `<p>Sayın katılımcı,</p>
           <p><strong>${ws.name}</strong> atölyesine katılımınız tamamlanmış olup sertifikanız hazırdır.</p>
           <p>Sertifikanızı indirmek için sisteme giriş yapın ve profilinizi ziyaret edin.</p>
           <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sisteme Giriş Yap</a></p>`
        : `<p>Dear participant,</p>
           <p>Your attendance at the <strong>${ws.name}</strong> workshop has been confirmed and your certificate is ready.</p>
           <p>Log in to the system and visit your profile to download your certificate.</p>
           <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Go to System</a></p>`}
      <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px">
        <p style="font-size:11px;color:#9ca3af;margin:0">Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
      </div>
    </body></html>`
    const result = await sendEmail({ recipients, subject, html })
    setEmailSending(false)
    setEmailResult(result)
  }

  const cityName = isGlobal ? '' : cities.find(c => String(c.id) === String(adminCityId))?.name || ''
  const sampleName = language === 'TR' ? 'Ahmet Yılmaz' : 'John Doe'
  const sampleWorkshop = language === 'TR' ? 'Örnek Atölye Adı' : 'Sample Workshop'
  const sampleDate     = language === 'TR' ? '1 Haziran 2025' : '1 June 2025'
  const sampleLocation = language === 'TR' ? 'İstanbul' : 'Istanbul'

  const selectClass = `${inputClass} w-full`

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" />
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
            {language === 'TR' ? 'Sertifika Şablonu' : 'Certificate Template'}
            {cityName ? ` · ${cityName}` : ''}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(p => !p)}
          className="flex items-center gap-1.5 text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/40 dark:border-[#7DD4FC]/40 rounded-xl px-3 py-1.5 hover:bg-[#1565C0]/5 transition"
        >
          <Eye className="w-3.5 h-3.5" />
          {showPreview ? (language === 'TR' ? 'Formu Göster' : 'Show Form') : (language === 'TR' ? 'Önizleme' : 'Preview')}
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3 mb-4 text-xs text-blue-700 dark:text-blue-300">
        {language === 'TR'
          ? 'Değişkenler: {{katilimci}} · katılımcı adı, {{atolye}} · atölye adı, {{tarih}} · tarih, {{konum}} · yer'
          : 'Variables: {{katilimci}} · participant name, {{atolye}} · workshop name, {{tarih}} · date, {{konum}} · location'}
      </div>

      {saveSuccess && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-3">{saveSuccess}</div>}
      {saveError  && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm mb-3">{saveError}</div>}

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
              {language === 'TR' ? 'Logo (isteğe bağlı)' : 'Logo (optional)'}
            </label>
            <div className="flex gap-2">
              <input className={`flex-1 ${inputClass}`} value={form.logo_url.startsWith('data:') ? '' : form.logo_url}
                onChange={e => set('logo_url', e.target.value)} placeholder="https://..." />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition text-gray-600 dark:text-gray-300 whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />
                {language === 'TR' ? 'Dosya Seç' : 'Choose File'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">{language === 'TR' ? 'Maks. 2 MB · URL veya dosya yükle' : 'Max 2 MB · Enter URL or upload file'}</p>
            {form.logo_url && (
              <div className="mt-1.5 flex items-center gap-2">
                <img src={form.logo_url} alt="Sertifika logosu" className="h-8 object-contain rounded border border-gray-200" onError={e => { e.target.style.display='none' }} />
                <button type="button" onClick={() => { set('logo_url', ''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="text-gray-400 hover:text-red-500 transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {form.logo_url && (
              <div className="mt-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Logo Boyutu' : 'Logo Size'}</label>
                <select className={selectClass} value={form.logo_size} onChange={e => set('logo_size', e.target.value)}>
                  <option value="sm">{language === 'TR' ? 'Küçük' : 'Small'}</option>
                  <option value="md">{language === 'TR' ? 'Orta' : 'Medium'}</option>
                  <option value="lg">{language === 'TR' ? 'Büyük' : 'Large'}</option>
                  <option value="xl">{language === 'TR' ? 'Çok Büyük' : 'X-Large'}</option>
                </select>
              </div>
            )}
          </div>

          {/* Institution */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Kurum Adı' : 'Institution Name'}</label>
            <textarea
              className={`w-full ${inputClass} resize-y`} rows={3}
              value={form.institution} onChange={e => set('institution', e.target.value)}
              placeholder={language === 'TR' ? 'Alt satır için Enter kullanın' : 'Press Enter for a new line'}
            />
          </div>

          {/* Title + size */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Sertifika Başlığı' : 'Certificate Title'}</label>
            <textarea
              className={`w-full ${inputClass} resize-y`} rows={3}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder={language === 'TR' ? 'Alt satır için Enter kullanın' : 'Press Enter for a new line'}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Başlık Punto' : 'Title Size'}</label>
            <select className={selectClass} value={form.title_size} onChange={e => set('title_size', e.target.value)}>
              {TITLE_SIZES.map(s => <option key={s.value} value={s.value}>{language === 'TR' ? s.labelTR : s.labelEN}</option>)}
            </select>
          </div>

          {/* Body text + size + align */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Sertifika Metni' : 'Certificate Body Text'}</label>
            <textarea className={`w-full ${inputClass} h-20 resize-none`} value={form.body_text} onChange={e => set('body_text', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Metin Punto' : 'Body Size'}</label>
              <select className={selectClass} value={form.body_size} onChange={e => set('body_size', e.target.value)}>
                {BODY_SIZES.map(s => <option key={s.value} value={s.value}>{language === 'TR' ? s.labelTR : s.labelEN}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Hizalama' : 'Alignment'}</label>
              <select className={selectClass} value={form.body_align} onChange={e => set('body_align', e.target.value)}>
                {ALIGNS.map(a => <option key={a.value} value={a.value}>{language === 'TR' ? a.labelTR : a.labelEN}</option>)}
              </select>
            </div>
          </div>

          {/* Name font */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'İsim Fontu' : 'Name Font'}</label>
            <select className={selectClass} value={form.name_font} onChange={e => set('name_font', e.target.value)}>
              {NAME_FONTS.map(f => <option key={f.value} value={f.value}>{language === 'TR' ? f.labelTR : f.labelEN}</option>)}
            </select>
          </div>

          {/* Signature */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'İmzalayan Adı' : 'Signatory Name'}</label>
              <input className={`w-full ${inputClass}`} value={form.signature_name} onChange={e => set('signature_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Unvan' : 'Title'}</label>
              <input className={`w-full ${inputClass}`} value={form.signature_title} onChange={e => set('signature_title', e.target.value)} />
            </div>
          </div>

          {/* Footer */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Alt Metin (isteğe bağlı)' : 'Footer (optional)'}</label>
            <input className={`w-full ${inputClass}`} value={form.footer_text} onChange={e => set('footer_text', e.target.value)} />
          </div>

          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? '...' : (language === 'TR' ? 'Şablonu Kaydet' : 'Save Template')}
          </button>
        </div>
      )}

      {/* Certificate Email Section */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" />
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
            {language === 'TR' ? 'Sertifika E-postası Gönder' : 'Send Certificate Email'}
          </h3>
        </div>
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {language === 'TR'
              ? 'Seçili atölyeye katılmış (attended) kullanıcılara sertifika hazır bildirimi gönderir.'
              : 'Sends a certificate-ready notification to all users marked as attended for the selected workshop.'}
          </p>
          <select
            className={`${inputClass} w-full`}
            value={emailWorkshopId}
            onChange={e => { setEmailWorkshopId(e.target.value); setEmailResult(null) }}
          >
            <option value="">{language === 'TR' ? 'Atölye Seçin' : 'Select Workshop'}</option>
            {scopedWorkshops.map(w => (
              <option key={w.id} value={w.id}>{w.name}{w.date ? ` (${w.date})` : ''}</option>
            ))}
          </select>
          {emailWorkshopId && (() => {
            const count = workshopRegistrations.filter(r => String(r.workshop_id) === String(emailWorkshopId) && r.attended).length
            return <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'TR' ? `Katılımcı: ${count} kişi` : `Attendees: ${count}`}</p>
          })()}
          {emailResult && (
            <p className={`text-xs font-medium ${emailResult.success === false ? 'text-red-500' : emailResult.sent === 0 ? 'text-orange-500' : 'text-green-600 dark:text-green-400'}`}>
              {emailResult.success === false
                ? (emailResult.error || 'Error')
                : language === 'TR'
                  ? `${emailResult.sent ?? 0}/${emailResult.total ?? 0} e-posta gönderildi`
                  : `${emailResult.sent ?? 0}/${emailResult.total ?? 0} emails sent`}
            </p>
          )}
          <button
            type="button"
            onClick={handleSendCertEmails}
            disabled={!emailWorkshopId || emailSending}
            className="w-full py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {emailSending ? '...' : (language === 'TR' ? 'Gönder' : 'Send')}
          </button>
        </div>
      </div>
    </div>
  )
}
