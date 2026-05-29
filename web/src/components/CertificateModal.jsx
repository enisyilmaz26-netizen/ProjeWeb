import { useEffect } from 'react'
import { X, Printer, Award } from 'lucide-react'

function fmtDate(dateStr, language) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const titleSizeClass = { lg: 'text-base', xl: 'text-lg', '2xl': 'text-xl', '3xl': 'text-2xl' }
const bodySizeClass  = { xs: 'text-[10px]', sm: 'text-[11px]', md: 'text-xs' }
const nameSizeClass  = { lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl', '3xl': 'text-2xl' }
const nameFontStyle  = { serif: { fontFamily: 'Georgia, serif' }, sans: { fontFamily: 'inherit' } }
const logoHeightMap  = { sm: 'h-8', md: 'h-12', lg: 'h-16', xl: 'h-20' }

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

  const fullName   = `${user?.name || ''} ${user?.surname || ''}`.trim()
  const workshopName = ws?.name || ''
  const dateStr    = fmtDate(ws?.date, language)

  const title          = template?.title          || (language === 'TR' ? 'KATILIM SERTİFİKASI' : 'CERTIFICATE OF ATTENDANCE')
  const institution    = template?.institution    || 'Millî Eğitim Bakanlığı ÖGEDEP'
  const bodyText       = (template?.body_text || (language === 'TR'
    ? '"{{atolye}}" başlıklı atölyeye {{tarih}} tarihinde katılmış olduğunuz tescil edilmiştir.'
    : 'This is to certify that you attended the "{{atolye}}" workshop on {{tarih}}.'))
    .replace(/{{katilimci}}/g, fullName)
    .replace(/{{atolye}}/g, workshopName)
    .replace(/{{tarih}}/g, dateStr)
  const signatureName  = template?.signature_name  || ''
  const signatureTitle = template?.signature_title || ''
  const footerText     = template?.footer_text     || ''
  const bodyAlign      = template?.body_align      || 'center'
  const titleSize      = template?.title_size      || '2xl'
  const bodySize       = template?.body_size       || 'sm'
  const nameFont       = template?.name_font       || 'serif'
  const logoUrl        = template?.logo_url        || ''
  const logoSize       = template?.logo_size       || 'md'

  const isCentered  = bodyAlign !== 'left'
  const alignClass  = isCentered ? 'text-center' : 'text-left'
  const alignItems  = isCentered ? 'items-center' : 'items-start'
  const justifyFlex = isCentered ? 'justify-center' : 'justify-start'

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl my-auto">
        {/* Actions */}
        <div className="flex justify-between items-center mb-3">
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1565C0] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition">
            <Printer className="w-4 h-4" />
            {language === 'TR' ? 'Yazdır / PDF' : 'Print / PDF'}
          </button>
          <button onClick={onClose} className="text-white/70 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* A4 Landscape certificate */}
        <div style={{ aspectRatio: '297/210' }} className="w-full">
          <div id="certificate-print" className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">

            {/* Top bar */}
            <div className="h-3 flex-shrink-0 bg-gradient-to-r from-[#1565C0] via-[#1976D2] to-[#0D47A1]" />

            <div className={`flex-1 flex flex-col justify-between px-10 py-4 overflow-hidden ${alignItems}`}>

              {/* ── Header row ── */}
              <div className={`flex w-full gap-4 ${isCentered ? 'justify-center' : 'justify-start'} items-center`}>
                {logoUrl ? (
                  <img src={logoUrl} alt="logo"
                    className={`${logoHeightMap[logoSize] || 'h-12'} object-contain flex-shrink-0`} />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#1565C0]/10 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-[#1565C0]" />
                  </div>
                )}
                <p className={`text-[10px] font-semibold text-[#1565C0] uppercase tracking-widest whitespace-pre-line leading-snug ${alignClass}`}>
                  {institution}
                </p>
              </div>

              {/* ── Middle: title + name + body ── */}
              <div className={`flex flex-col ${alignItems} gap-1.5 w-full`}>
                <h1 className={`font-black text-gray-900 tracking-widest uppercase whitespace-pre-line leading-tight ${titleSizeClass[titleSize] || 'text-xl'} ${alignClass}`}>
                  {title}
                </h1>

                <div className="flex items-center gap-2 w-full my-1">
                  <div className="flex-1 h-px bg-[#1565C0]/25" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1565C0]" />
                  <div className="flex-1 h-px bg-[#1565C0]/25" />
                </div>

                <p className={`text-[9px] text-gray-400 uppercase tracking-widest ${alignClass}`}>
                  {language === 'TR' ? 'Sayın' : 'This certifies that'}
                </p>
                <p className={`font-bold text-[#1565C0] leading-tight ${nameSizeClass[titleSize] || 'text-xl'} ${alignClass}`}
                  style={nameFontStyle[nameFont] || nameFontStyle.serif}>
                  {fullName}
                </p>

                <p className={`text-gray-700 leading-relaxed max-w-xl mt-0.5 ${bodySizeClass[bodySize] || 'text-[11px]'} ${alignClass}`}>
                  {bodyText}
                </p>

                <div className={`flex flex-wrap gap-1.5 mt-0.5 ${justifyFlex}`}>
                  <span className="inline-flex items-center bg-[#1565C0]/10 text-[#1565C0] text-[9px] font-semibold px-2.5 py-0.5 rounded-full">
                    {workshopName}
                  </span>
                  {ws?.date && (
                    <span className="inline-flex items-center bg-gray-100 text-gray-600 text-[9px] font-semibold px-2.5 py-0.5 rounded-full">
                      {dateStr}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Footer: signature ── */}
              <div className={`flex flex-col ${alignItems} w-full gap-0.5`}>
                <div className="flex items-center gap-2 w-full mb-1.5">
                  <div className="flex-1 h-px bg-[#1565C0]/25" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1565C0]" />
                  <div className="flex-1 h-px bg-[#1565C0]/25" />
                </div>
                {signatureName  && <p className={`font-bold text-gray-900 text-[11px] ${alignClass}`}>{signatureName}</p>}
                {signatureTitle && <p className={`text-[10px] text-gray-500 ${alignClass}`}>{signatureTitle}</p>}
                {footerText     && <p className={`text-[9px] text-gray-400 ${alignClass}`}>{footerText}</p>}
              </div>
            </div>

            {/* Bottom bar */}
            <div className="h-3 flex-shrink-0 bg-gradient-to-r from-[#0D47A1] via-[#1976D2] to-[#1565C0]" />
          </div>
        </div>
      </div>
    </div>
  )
}
