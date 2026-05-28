import { useEffect } from 'react'
import { X, Printer, Award } from 'lucide-react'

function fmtDate(dateStr, language) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CertificateModal({ ws, template, user, language, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handlePrint = () => {
    document.body.classList.add('printing-certificate')
    window.print()
    document.body.classList.remove('printing-certificate')
  }

  const fullName = `${user?.name || ''} ${user?.surname || ''}`.trim()
  const workshopName = ws?.name || ''
  const dateStr = fmtDate(ws?.date, language)

  const title = template?.title || (language === 'TR' ? 'KATILIM SERTİFİKASI' : 'CERTIFICATE OF ATTENDANCE')
  const institution = template?.institution || 'Millî Eğitim Bakanlığı ÖGEDEP'
  const bodyText = (template?.body_text || (language === 'TR'
    ? '"{{atolye}}" başlıklı atölyeye {{tarih}} tarihinde katılmış olduğunuz tescil edilmiştir.'
    : 'This is to certify that you attended the "{{atolye}}" workshop on {{tarih}}.'))
    .replace(/{{katilimci}}/g, fullName)
    .replace(/{{atolye}}/g, workshopName)
    .replace(/{{tarih}}/g, dateStr)
  const signatureName = template?.signature_name || ''
  const signatureTitle = template?.signature_title || ''
  const footerText = template?.footer_text || ''

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Actions bar */}
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1565C0] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition"
          >
            <Printer className="w-4 h-4" />
            {language === 'TR' ? 'Yazdır / PDF' : 'Print / PDF'}
          </button>
          <button onClick={onClose} className="text-white/70 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate card */}
        <div id="certificate-print" className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-[#1565C0] via-[#1976D2] to-[#0D47A1]" />

          <div className="px-10 py-8 text-center">
            <p className="text-[11px] font-semibold text-[#1565C0] uppercase tracking-widest mb-1">
              {institution}
            </p>

            <div className="flex justify-center my-4">
              <div className="w-16 h-16 rounded-full bg-[#1565C0]/10 flex items-center justify-center">
                <Award className="w-8 h-8 text-[#1565C0]" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-gray-900 tracking-widest uppercase mb-6">
              {title}
            </h1>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-[#1565C0]/20" />
              <div className="w-2 h-2 rounded-full bg-[#1565C0]" />
              <div className="flex-1 h-px bg-[#1565C0]/20" />
            </div>

            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
              {language === 'TR' ? 'Sayın' : 'This certifies that'}
            </p>
            <p className="text-3xl font-bold text-[#1565C0] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
              {fullName}
            </p>

            <p className="text-sm text-gray-700 leading-relaxed max-w-md mx-auto mb-6">
              {bodyText}
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <span className="inline-flex items-center bg-[#1565C0]/10 text-[#1565C0] text-xs font-semibold px-3 py-1.5 rounded-full">
                {workshopName}
              </span>
              {ws?.date && (
                <span className="inline-flex items-center bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                  {dateStr}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-[#1565C0]/20" />
              <div className="w-2 h-2 rounded-full bg-[#1565C0]" />
              <div className="flex-1 h-px bg-[#1565C0]/20" />
            </div>

            {(signatureName || signatureTitle) && (
              <div className="mb-4">
                {signatureName && <p className="font-bold text-gray-900 text-sm">{signatureName}</p>}
                {signatureTitle && <p className="text-xs text-gray-500">{signatureTitle}</p>}
              </div>
            )}

            {footerText && (
              <p className="text-[11px] text-gray-400 mt-4">{footerText}</p>
            )}
          </div>

          <div className="h-2 bg-gradient-to-r from-[#0D47A1] via-[#1976D2] to-[#1565C0]" />
        </div>
      </div>
    </div>
  )
}
