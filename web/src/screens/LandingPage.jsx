import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import AppLogo from '../components/AppLogo'

const NAV_LINKS = [
  { href: '#proje', label: { TR: 'Proje', EN: 'Project' } },
  { href: '#sehirler', label: { TR: 'Şehirler', EN: 'Cities' } },
  { href: '#nasil-calisir', label: { TR: 'Nasıl Çalışır?', EN: 'How It Works' } },
]

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export default function LandingPage({ onLoginClick }) {
  const { cities, labs, language, isDarkMode, toggleLanguage, toggleDarkMode } = useApp()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const lang = language

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const statsData = [
    {
      value: cities.length || 7,
      label: { TR: 'İl', EN: 'Province' },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
      ),
    },
    {
      value: labs.length || 29,
      label: { TR: 'Stüdyo', EN: 'Studio' },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
    },
    {
      value: '200K+',
      label: { TR: 'Hedef Öğretmen', EN: 'Target Teachers' },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      value: '3.75M€',
      label: { TR: 'Proje Bütçesi', EN: 'Project Budget' },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
  ]

  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07"/>
        </svg>
      ),
      title: { TR: 'Podcast & Ses Stüdyosu', EN: 'Podcast & Audio Studio' },
      desc: { TR: 'Profesyonel ses kayıt ekipmanlarıyla podcast ve sesli içerik üretimi.', EN: 'Podcast and audio content production with professional recording equipment.' },
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7">
          <rect x="2" y="2" width="20" height="20" rx="2.18"/>
          <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"/>
        </svg>
      ),
      title: { TR: 'Video Kayıt & Yeşil Ekran', EN: 'Video Recording & Green Screen' },
      desc: { TR: 'Yüksek kaliteli video içerik üretimi için profesyonel yeşil ekran stüdyoları.', EN: 'Professional green screen studios for high-quality video content production.' },
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7">
          <rect x="2" y="3" width="20" height="13" rx="2"/>
          <path d="M8 21h8M12 16v5"/>
          <line x1="5" y1="8" x2="9" y2="8"/>
          <line x1="11" y1="8" x2="19" y2="8"/>
          <line x1="5" y1="12" x2="13" y2="12"/>
          <line x1="15" y1="12" x2="19" y2="12"/>
        </svg>
      ),
      title: { TR: 'Post Prodüksiyon Lab', EN: 'Post-Production Lab' },
      desc: { TR: 'Video düzenleme ve dijital içerik geliştirme için donanımlı post prodüksiyon laboratuvarları.', EN: 'Equipped post-production labs for video editing and digital content development.' },
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      ),
      title: { TR: 'Öğretim Tasarımı Atölyesi', EN: 'Instructional Design Workshop' },
      desc: { TR: 'Eğitim materyali ve senaryo geliştirme için uzman destekli atölye çalışmaları.', EN: 'Expert-supported workshops for developing educational materials and scenarios.' },
    },
  ]

  const steps = [
    { num: '01', title: { TR: 'Kayıt Ol', EN: 'Register' }, desc: { TR: 'Sisteme üye olun. Branş, kurum ve şehir bilgilerinizi girin.', EN: 'Register on the system. Enter your branch, institution, and city information.' } },
    { num: '02', title: { TR: 'Onay Bekle', EN: 'Wait for Approval' }, desc: { TR: 'Şehir yöneticiniz üyeliğinizi inceler ve onaylar.', EN: 'Your city administrator reviews and approves your membership.' } },
    { num: '03', title: { TR: 'Randevu Al', EN: 'Book a Slot' }, desc: { TR: 'Şehrinizde bulunan stüdyolardan tarih ve saat seçerek randevunuzu oluşturun.', EN: 'Choose a date and time from studios in your city and create your reservation.' } },
    { num: '04', title: { TR: 'Stüdyonu Kullan', EN: 'Use the Studio' }, desc: { TR: 'Onaylanan randevunuzla stüdyoya gelin, dijital içerik üretin.', EN: 'Come to the studio with your approved reservation and produce digital content.' } },
  ]

  const cityLabCount = (cityId) => labs.filter(l => String(l.city_id) === String(cityId)).length

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F0D13] text-gray-800 dark:text-gray-100">

      {/* ── HEADER ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 dark:bg-[#1E1635]/95 backdrop-blur shadow-md' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5">
            <AppLogo size={36} />
            <div className="leading-tight hidden sm:block">
              <p className={`font-bold text-sm ${scrolled ? 'text-gray-900 dark:text-white' : 'text-white'}`}>ÖÖL Rezervasyon</p>
              <p className={`text-[10px] ${scrolled ? 'text-gray-500 dark:text-gray-400' : 'text-white/70'}`}>MEB ÖGEDEP</p>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(l => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href.slice(1))}
                className={`text-sm font-medium transition hover:opacity-70 ${scrolled ? 'text-gray-700 dark:text-gray-300' : 'text-white'}`}
              >
                {l.label[lang]}
              </button>
            ))}
          </nav>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button onClick={toggleLanguage} className={`text-xs font-semibold border rounded-lg px-2 py-1 transition ${scrolled ? 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300' : 'border-white/50 text-white'}`}>
              {lang === 'TR' ? 'EN' : 'TR'}
            </button>
            <button onClick={toggleDarkMode} className={`w-8 h-8 flex items-center justify-center rounded-full transition ${scrolled ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-white hover:bg-white/20'}`}>
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={onLoginClick}
              className="ml-1 px-4 py-2 rounded-xl text-sm font-semibold bg-white text-[#6750A4] hover:bg-purple-50 transition shadow-sm"
            >
              {lang === 'TR' ? 'Giriş Yap' : 'Sign In'}
            </button>
            {/* Mobile hamburger */}
            <button className={`md:hidden ml-1 ${scrolled ? 'text-gray-700 dark:text-gray-200' : 'text-white'}`} onClick={() => setMenuOpen(p => !p)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                {menuOpen ? <path d="M18 6L6 18M6 6l12 12"/> : <path d="M3 12h18M3 6h18M3 18h18"/>}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-white dark:bg-[#1E1635] border-t border-gray-100 dark:border-[#2E2550] px-4 pb-4 pt-2 space-y-1">
            {NAV_LINKS.map(l => (
              <button key={l.href} onClick={() => { scrollTo(l.href.slice(1)); setMenuOpen(false) }} className="block w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                {l.label[lang]}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-gradient-to-br from-[#4A3880] via-[#6750A4] to-[#8B6FD4] dark:from-[#1A0D3A] dark:via-[#2D1A5E] dark:to-[#3D2A7A]">
        {/* Decorative circles */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 text-white text-xs font-medium mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {lang === 'TR' ? 'IPA III — MEB ÖGEDEP Dijital Ekosistemi Projesi' : 'IPA III — MEB ÖGEDEP Digital Ecosystem Project'}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {lang === 'TR'
              ? <>Öğretmenler<br /><span className="text-[#D0BCFF]">Dijital Dönüşümün</span><br />Öncüsüdür</>
              : <>Teachers Are the<br /><span className="text-[#D0BCFF]">Pioneers of</span><br />Digital Transformation</>
            }
          </h1>

          <p className="max-w-2xl mx-auto text-white/80 text-base sm:text-lg leading-relaxed mb-10">
            {lang === 'TR'
              ? 'Türkiye genelinde 7 ilde kurulan Öğretmen Öğrenme Laboratuvarları\'nda podcast, video ve dijital içerik stüdyolarına randevu alın.'
              : 'Book appointments at Teacher Learning Labs across 7 provinces in Turkey, featuring podcast, video and digital content studios.'
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onLoginClick}
              className="px-8 py-3.5 bg-white text-[#6750A4] font-bold rounded-2xl text-sm hover:bg-purple-50 transition shadow-xl hover:shadow-2xl active:scale-95"
            >
              {lang === 'TR' ? '🎙 Hemen Randevu Al' : '🎙 Book Now'}
            </button>
            <button
              onClick={() => scrollTo('proje')}
              className="px-8 py-3.5 border-2 border-white/40 text-white font-semibold rounded-2xl text-sm hover:bg-white/10 transition active:scale-95"
            >
              {lang === 'TR' ? 'Proje Hakkında' : 'About Project'}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative max-w-6xl mx-auto w-full px-4 sm:px-6 pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statsData.map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4 text-center text-white">
                <div className="flex justify-center mb-1 text-[#D0BCFF]">{s.icon}</div>
                <p className="text-2xl sm:text-3xl font-extrabold">{s.value}</p>
                <p className="text-xs text-white/70 mt-0.5">{s.label[lang]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 animate-bounce">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </div>
      </section>

      {/* ── PROJE HAKKINDA ── */}
      <section id="proje" className="py-20 px-4 sm:px-6 bg-white dark:bg-[#0F0D13]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-widest text-[#6750A4] dark:text-[#D0BCFF] uppercase">
              {lang === 'TR' ? 'Proje Hakkında' : 'About the Project'}
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              {lang === 'TR' ? 'Neden Öğretmen Öğrenme Laboratuvarları?' : 'Why Teacher Learning Labs?'}
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500 dark:text-gray-400 leading-relaxed">
              {lang === 'TR'
                ? 'MEB ÖGEDEP kapsamında hayata geçirilen bu proje, öğretmenlerin dijital yetkinliklerini geliştirmek ve özgün eğitim içeriği üretmelerini desteklemek amacıyla kurulmuştur.'
                : 'This project, implemented within the scope of MEB ÖGEDEP, was established to develop teachers\' digital competencies and support them in producing authentic educational content.'}
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group p-6 bg-gray-50 dark:bg-[#252035] rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-[#3A3558]">
                <div className="w-12 h-12 bg-[#6750A4]/10 dark:bg-[#D0BCFF]/15 rounded-xl flex items-center justify-center text-[#6750A4] dark:text-[#D0BCFF] mb-4 group-hover:bg-[#6750A4] group-hover:text-white dark:group-hover:bg-[#7B5EA7] dark:group-hover:text-white transition-all">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2">{f.title[lang]}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-300 leading-relaxed">{f.desc[lang]}</p>
              </div>
            ))}
          </div>

          {/* Competency framework box */}
          <div className="mt-14 bg-gradient-to-r from-[#6750A4] to-[#8B6FD4] dark:from-[#1A0D3A] dark:via-[#2D1A5E] dark:to-[#3D2A7A] rounded-3xl p-8 sm:p-10 text-white">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              {[
                { val: '3', label: { TR: 'Temel Yeterlik Alanı', EN: 'Core Competency Area' } },
                { val: '17', label: { TR: 'Yeterlik', EN: 'Competency' } },
                { val: '380', label: { TR: 'Gösterge', EN: 'Indicator' } },
              ].map((x, i) => (
                <div key={i}>
                  <p className="text-5xl font-extrabold text-white">{x.val}</p>
                  <p className="text-white/70 text-sm mt-1">{x.label[lang]}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-white/60 text-xs mt-6">
              {lang === 'TR' ? 'Dijital Öğretmen Yeterlikleri Çerçevesi' : 'Digital Teacher Competencies Framework'}
            </p>
          </div>
        </div>
      </section>

      {/* ── ŞEHİRLER ── */}
      <section id="sehirler" className="py-20 px-4 sm:px-6 bg-gray-50 dark:bg-[#141218]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-widest text-[#6750A4] dark:text-[#D0BCFF] uppercase">
              {lang === 'TR' ? 'Kapsam' : 'Coverage'}
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              {lang === 'TR' ? 'Türkiye Genelinde 7 İl' : '7 Provinces Across Turkey'}
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm max-w-xl mx-auto">
              {lang === 'TR'
                ? 'Her şehirde birden fazla stüdyoyla öğretmenler dijital içerik üretim olanaklarına kolayca erişebilir.'
                : 'With multiple studios in each city, teachers can easily access digital content production facilities.'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {cities.length > 0 ? cities.map(city => (
              <div key={city.id} className="bg-white dark:bg-[#252035] rounded-2xl p-5 border border-gray-100 dark:border-[#3A3558] hover:border-[#6750A4]/40 dark:hover:border-[#9B7FD4] hover:shadow-md transition-all group">
                <div className="w-10 h-10 bg-[#6750A4]/10 dark:bg-[#D0BCFF]/15 rounded-xl flex items-center justify-center mb-3">
                  <span className="text-[#6750A4] dark:text-[#D0BCFF] font-extrabold text-lg">{city.name.charAt(0)}</span>
                </div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{city.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">
                  {cityLabCount(city.id)} {lang === 'TR' ? 'stüdyo' : 'studio'}
                </p>
                <div className="mt-3 flex gap-1 flex-wrap">
                  {labs.filter(l => String(l.city_id) === String(city.id)).slice(0, 2).map(lab => (
                    <span key={lab.id} className="text-[9px] bg-[#6750A4]/10 dark:bg-[#D0BCFF]/15 text-[#6750A4] dark:text-[#D0BCFF] px-2 py-0.5 rounded-full font-medium">
                      {lab.name.split(' - ')[1]?.split(' ')[0] || lab.name.split(' ')[0]}
                    </span>
                  ))}
                  {cityLabCount(city.id) > 2 && (
                    <span className="text-[9px] bg-gray-100 dark:bg-[#3A3558] text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full">
                      +{cityLabCount(city.id) - 2}
                    </span>
                  )}
                </div>
              </div>
            )) : (
              // Placeholder while loading
              Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-[#252035] rounded-2xl p-5 border border-gray-100 dark:border-[#3A3558] animate-pulse h-28" />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── NASIL ÇALIŞIR ── */}
      <section id="nasil-calisir" className="py-20 px-4 sm:px-6 bg-white dark:bg-[#0F0D13]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-widest text-[#6750A4] dark:text-[#D0BCFF] uppercase">
              {lang === 'TR' ? 'Nasıl Çalışır?' : 'How It Works'}
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              {lang === 'TR' ? '4 Adımda Stüdyona Ulaş' : 'Reach the Studio in 4 Steps'}
            </h2>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden sm:block absolute top-10 left-[calc(12.5%-1px)] right-[calc(12.5%-1px)] h-0.5 bg-gradient-to-r from-transparent via-[#6750A4]/30 to-transparent" />

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 sm:gap-4">
              {steps.map((s, i) => (
                <div key={i} className="text-center relative">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#6750A4] to-[#8B6FD4] rounded-2xl flex flex-col items-center justify-center mb-4 shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
                    <span className="text-white/50 text-[9px] font-bold leading-none">{lang === 'TR' ? 'ADIM' : 'STEP'}</span>
                    <span className="text-white font-extrabold text-lg leading-tight">{i + 1}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2">{s.title[lang]}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc[lang]}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 text-center">
            <button
              onClick={onLoginClick}
              className="px-10 py-4 bg-[#6750A4] hover:bg-[#5a4595] dark:bg-[#D0BCFF] dark:hover:bg-[#c4afff] text-white dark:text-[#141218] font-bold rounded-2xl text-sm transition shadow-xl hover:shadow-purple-300 dark:hover:shadow-purple-900 active:scale-95"
            >
              {lang === 'TR' ? '🚀 Hemen Başla' : '🚀 Get Started'}
            </button>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              {lang === 'TR' ? 'Ücretsiz kayıt — yalnızca MEB bünyesindeki öğretmenler için' : 'Free registration — exclusively for MEB teachers'}
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1D1B20] dark:bg-black text-white py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <AppLogo size={40} />
              <div>
                <p className="font-bold text-sm text-white">Öğretmen Öğrenme Laboratuvarları</p>
                <p className="text-xs text-gray-400">MEB ÖGEDEP Dijital Ekosistemi Projesi</p>
              </div>
            </div>
            <div className="flex gap-4">
              {NAV_LINKS.map(l => (
                <button key={l.href} onClick={() => scrollTo(l.href.slice(1))} className="text-xs text-gray-400 hover:text-white transition">
                  {l.label[lang]}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-gray-500 max-w-lg leading-relaxed">
              {lang === 'TR'
                ? 'Bu proje AB ve Türkiye Cumhuriyeti tarafından ortaklaşa finanse edilmektedir. Burada ifade edilen görüşler Avrupa Birliği\'nin, T.C. Milli Eğitim Bakanlığı\'nın veya UNICEF\'in resmi tutumunu yansıtmaz.'
                : 'This project is co-funded by the EU and the Republic of Turkey. The views expressed here do not necessarily reflect the official positions of the European Union, the Turkish Ministry of National Education, or UNICEF.'}
            </p>
            <p className="text-xs text-gray-600 whitespace-nowrap">© {new Date().getFullYear()} MEB ÖGEDEP</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
