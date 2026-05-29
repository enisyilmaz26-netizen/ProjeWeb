import { useEffect } from 'react'
import { X, Printer, Award } from 'lucide-react'

function fmtDate(dateStr, language) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const logoHeightMap = { sm: 32, md: 48, lg: 64, xl: 80 }

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

  // Font sizes relative to container width (container ≈ 896px at max)
  // Using inline style with em/% so they scale with the container
  const titleFontSize = { lg: '1.6cqw', xl: '2cqw', '2xl': '2.6cqw', '3xl': '3.2cqw' }[titleSize] || '2.6cqw'
  const bodyFontSize  = { xs: '1cqw',   sm: '1.2cqw', md: '1.4cqw' }[bodySize] || '1.2cqw'
  const nameFontSize  = { lg: '1.8cqw', xl: '2.2cqw', '2xl': '2.8cqw', '3xl': '3.4cqw' }[titleSize] || '2.8cqw'
  const nameStyle     = {
    fontSize: nameFontSize,
    fontFamily: nameFont === 'serif' ? 'Georgia, serif' : 'inherit',
  }

  const isCentered = bodyAlign !== 'left'
  const ac = isCentered ? 'text-center' : 'text-left'
  const ai = isCentered ? 'items-center' : 'items-start'
  const jc = isCentered ? 'justify-center' : 'justify-start'

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

        {/* A4 Landscape wrapper */}
        <div style={{ aspectRatio: '297/210', containerType: 'size' }} className="w-full">
          <div id="certificate-print"
            className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ containerType: 'inline-size' }}>

            {/* Top border */}
            <div className="flex-shrink-0 bg-gradient-to-r from-[#1565C0] via-[#1976D2] to-[#0D47A1]" style={{ height: '1.5cqh' }} />

            {/* Content */}
            <div className={`flex-1 flex flex-col justify-between overflow-hidden ${ai}`}
              style={{ padding: '3cqh 5cqw' }}>

              {/* ── Header: logo + institution (stacked) ── */}
              <div className={`flex flex-col ${ai} gap-[0.8cqh]`}>
                {logoUrl ? (
                  <img src={logoUrl} alt="logo"
                    style={{ height: `${(logoHeightMap[logoSize] || 48) / 8}cqh`, maxHeight: '12cqh' }}
                    className="object-contain" />
                ) : (
                  <div className="rounded-full bg-[#1565C0]/10 flex items-center justify-center"
                    style={{ width: '6cqh', height: '6cqh' }}>
                    <Award className="text-[#1565C0]" style={{ width: '3.5cqh', height: '3.5cqh' }} />
                  </div>
                )}
                <p className={`font-semibold text-[#1565C0] uppercase whitespace-pre-line leading-snug ${ac}`}
                  style={{ fontSize: '1.1cqw', letterSpacing: '0.15em' }}>
                  {institution}
                </p>
              </div>

              {/* ── Middle: title + name + body ── */}
              <div className={`flex flex-col ${ai} w-full`} style={{ gap: '1.2cqh' }}>
                <h1 className={`font-black text-gray-900 uppercase whitespace-pre-line leading-tight ${ac}`}
                  style={{ fontSize: titleFontSize, letterSpacing: '0.12em' }}>
                  {title}
                </h1>

                <div className="flex items-center w-full" style={{ gap: '1cqw' }}>
                  <div className="flex-1 bg-[#1565C0]/20" style={{ height: '1px' }} />
                  <div className="rounded-full bg-[#1565C0]" style={{ width: '0.6cqh', height: '0.6cqh' }} />
                  <div className="flex-1 bg-[#1565C0]/20" style={{ height: '1px' }} />
                </div>

                <p className={`text-gray-400 uppercase ${ac}`}
                  style={{ fontSize: '0.9cqw', letterSpacing: '0.2em' }}>
                  {language === 'TR' ? 'Sayın' : 'This certifies that'}
                </p>

                <p className={`font-bold text-[#1565C0] leading-tight ${ac}`} style={nameStyle}>
                  {fullName}
                </p>

                <p className={`text-gray-700 leading-relaxed ${ac}`}
                  style={{ fontSize: bodyFontSize, maxWidth: '65cqw' }}>
                  {bodyText}
                </p>

                <div className={`flex flex-wrap ${jc}`} style={{ gap: '0.8cqw' }}>
                  <span className="bg-[#1565C0]/10 text-[#1565C0] font-semibold rounded-full"
                    style={{ fontSize: '0.95cqw', padding: '0.4cqh 1.2cqw' }}>
                    {workshopName}
                  </span>
                  {ws?.date && (
                    <span className="bg-gray-100 text-gray-600 font-semibold rounded-full"
                      style={{ fontSize: '0.95cqw', padding: '0.4cqh 1.2cqw' }}>
                      {dateStr}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Footer: signature ── */}
              <div className={`flex flex-col ${ai} w-full`} style={{ gap: '0.5cqh' }}>
                <div className="flex items-center w-full" style={{ gap: '1cqw', marginBottom: '0.8cqh' }}>
                  <div className="flex-1 bg-[#1565C0]/20" style={{ height: '1px' }} />
                  <div className="rounded-full bg-[#1565C0]" style={{ width: '0.6cqh', height: '0.6cqh' }} />
                  <div className="flex-1 bg-[#1565C0]/20" style={{ height: '1px' }} />
                </div>
                {signatureName  && <p className={`font-bold text-gray-900 ${ac}`} style={{ fontSize: '1.1cqw' }}>{signatureName}</p>}
                {signatureTitle && <p className={`text-gray-500 ${ac}`} style={{ fontSize: '1cqw' }}>{signatureTitle}</p>}
                {footerText     && <p className={`text-gray-400 ${ac}`} style={{ fontSize: '0.9cqw' }}>{footerText}</p>}
              </div>
            </div>

            {/* Bottom border */}
            <div className="flex-shrink-0 bg-gradient-to-r from-[#0D47A1] via-[#1976D2] to-[#1565C0]" style={{ height: '1.5cqh' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
