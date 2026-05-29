import { useEffect } from 'react'
import { X, Printer } from 'lucide-react'

function fmtDate(dateStr, language) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const TITLE_FS  = { lg: '1.4vw', xl: '1.7vw', '2xl': '2.1vw', '3xl': '2.6vw' }
const BODY_FS   = { xs: '0.8vw', sm: '0.9vw', md: '1.05vw' }
const NAME_FS   = { lg: '1.6vw', xl: '1.9vw', '2xl': '2.3vw', '3xl': '2.8vw' }
const LOGO_H    = { sm: '5vw', md: '7vw', lg: '9vw', xl: '11vw' }

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

  const fullName     = `${user?.name || ''} ${user?.surname || ''}`.trim()
  const workshopName = ws?.name || ''
  const dateStr      = fmtDate(ws?.date, language)

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

  const isCentered = bodyAlign !== 'left'
  const ac = isCentered ? 'text-center' : 'text-left'

  const titleStyle  = { fontSize: TITLE_FS[titleSize]  || '2.1vw', letterSpacing: '0.12em' }
  const nameStyle   = { fontSize: NAME_FS[titleSize]   || '2.3vw', fontFamily: nameFont === 'serif' ? 'Georgia, serif' : 'inherit' }
  const bodyStyle   = { fontSize: BODY_FS[bodySize]    || '0.9vw' }
  const logoStyle   = { height: LOGO_H[logoSize] || '7vw', maxHeight: '100%', objectFit: 'contain' }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl my-auto">

        {/* Action bar */}
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

        {/* A4 Landscape (297:210) */}
        <div style={{ aspectRatio: '297 / 210' }} className="w-full">
          <div id="certificate-print" className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">

            {/* Top border */}
            <div className="flex-shrink-0 bg-gradient-to-r from-[#1565C0] via-[#1976D2] to-[#0D47A1]"
              style={{ height: '1.2%' }} />

            {/* Main */}
            <div className="flex-1 flex flex-col" style={{ padding: '3% 6%' }}>

              {/* ── Header: logo left, institution right ── */}
              <div className="flex items-center gap-4 pb-3"
                style={{ borderBottom: '1px solid rgba(21,101,192,0.15)' }}>
                {logoUrl && (
                  <img src={logoUrl} alt="logo" style={logoStyle} className="flex-shrink-0" />
                )}
                <p className="font-bold text-[#1565C0] uppercase whitespace-pre-line leading-snug"
                  style={{ fontSize: '0.85vw', letterSpacing: '0.12em' }}>
                  {institution}
                </p>
              </div>

              {/* ── Center block ── */}
              <div className={`flex-1 flex flex-col justify-center ${isCentered ? 'items-center' : 'items-start'} gap-3`}>

                <h1 className={`font-black text-gray-900 uppercase whitespace-pre-line leading-tight ${ac}`}
                  style={titleStyle}>
                  {title}
                </h1>

                {/* Divider */}
                <div className="flex items-center w-full gap-3" style={{ opacity: 0.5 }}>
                  <div className="flex-1" style={{ height: '1px', background: '#1565C0' }} />
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1565C0' }} />
                  <div className="flex-1" style={{ height: '1px', background: '#1565C0' }} />
                </div>

                <p className={`text-gray-400 uppercase tracking-widest ${ac}`}
                  style={{ fontSize: '0.7vw' }}>
                  {language === 'TR' ? 'Sayın' : 'This certifies that'}
                </p>

                <p className={`font-bold text-[#1565C0] leading-tight ${ac}`} style={nameStyle}>
                  {fullName}
                </p>

                <p className={`text-gray-700 leading-relaxed ${ac}`}
                  style={{ ...bodyStyle, maxWidth: '60%' }}>
                  {bodyText}
                </p>

                <div className={`flex flex-wrap gap-2 ${isCentered ? 'justify-center' : ''}`}>
                  <span className="bg-[#1565C0]/10 text-[#1565C0] font-semibold rounded-full"
                    style={{ fontSize: '0.75vw', padding: '0.3% 1.2%' }}>
                    {workshopName}
                  </span>
                  {ws?.date && (
                    <span className="bg-gray-100 text-gray-600 font-semibold rounded-full"
                      style={{ fontSize: '0.75vw', padding: '0.3% 1.2%' }}>
                      {dateStr}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Footer: signature ── */}
              {(signatureName || signatureTitle || footerText) && (
                <div className={`flex flex-col ${isCentered ? 'items-center' : 'items-start'} pt-3`}
                  style={{ borderTop: '1px solid rgba(21,101,192,0.15)' }}>
                  {signatureName  && <p className={`font-bold text-gray-900 ${ac}`} style={{ fontSize: '0.85vw' }}>{signatureName}</p>}
                  {signatureTitle && <p className={`text-gray-500 ${ac}`}         style={{ fontSize: '0.8vw' }}>{signatureTitle}</p>}
                  {footerText     && <p className={`text-gray-400 ${ac}`}         style={{ fontSize: '0.75vw' }}>{footerText}</p>}
                </div>
              )}
            </div>

            {/* Bottom border */}
            <div className="flex-shrink-0 bg-gradient-to-r from-[#0D47A1] via-[#1976D2] to-[#1565C0]"
              style={{ height: '1.2%' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
