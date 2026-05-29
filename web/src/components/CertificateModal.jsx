import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Printer } from 'lucide-react'

function fmtDate(dateStr, language) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const NAT_W = 900
const NAT_H = 636

const TITLE_PX = { lg: 18, xl: 22, '2xl': 26, '3xl': 32 }
const BODY_PX  = { xs: 11, sm: 12, md: 14 }
const NAME_PX  = { lg: 22, xl: 26, '2xl': 30, '3xl': 36 }
const LOGO_PX  = { sm: 36, md: 54, lg: 72, xl: 90 }

export function CertificateCanvas({ template, fullName, workshopName, dateStr, locationStr, language, canvasRef, onScaleChange }) {
  const containerRef = useRef(null)
  const localRef     = useRef(null)
  const ref          = canvasRef || localRef
  const [scale, setScale] = useState(1)

  const updateScale = useCallback(() => {
    if (containerRef.current) {
      const s = containerRef.current.offsetWidth / NAT_W
      setScale(s)
      onScaleChange?.(s)
    }
  }, [onScaleChange])

  useEffect(() => {
    updateScale()
    const obs = new ResizeObserver(updateScale)
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [updateScale])

  const title          = template?.title          || (language === 'TR' ? 'KATILIM SERTİFİKASI' : 'CERTIFICATE OF ATTENDANCE')
  const institution    = template?.institution    || 'Millî Eğitim Bakanlığı ÖGEDEP'
  const bodyText       = (template?.body_text || (language === 'TR'
    ? '{{tarih}} tarihinde {{konum}} adresinde gerçekleştirilen "{{atolye}}" atölyesine katıldığınız için bu belgeyi almaya hak kazandınız.'
    : 'This certificate is awarded for attending the "{{atolye}}" workshop held at {{konum}} on {{tarih}}.'))
    .replace(/{{katilimci}}/g, fullName)
    .replace(/{{atolye}}/g, workshopName)
    .replace(/{{tarih}}/g, dateStr)
    .replace(/{{konum}}/g, locationStr)
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
  const ta = isCentered ? 'center' : 'left'
  const ai = isCentered ? 'center' : 'flex-start'

  const titlePx = TITLE_PX[titleSize] || 26
  const namePx  = NAME_PX[titleSize]  || 30
  const bodyPx  = BODY_PX[bodySize]   || 12
  const logoPx  = LOGO_PX[logoSize]   || 54

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', aspectRatio: `${NAT_W} / ${NAT_H}`, position: 'relative', overflow: 'hidden', borderRadius: 16 }}
    >
      <div
        ref={ref}
        id={canvasRef ? 'certificate-print' : undefined}
        style={{
          width: NAT_W,
          height: NAT_H,
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Top border */}
        <div style={{ height: 8, flexShrink: 0, background: 'linear-gradient(to right, #1565C0, #1976D2, #0D47A1)' }} />

        {/* Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '28px 56px 24px',
          overflow: 'hidden',
        }}>

          {/* TEST-MARKER-XYZ */}
          {/* Header: logo top, institution below */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: ai, paddingBottom: 16, borderBottom: '1px solid rgba(21,101,192,0.15)', flexShrink: 0 }}>
            {logoUrl && (
              <img src={logoUrl} alt="logo"
                style={{ height: logoPx, objectFit: 'contain', marginBottom: 8 }} />
            )}
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#1565C0',
              textTransform: 'uppercase', letterSpacing: '0.12em',
              textAlign: ta, whiteSpace: 'pre-line', lineHeight: 1.4, margin: 0,
            }}>
              {institution}
            </p>
          </div>

          {/* Main content */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: ai, justifyContent: 'flex-start',
            paddingTop: 20, gap: 10,
          }}>
            <h1 style={{
              fontSize: titlePx, fontWeight: 900, color: '#111827',
              textTransform: 'uppercase', letterSpacing: '0.12em',
              textAlign: ta, whiteSpace: 'pre-line', lineHeight: 1.2, margin: 0,
            }}>
              {title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(21,101,192,0.3)' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1565C0' }} />
              <div style={{ flex: 1, height: 1, background: 'rgba(21,101,192,0.3)' }} />
            </div>

            <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: ta, margin: 0 }}>
              {language === 'TR' ? 'Sayın' : 'This certifies that'}
            </p>

            <p style={{
              fontSize: namePx, fontWeight: 700, color: '#1565C0',
              textAlign: ta, lineHeight: 1.2,
              fontFamily: nameFont === 'serif' ? 'Georgia, serif' : 'inherit',
              margin: 0,
            }}>
              {fullName}
            </p>

            <p style={{ fontSize: bodyPx, color: '#374151', lineHeight: 1.6, textAlign: ta, maxWidth: 560, margin: 0 }}>
              {bodyText}
            </p>
          </div>

          {/* Footer: signature */}
          {(signatureName || signatureTitle || footerText) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: ai, paddingTop: 14, borderTop: '1px solid rgba(21,101,192,0.15)', flexShrink: 0, gap: 2 }}>
              {signatureName  && <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', textAlign: ta, margin: 0 }}>{signatureName}</p>}
              {signatureTitle && <p style={{ fontSize: 11, color: '#6B7280', textAlign: ta, margin: 0 }}>{signatureTitle}</p>}
              {footerText     && <p style={{ fontSize: 10, color: '#9CA3AF', textAlign: ta, margin: 0 }}>{footerText}</p>}
            </div>
          )}
        </div>

        {/* Bottom border */}
        <div style={{ height: 8, flexShrink: 0, background: 'linear-gradient(to right, #0D47A1, #1976D2, #1565C0)' }} />
      </div>
    </div>
  )
}

export default function CertificateModal({ ws, template, user, language, onClose }) {
  const innerRef = useRef(null)
  const scaleRef = useRef(1)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handlePrint = () => {
    if (innerRef.current) {
      innerRef.current.style.position = 'fixed'
      innerRef.current.style.top = '0'
      innerRef.current.style.left = '0'
      innerRef.current.style.transformOrigin = 'top left'
      innerRef.current.style.transform = `scale(${1122.5 / NAT_W})`
    }
    document.body.classList.add('printing-certificate')
    window.print()
    document.body.classList.remove('printing-certificate')
    if (innerRef.current) {
      innerRef.current.style.position = 'absolute'
      innerRef.current.style.top = '0'
      innerRef.current.style.left = '0'
      innerRef.current.style.transform = `scale(${scaleRef.current})`
    }
  }

  const fullName    = `${user?.name || ''} ${user?.surname || ''}`.trim()
  const dateStr     = fmtDate(ws?.date, language)
  const locationStr = ws?.location || ''

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

        <CertificateCanvas
          template={template}
          fullName={fullName}
          workshopName={ws?.name || ''}
          dateStr={dateStr}
          locationStr={locationStr}
          language={language}
          canvasRef={innerRef}
          onScaleChange={s => { scaleRef.current = s }}
        />
      </div>
    </div>
  )
}
