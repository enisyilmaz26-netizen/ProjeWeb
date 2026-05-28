import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { t } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import { Award, Eye, Save, Upload, X } from 'lucide-react'

const DEFAULT_BODY_TR = '"{{atolye}}" başlıklı atölyeye {{tarih}} tarihinde katılmış olduğunuz tescil edilmiştir.'
const DEFAULT_BODY_EN = 'This is to certify that you have successfully attended the "{{atolye}}" workshop on {{tarih}}.'

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

const titleSizeClass = { lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl', '3xl': 'text-3xl' }
const bodySizeClass  = { xs: 'text-xs', sm: 'text-sm', md: 'text-base' }
const nameFontStyle  = { serif: { fontFamily: 'Georgia, serif' }, sans: { fontFamily: 'inherit' } }

export default function CertificatesTab({ language, isGlobal, adminCityId }) {
  const { certificateTemplates, saveCertificateTemplate, cities } = useApp()
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

  const cityName = isGlobal ? '' : cities.find(c => String(c.id) === String(adminCityId))?.name || ''
  const sampleName = language === 'TR' ? 'Ahmet Yılmaz' : 'John Doe'
  const sampleWorkshop = language === 'TR' ? 'Örnek Atölye Adı' : 'Sample Workshop'
  const sampleDate = language === 'TR' ? '1 Haziran 2025' : '1 June 2025'

  const previewBody = form.body_text
    .replace(/{{katilimci}}/g, sampleName)
    .replace(/{{atolye}}/g, sampleWorkshop)
    .replace(/{{tarih}}/g, sampleDate)

  const selectClass = `${inputClass} w-full`

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" />
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
            {language === 'TR' ? 'Sertifika Şablonu' : 'Certificate Template'}
            {cityName ? ` — ${cityName}` : ''}
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
          ? 'Değişkenler: {{katilimci}} — katılımcı adı, {{atolye}} — atölye adı, {{tarih}} — tarih'
          : 'Variables: {{katilimci}} — participant name, {{atolye}} — workshop name, {{tarih}} — date'}
      </div>

      {saveSuccess && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-3">{saveSuccess}</div>}
      {saveError  && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm mb-3">{saveError}</div>}

      {showPreview ? (
        /* ── Preview ── */
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#1565C0] via-[#1976D2] to-[#0D47A1]" />
          <div className="px-8 py-6 text-center">
            {form.logo_url && (
              <div className="flex justify-center mb-3">
                <img src={form.logo_url} alt="logo"
                  className={`object-contain ${{ sm: 'h-8', md: 'h-12', lg: 'h-16', xl: 'h-20' }[form.logo_size] || 'h-12'}`}
                  onError={e => { e.target.style.display='none' }} />
              </div>
            )}
            <p className="text-[10px] font-semibold text-[#1565C0] uppercase tracking-widest mb-2 whitespace-pre-line">{form.institution}</p>
            {!form.logo_url && (
              <div className="flex justify-center my-3">
                <div className="w-10 h-10 rounded-full bg-[#1565C0]/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-[#1565C0]" />
                </div>
              </div>
            )}
            <h2 className={`font-black text-gray-900 tracking-widest uppercase mb-4 whitespace-pre-wrap ${titleSizeClass[form.title_size] || 'text-2xl'}`}>{form.title}</h2>
            <div className="flex items-center gap-2 mb-4"><div className="flex-1 h-px bg-[#1565C0]/20" /><div className="w-1.5 h-1.5 rounded-full bg-[#1565C0]" /><div className="flex-1 h-px bg-[#1565C0]/20" /></div>
            <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-1">{language === 'TR' ? 'Sayın' : 'This certifies that'}</p>
            <p className={`font-bold text-[#1565C0] mb-4 text-2xl`} style={nameFontStyle[form.name_font]}>{sampleName}</p>
            <p className={`text-gray-700 leading-relaxed max-w-sm mx-auto mb-4 ${bodySizeClass[form.body_size] || 'text-sm'} ${form.body_align === 'left' ? 'text-left' : 'text-center'}`}>{previewBody}</p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <span className="text-xs bg-[#1565C0]/10 text-[#1565C0] font-semibold px-3 py-1 rounded-full">{sampleWorkshop}</span>
              <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-3 py-1 rounded-full">{sampleDate}</span>
            </div>
            <div className="flex items-center gap-2 mb-4"><div className="flex-1 h-px bg-[#1565C0]/20" /><div className="w-1.5 h-1.5 rounded-full bg-[#1565C0]" /><div className="flex-1 h-px bg-[#1565C0]/20" /></div>
            {form.signature_name  && <p className="font-bold text-gray-900 text-sm">{form.signature_name}</p>}
            {form.signature_title && <p className="text-xs text-gray-500">{form.signature_title}</p>}
            {form.footer_text     && <p className="text-[10px] text-gray-400 mt-3">{form.footer_text}</p>}
          </div>
          <div className="h-1.5 bg-gradient-to-r from-[#0D47A1] via-[#1976D2] to-[#1565C0]" />
        </div>
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
                <img src={form.logo_url} alt="logo" className="h-8 object-contain rounded border border-gray-200" onError={e => { e.target.style.display='none' }} />
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
    </div>
  )
}
