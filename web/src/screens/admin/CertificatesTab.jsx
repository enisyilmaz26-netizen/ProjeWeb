import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { t } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import { Award, Eye, Save, Printer } from 'lucide-react'

const DEFAULT_BODY_TR = '"{{atolye}}" başlıklı atölyeye {{tarih}} tarihinde katılmış olduğunuz tescil edilmiştir.'
const DEFAULT_BODY_EN = 'This is to certify that you have successfully attended the "{{atolye}}" workshop on {{tarih}}.'

export default function CertificatesTab({ language, isGlobal, adminCityId }) {
  const { certificateTemplates, saveCertificateTemplate, cities } = useApp()
  const inputClass = INPUT_BASE
  const saveTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  const existingTemplate = certificateTemplates.find(t =>
    isGlobal
      ? !t.city_id
      : String(t.city_id) === String(adminCityId)
  )

  const [form, setForm] = useState({
    title: '',
    institution: '',
    body_text: '',
    signature_name: '',
    signature_title: '',
    footer_text: '',
  })
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!initialized) {
      setForm({
        title: existingTemplate?.title || (language === 'TR' ? 'KATILIM SERTİFİKASI' : 'CERTIFICATE OF ATTENDANCE'),
        institution: existingTemplate?.institution || 'Millî Eğitim Bakanlığı ÖGEDEP',
        body_text: existingTemplate?.body_text || (language === 'TR' ? DEFAULT_BODY_TR : DEFAULT_BODY_EN),
        signature_name: existingTemplate?.signature_name || '',
        signature_title: existingTemplate?.signature_title || '',
        footer_text: existingTemplate?.footer_text || '',
      })
      setInitialized(true)
    }
  }, [existingTemplate, initialized, language])

  const handleSave = async (e) => {
    e.preventDefault()
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

  const previewBody = form.body_text
    .replace(/{{katilimci}}/g, language === 'TR' ? 'Ahmet Yılmaz' : 'John Doe')
    .replace(/{{atolye}}/g, language === 'TR' ? 'Örnek Atölye Adı' : 'Sample Workshop')
    .replace(/{{tarih}}/g, language === 'TR' ? '1 Haziran 2025' : '1 June 2025')

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
          ? 'Metin içinde kullanılabilir değişkenler: {{katilimci}} — katılımcı adı, {{atolye}} — atölye adı, {{tarih}} — tarih'
          : 'Available variables in text: {{katilimci}} — participant name, {{atolye}} — workshop name, {{tarih}} — date'}
      </div>

      {saveSuccess && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-3">{saveSuccess}</div>}
      {saveError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm mb-3">{saveError}</div>}

      {showPreview ? (
        /* Preview */
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#1565C0] via-[#1976D2] to-[#0D47A1]" />
          <div className="px-8 py-6 text-center">
            <p className="text-[10px] font-semibold text-[#1565C0] uppercase tracking-widest mb-1">{form.institution}</p>
            <div className="flex justify-center my-3">
              <div className="w-12 h-12 rounded-full bg-[#1565C0]/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-[#1565C0]" />
              </div>
            </div>
            <h2 className="text-lg font-black text-gray-900 tracking-widest uppercase mb-4">{form.title}</h2>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-[#1565C0]/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#1565C0]" />
              <div className="flex-1 h-px bg-[#1565C0]/20" />
            </div>
            <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-1">{language === 'TR' ? 'Sayın' : 'This certifies that'}</p>
            <p className="text-2xl font-bold text-[#1565C0] mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              {language === 'TR' ? 'Ahmet Yılmaz' : 'John Doe'}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed max-w-sm mx-auto mb-4">{previewBody}</p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <span className="text-xs bg-[#1565C0]/10 text-[#1565C0] font-semibold px-3 py-1 rounded-full">
                {language === 'TR' ? 'Örnek Atölye Adı' : 'Sample Workshop'}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-3 py-1 rounded-full">
                {language === 'TR' ? '1 Haziran 2025' : '1 June 2025'}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-[#1565C0]/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#1565C0]" />
              <div className="flex-1 h-px bg-[#1565C0]/20" />
            </div>
            {form.signature_name && <p className="font-bold text-gray-900 text-sm">{form.signature_name}</p>}
            {form.signature_title && <p className="text-xs text-gray-500">{form.signature_title}</p>}
            {form.footer_text && <p className="text-[10px] text-gray-400 mt-3">{form.footer_text}</p>}
          </div>
          <div className="h-1.5 bg-gradient-to-r from-[#0D47A1] via-[#1976D2] to-[#1565C0]" />
        </div>
      ) : (
        /* Edit form */
        <form onSubmit={handleSave} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {language === 'TR' ? 'Sertifika Başlığı' : 'Certificate Title'}
            </label>
            <input
              className={`w-full ${inputClass}`}
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {language === 'TR' ? 'Kurum Adı' : 'Institution Name'}
            </label>
            <input
              className={`w-full ${inputClass}`}
              value={form.institution}
              onChange={e => setForm(p => ({ ...p, institution: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {language === 'TR' ? 'Sertifika Metni' : 'Certificate Body Text'}
            </label>
            <textarea
              className={`w-full ${inputClass} h-20 resize-none`}
              value={form.body_text}
              onChange={e => setForm(p => ({ ...p, body_text: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {language === 'TR' ? 'İmzalayan Adı' : 'Signatory Name'}
              </label>
              <input
                className={`w-full ${inputClass}`}
                value={form.signature_name}
                onChange={e => setForm(p => ({ ...p, signature_name: e.target.value }))}
                placeholder={language === 'TR' ? 'Genel Müdür Adı' : 'Director General'}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {language === 'TR' ? 'İmzalayan Unvanı' : 'Signatory Title'}
              </label>
              <input
                className={`w-full ${inputClass}`}
                value={form.signature_title}
                onChange={e => setForm(p => ({ ...p, signature_title: e.target.value }))}
                placeholder={language === 'TR' ? 'Genel Müdür' : 'General Director'}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {language === 'TR' ? 'Alt Metin (isteğe bağlı)' : 'Footer Text (optional)'}
            </label>
            <input
              className={`w-full ${inputClass}`}
              value={form.footer_text}
              onChange={e => setForm(p => ({ ...p, footer_text: e.target.value }))}
              placeholder={language === 'TR' ? 'Örnek: Bu sertifika elektronik ortamda düzenlenmiştir.' : 'e.g. This certificate was issued electronically.'}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? '...' : (language === 'TR' ? 'Şablonu Kaydet' : 'Save Template')}
          </button>
        </form>
      )}
    </div>
  )
}
