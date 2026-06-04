import React from 'react'

const SIZE_MAP = { sm: 14, md: 20, lg: 28 }

function IconWrap({ size, children }) {
  const px = typeof size === 'number' ? size : (SIZE_MAP[size] || SIZE_MAP.md)
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function PodcastIcon({ size = 'md' }) {
  return (
    <IconWrap size={size}>
      {/* Sol dalga formu */}
      <path d="M3.5 10v4" opacity="0.45" />
      <path d="M6 8v8" opacity="0.7" />
      {/* Mikrofon gövdesi */}
      <rect x="9.5" y="2.5" width="5" height="10" rx="2.5" fill="currentColor" fillOpacity="0.18" />
      <rect x="9.5" y="2.5" width="5" height="10" rx="2.5" />
      {/* Stand arkı + ayak */}
      <path d="M7 11a5 5 0 0 0 10 0" />
      <path d="M12 16v4" />
      <path d="M9.5 20h5" />
      {/* Sağ dalga formu */}
      <path d="M18 8v8" opacity="0.7" />
      <path d="M20.5 10v4" opacity="0.45" />
    </IconWrap>
  )
}

export function VideoStudioIcon({ size = 'md' }) {
  return (
    <IconWrap size={size}>
      {/* Yeşil ekran arka panel */}
      <rect x="2.5" y="3" width="12" height="10" rx="1.5" fill="currentColor" fillOpacity="0.14" />
      <rect x="2.5" y="3" width="12" height="10" rx="1.5" />
      {/* Stand direği + üçgen ayak */}
      <path d="M8.5 13v6" />
      <path d="M5.5 19.5l3-1.5 3 1.5" />
      {/* Kamera gövdesi */}
      <rect x="13.5" y="9" width="7" height="5.5" rx="1" fill="currentColor" fillOpacity="0.22" />
      <rect x="13.5" y="9" width="7" height="5.5" rx="1" />
      {/* Lens parlaklığı */}
      <circle cx="15.6" cy="11.75" r="0.75" fill="currentColor" />
      {/* Vizör tepesi */}
      <path d="M17 9V7.5h2.5V9" />
    </IconWrap>
  )
}

export function PostProdIcon({ size = 'md' }) {
  return (
    <IconWrap size={size}>
      {/* Monitör çerçevesi */}
      <rect x="2" y="3" width="20" height="14" rx="1.5" fill="currentColor" fillOpacity="0.12" />
      <rect x="2" y="3" width="20" height="14" rx="1.5" />
      {/* Ayak ve taban */}
      <path d="M12 17v3" />
      <path d="M8 20h8" />
      {/* Ekran içi: önizleme penceresi */}
      <rect x="4.5" y="5.5" width="8" height="5.5" rx="0.5" fill="currentColor" fillOpacity="0.22" />
      <rect x="4.5" y="5.5" width="8" height="5.5" rx="0.5" />
      {/* Play üçgeni */}
      <path d="M7.6 7.1l2.5 1.5-2.5 1.5z" fill="currentColor" />
      {/* Sağ panel araç çubukları */}
      <path d="M14.5 6.5h5" opacity="0.7" />
      <path d="M14.5 8.5h5" opacity="0.7" />
      <path d="M14.5 10.5h3" opacity="0.7" />
      {/* Kurgu zaman çizelgesi */}
      <path d="M4.5 13.5h15" />
      <circle cx="7" cy="13.5" r="0.7" fill="currentColor" />
      <circle cx="11.5" cy="13.5" r="0.7" fill="currentColor" />
      <path d="M4.5 15.5h10" opacity="0.6" />
    </IconWrap>
  )
}

export function InstructionalDesignIcon({ size = 'md' }) {
  return (
    <IconWrap size={size}>
      {/* Defter gövdesi */}
      <rect x="3" y="3.5" width="13" height="17" rx="1.5" fill="currentColor" fillOpacity="0.14" />
      <rect x="3" y="3.5" width="13" height="17" rx="1.5" />
      {/* Sayfa başlık ayracı */}
      <path d="M3 7h13" opacity="0.5" />
      {/* Müfredat satırları */}
      <path d="M6 11h7" opacity="0.6" />
      <path d="M6 14h7" opacity="0.6" />
      <path d="M6 17h4" opacity="0.6" />
      {/* Diyagonal kalem gövdesi */}
      <path d="M14 13l5-5 2 2-5 5z" fill="currentColor" fillOpacity="0.25" />
      <path d="M14 13l5-5 2 2-5 5z" />
      {/* Kalem silgi ucu */}
      <path d="M19 8l2 2" />
      {/* Kalem yazı ucu */}
      <path d="M14 13l-1 3 3-1z" fill="currentColor" fillOpacity="0.45" />
      <path d="M14 13l-1 3 3-1z" />
    </IconWrap>
  )
}

export function StudioLabIcon({ size = 'md' }) {
  return (
    <IconWrap size={size}>
      {/* Monitör çerçevesi */}
      <rect x="2" y="3" width="20" height="14" rx="1.5" fill="currentColor" fillOpacity="0.14" />
      <rect x="2" y="3" width="20" height="14" rx="1.5" />
      {/* Monitör ayağı + taban */}
      <path d="M12 17v3" />
      <path d="M8 20h8" />
      {/* Ortada belirgin play üçgeni */}
      <path d="M10 7l5 3-5 3z" fill="currentColor" />
      {/* Alt sade kurgu zaman çizelgesi */}
      <path d="M5 14.5h14" opacity="0.6" />
      <circle cx="9" cy="14.5" r="0.8" fill="currentColor" />
      <circle cx="15" cy="14.5" r="0.8" fill="currentColor" />
    </IconWrap>
  )
}

export function getLabIcon(name = '', size = 'md') {
  const n = (name || '').toLowerCase()
  if (n.includes('ses') || n.includes('podcast') || n.includes('audio') || n.includes('mikrofon')) {
    return <PodcastIcon size={size} />
  }
  if (n.includes('video') || n.includes('yeşil ekran') || n.includes('green') || n.includes('kamera')) {
    return <VideoStudioIcon size={size} />
  }
  if (n.includes('post') || n.includes('prodüksiyon') || n.includes('düzenle') || n.includes('montaj')) {
    return <PostProdIcon size={size} />
  }
  return <InstructionalDesignIcon size={size} />
}
