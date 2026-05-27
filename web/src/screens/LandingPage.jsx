import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import AppLogo from '../components/AppLogo'
import { t, formatDate } from '../lib/languages'
import { Sun, Moon, MapPin, Calendar, Clock, Mic, Video, Monitor, BookOpen, GraduationCap, FlaskConical, Users } from 'lucide-react'
import { getLabIcon } from '../lib/icons'

const NAV_LINKS = [
  { href: '#proje', label: { TR: 'Proje', EN: 'Project' } },
  { href: '#sehirler', label: { TR: 'İller', EN: 'Provinces' } },
  { href: '#atolyeler', label: { TR: 'Atölyeler', EN: 'Workshops' } },
  { href: '#nasil-calisir', label: { TR: 'Nasıl Çalışır?', EN: 'How It Works' } },
]

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export default function LandingPage({ onLoginClick }) {
  const { cities, labs, workshops, timeSlots, language, isDarkMode, toggleLanguage, toggleDarkMode } = useApp()
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
      color: '#1565C0',
      icon: <MapPin className="w-6 h-6" />,
    },
    {
      value: 8,
      label: { TR: 'Laboratuvar', EN: 'Laboratory' },
      color: '#1565C0',
      icon: <FlaskConical className="w-6 h-6" />,
    },
    {
      value: workshops.length || 0,
      label: { TR: 'Atölye', EN: 'Workshop' },
      color: '#1565C0',
      icon: <GraduationCap className="w-6 h-6" />,
    },
    {
      value: '200K+',
      label: { TR: 'Hedef Öğretmen', EN: 'Target Teachers' },
      color: '#1565C0',
      icon: <Users className="w-6 h-6" />,
    },
  ]

  const features = [
    {
      icon: <Mic className="w-7 h-7" />,
      title: { TR: 'Podcast & Ses Stüdyosu', EN: 'Podcast & Audio Studio' },
      desc: { TR: 'Profesyonel ses kayıt ekipmanlarıyla podcast ve sesli içerik üretimi.', EN: 'Podcast and audio content production with professional recording equipment.' },
    },
    {
      icon: <Video className="w-7 h-7" />,
      title: { TR: 'Video Kayıt & Yeşil Ekran', EN: 'Video Recording & Green Screen' },
      desc: { TR: 'Yüksek kaliteli video içerik üretimi için profesyonel yeşil ekran stüdyoları.', EN: 'Professional green screen studios for high-quality video content production.' },
    },
    {
      icon: <Monitor className="w-7 h-7" />,
      title: { TR: 'Post Prodüksiyon Lab', EN: 'Post-Production Lab' },
      desc: { TR: 'Video düzenleme ve dijital içerik geliştirme için donanımlı post prodüksiyon laboratuvarları.', EN: 'Equipped post-production labs for video editing and digital content development.' },
    },
    {
      icon: <BookOpen className="w-7 h-7" />,
      title: { TR: 'Öğretim Tasarımı Atölyesi', EN: 'Instructional Design Workshop' },
      desc: { TR: 'Eğitim materyali ve senaryo geliştirme için uzman destekli atölye çalışmaları.', EN: 'Expert-supported workshops for developing educational materials and scenarios.' },
    },
  ]


  const steps = [
    { title: { TR: 'Kayıt Ol', EN: 'Register' }, desc: { TR: 'Sisteme üye olun. Branş, kurum ve il bilgilerinizi girin.', EN: 'Register on the system. Enter your branch, institution, and province information.' } },
    { title: { TR: 'Onay Bekle', EN: 'Wait for Approval' }, desc: { TR: 'İl yöneticiniz üyeliğinizi inceler ve onaylar.', EN: 'Your province administrator reviews and approves your membership.' } },
    { title: { TR: 'Randevu Al', EN: 'Book a Slot' }, desc: { TR: 'İlinizde bulunan stüdyolardan tarih ve saat seçerek randevunuzu oluşturun.', EN: 'Choose a date and time from studios in your province and create your reservation.' } },
    { title: { TR: 'Stüdyoyu Kullan', EN: 'Use the Studio' }, desc: { TR: 'Onaylanan randevunuzla stüdyoya gelin, dijital içerik üretin.', EN: 'Come to the studio with your approved reservation and produce digital content.' } },
  ]

  const cityLabCount = (cityId) => labs.filter(l => String(l.city_id) === String(cityId)).length
  const cityStudioCount = (cityName) => cityName === 'Ankara' ? 2 : 1
  const cityWorkshopCount = (cityId) => workshops.filter(w => String(w.city_id) === String(cityId)).length

  return (
    <div className="min-h-screen bg-white dark:bg-[#040A1C] text-gray-800 dark:text-gray-100">

      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#061A3A] shadow-sm border-b border-gray-100 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5">
            <AppLogo size={36} />
            <div className="leading-tight hidden sm:block">
              <p className="font-bold text-xs text-gray-900 dark:text-white">Öğretmen Öğrenme Laboratuvarı</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Randevu Sistemi | MEB ÖGEDEP</p>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(l => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href.slice(1))}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:text-[#1565C0] dark:hover:text-[#7DD4FC]"
              >
                {l.label[lang]}
              </button>
            ))}
          </nav>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button onClick={toggleLanguage} className="text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1 transition hover:border-[#1565C0] hover:text-[#1565C0]">
              {lang === 'TR' ? 'EN' : 'TR'}
            </button>
            <button onClick={toggleDarkMode} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={onLoginClick}
              className="ml-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[#1565C0] hover:bg-[#0D47A1] text-white transition shadow-sm"
            >
              {lang === 'TR' ? 'Giriş Yap' : 'Sign In'}
            </button>
            {/* Mobile hamburger */}
            <button className="md:hidden ml-1 text-gray-700 dark:text-gray-200" onClick={() => setMenuOpen(p => !p)} aria-label={menuOpen ? t('menu_close', lang) : t('menu_open', lang)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6" aria-hidden="true">
                {menuOpen ? <path d="M18 6L6 18M6 6l12 12"/> : <path d="M3 12h18M3 6h18M3 18h18"/>}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-white dark:bg-[#061A3A] border-t border-gray-100 dark:border-[#102038] px-4 pb-4 pt-2 space-y-1">
            {NAV_LINKS.map(l => (
              <button key={l.href} onClick={() => { scrollTo(l.href.slice(1)); setMenuOpen(false) }} className="block w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                {l.label[lang]}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-gradient-to-br from-[#EFF8FF] via-[#BFDBFE] to-[#1565C0] dark:from-[#040A1C] dark:via-[#061A3A] dark:to-[#0A2565]">
        {/* Decorative circles */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-[#00AEEF]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#1565C0]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-[1.35] sm:leading-[1.3] mb-6">
            {lang === 'TR'
              ? <>Öğretmenler<br /><span className="text-[#1565C0] dark:text-[#7DD4FC]">Dijital Dönüşümün</span><br />Öncüsüdür</>
              : <>Teachers Are the<br /><span className="text-[#1565C0] dark:text-[#7DD4FC]">Pioneers of</span><br />Digital Transformation</>
            }
          </h1>

          <p className="max-w-2xl mx-auto text-gray-500 dark:text-gray-400 text-base sm:text-lg leading-relaxed mb-10">
            {lang === 'TR'
              ? 'Türkiye genelinde 7 ilde kurulan Öğretmen Öğrenme Laboratuvarları\'nda podcast, video ve dijital içerik alanlarına randevu alın.'
              : 'Book appointments at Teacher Learning Labs across 7 provinces in Turkey, featuring podcast, video and digital content areas.'
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onLoginClick}
              className="px-8 py-3.5 bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold rounded-2xl text-sm transition shadow-xl hover:shadow-blue-200 active:scale-95"
            >
              {lang === 'TR' ? 'Hemen Randevu Al' : 'Book Now'}
            </button>
            <button
              onClick={() => scrollTo('proje')}
              className="px-8 py-3.5 border-2 border-[#1565C0]/40 text-[#1565C0] dark:text-[#7DD4FC] dark:border-[#7DD4FC]/40 font-semibold rounded-2xl text-sm hover:bg-[#1565C0]/10 transition active:scale-95"
            >
              {lang === 'TR' ? 'Proje Hakkında' : 'About Project'}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative max-w-3xl mx-auto w-full px-4 sm:px-6 pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statsData.map((s, i) => (
              <div key={i} className="rounded-2xl p-5 text-center bg-white/80 dark:bg-white/10 backdrop-blur border" style={{ borderColor: s.color + '50' }}>
                <div className="flex justify-center mb-2" style={{ color: s.color }} aria-hidden="true">{s.icon}</div>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label[lang]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-400 dark:text-white/50 animate-bounce" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </div>
      </section>

      {/* ── PROJE HAKKINDA ── */}
      <section id="proje" className="relative py-20 px-4 sm:px-6 overflow-hidden bg-gradient-to-br from-white via-[#F0F7FF] to-[#E8F4FD] dark:from-[#040A1C] dark:via-[#06152E] dark:to-[#081A3A]">
        <div className="absolute top-16 left-8 w-80 h-80 bg-[#1565C0]/8 rounded-full blur-3xl pointer-events-none animate-blob" />
        <div className="absolute bottom-12 right-12 w-64 h-64 bg-[#00AEEF]/10 rounded-full blur-3xl pointer-events-none animate-blob-slow" style={{ animationDelay: '3s' }} />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#1565C0] dark:text-[#7DD4FC] uppercase">
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

          {/* ÖÖL Açıklama Paragrafı */}
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-7 max-w-3xl mx-auto text-center">
            {lang === 'TR'
              ? 'MEB ÖGEDEP bünyesinde kurulan laboratuvarlar, öğretmenlerin dijital eğitim ekosistemiyle ilgili kapasitelerini geliştirmek amacıyla tasarlanmıştır. 7 ilde 8 laboratuvarda öğretmenler; yeni dijital öğretim fikirlerini keşfedebilir, bu fikirleri sınıf ortamına hızla uygulayabilir ve mesleki iş birliği kültürünü güçlendirebilir.'
              : 'Established within MEB ÖGEDEP, the labs are designed to develop teachers\' capacity in the digital education ecosystem. Across 8 labs in 7 provinces, teachers can discover new digital teaching ideas, quickly apply them to classroom settings, and strengthen professional collaboration culture.'}
          </p>

          {/* Genel Bilgi Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                  </svg>
                ),
                title: { TR: 'Temel Amaç', EN: 'Core Purpose' },
                desc: { TR: 'Dijital eğitim fikirlerini keşfetme, sınıf ortamına hızla uygulama ve mesleki iş birliği kültürünü güçlendirme.', EN: 'Discover digital education ideas, quickly apply them to the classroom, and strengthen professional collaboration culture.' },
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                  </svg>
                ),
                title: { TR: 'Teknik Donanım', EN: 'Technical Equipment' },
                desc: { TR: 'Ses ve video kayıt cihazları, çekim sonrası içerik düzenleme yazılımları ve ileri teknoloji altyapısı.', EN: 'Audio and video recording equipment, post-production editing software, and advanced technology infrastructure.' },
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
                  </svg>
                ),
                title: { TR: 'Kapsam', EN: 'Coverage' },
                desc: { TR: "Ankara, İstanbul, İzmir, Gaziantep, Mersin, Erzurum ve Rize'de toplam 8 laboratuvar.", EN: '8 laboratories in total across Ankara, Istanbul, Izmir, Gaziantep, Mersin, Erzurum, and Rize.' },
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ),
                title: { TR: 'Kazanımlar', EN: 'Outcomes' },
                desc: { TR: 'Dijital içerik üretimi, materyal geliştirme, teknoloji destekli öğretim uygulamaları ve dijital beceri güçlendirme.', EN: 'Digital content production, material development, technology-supported teaching, and digital skills strengthening.' },
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 p-4 bg-gray-50 dark:bg-[#0D1E3D] rounded-2xl border border-gray-100 dark:border-[#162848]">
                <div className="w-9 h-9 flex-shrink-0 bg-[#1565C0]/10 dark:bg-[#7DD4FC]/15 rounded-xl flex items-center justify-center text-[#1565C0] dark:text-[#7DD4FC]" aria-hidden="true">
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{item.title[lang]}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc[lang]}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Daha Fazla Detay */}
          <div className="flex justify-center mb-14">
            <a
              href="https://ogedep.eba.gov.tr/ogretmen-ogrenme-laboratuvarlari/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3 bg-[#1565C0] hover:bg-[#0D47A1] dark:bg-[#7DD4FC] dark:hover:bg-[#4DC8FA] text-white dark:text-[#060E26] font-semibold rounded-2xl text-sm transition shadow-lg hover:shadow-blue-200/40 active:scale-95"
            >
              {lang === 'TR' ? 'Daha Fazla Detay' : 'Learn More'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>

          {/* Stüdyo Özellik Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group p-6 bg-gray-50 dark:bg-[#0D1E3D] rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-[#162848]">
                <div className="w-12 h-12 bg-[#1565C0]/10 dark:bg-[#7DD4FC]/15 rounded-xl flex items-center justify-center text-[#1565C0] dark:text-[#7DD4FC] mb-4 group-hover:bg-[#1565C0] group-hover:text-white dark:group-hover:bg-[#1976D2] dark:group-hover:text-white transition-all" aria-hidden="true">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2">{f.title[lang]}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-300 leading-relaxed">{f.desc[lang]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ŞEHİRLER ── */}

      <section id="sehirler" className="relative py-20 px-4 sm:px-6 overflow-hidden bg-gradient-to-br from-white via-[#EFF8FF] to-[#1565C0] dark:from-[#040A1C] dark:via-[#061A3A] dark:to-[#0A2565]">
        <div className="absolute top-10 right-10 w-72 h-72 bg-[#00AEEF]/10 rounded-full blur-3xl pointer-events-none animate-blob" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#1565C0]/8 rounded-full blur-3xl pointer-events-none animate-blob-slow" style={{ animationDelay: '4s' }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-widest text-[#1565C0] dark:text-[#7DD4FC] uppercase">
              {lang === 'TR' ? 'Kapsam' : 'Coverage'}
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              {lang === 'TR' ? 'Türkiye Genelinde 7 İl' : '7 Provinces Across Turkey'}
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm max-w-xl mx-auto">
              {lang === 'TR'
                ? 'Her ilde birden fazla alanla öğretmenler dijital içerik üretim olanaklarına kolayca erişebilir.'
                : 'With multiple areas in each province, teachers can easily access digital content production facilities.'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {cities.length > 0 ? cities.map(city => (
              <div key={city.id} className="bg-white/80 dark:bg-[#0D1E3D]/90 backdrop-blur-sm rounded-2xl p-5 border border-white/60 dark:border-[#162848] hover:border-[#1565C0]/40 dark:hover:border-[#29ABE2] hover:shadow-md transition-all group">
                <div className="w-10 h-10 bg-[#1565C0]/10 dark:bg-[#7DD4FC]/15 rounded-xl flex items-center justify-center mb-3">
                  <span className="text-[#1565C0] dark:text-[#7DD4FC] font-extrabold text-lg">{city.name.charAt(0)}</span>
                </div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{city.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">
                  {cityStudioCount(city.name)} {lang === 'TR' ? 'stüdyo' : 'studio'}
                  {cityLabCount(city.id) > 0 && ` · ${cityLabCount(city.id)} ${lang === 'TR' ? 'alan' : 'area'}`}
                  {cityWorkshopCount(city.id) > 0 && ` · ${cityWorkshopCount(city.id)} ${lang === 'TR' ? 'atölye' : 'workshop'}`}
                </p>
                <div className="mt-3 flex gap-1 flex-wrap">
                  {labs.filter(l => String(l.city_id) === String(city.id)).slice(0, 2).map(lab => (
                    <span key={lab.id} className="text-[9px] bg-[#1565C0]/10 dark:bg-[#7DD4FC]/15 text-[#1565C0] dark:text-[#7DD4FC] px-2 py-0.5 rounded-full font-medium">
                      {lab.name.split(' - ')[1]?.split(' ')[0] || lab.name.split(' ')[0]}
                    </span>
                  ))}
                  {cityLabCount(city.id) > 2 && (
                    <span className="text-[9px] bg-gray-100 dark:bg-[#162848] text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full">
                      +{cityLabCount(city.id) - 2}
                    </span>
                  )}
                </div>
              </div>
            )) : (
              // Placeholder while loading
              Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="bg-white/80 dark:bg-[#0D1E3D]/90 rounded-2xl p-5 border border-white/60 dark:border-[#162848] animate-pulse h-28" />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── ATÖLYELER ── */}
      <section id="atolyeler" className="relative py-20 px-4 sm:px-6 overflow-hidden bg-gradient-to-br from-[#F8FBFF] via-white to-[#EEF6FF] dark:from-[#040A1C] dark:via-[#061528] dark:to-[#040A1C]">
        <div className="absolute top-20 right-0 w-72 h-72 bg-[#1565C0]/6 rounded-full blur-3xl pointer-events-none animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-8 left-4 w-56 h-56 bg-[#00AEEF]/8 rounded-full blur-3xl pointer-events-none animate-blob-slow" style={{ animationDelay: '5s' }} />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#1565C0] dark:text-[#7DD4FC] uppercase">
              {lang === 'TR' ? 'Eğitim Programı' : 'Training Program'}
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              {lang === 'TR' ? 'Öğretim Tasarımı Atölyeleri' : 'Instructional Design Workshops'}
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              {lang === 'TR'
                ? 'Her ilde düzenlenen atölye çalışmalarıyla öğretmenler eğitim materyali geliştirme ve senaryo yazma konularında uzman desteği alır.'
                : 'Through workshops held in each province, teachers receive expert support on developing educational materials and writing scenarios.'}
            </p>
          </div>

          {workshops.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
              {lang === 'TR' ? 'Yakında atölye duyuruları yayınlanacak.' : 'Workshop announcements coming soon.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...workshops].sort((a, b) => {
                const ca = cities.find(c => String(c.id) === String(a.city_id))?.name || ''
                const cb = cities.find(c => String(c.id) === String(b.city_id))?.name || ''
                return ca.localeCompare(cb, 'tr')
              }).map(ws => {
                const city = cities.find(c => String(c.id) === String(ws.city_id))
                return (
                  <div key={ws.id} className="flex gap-4 p-5 bg-gray-50 dark:bg-[#0D1E3D] rounded-2xl border border-gray-100 dark:border-[#162848] hover:shadow-md hover:-translate-y-0.5 transition-all">
                    <div className="w-10 h-10 flex-shrink-0 bg-[#1565C0]/10 dark:bg-[#7DD4FC]/15 rounded-xl flex items-center justify-center text-[#1565C0] dark:text-[#7DD4FC]">
                      {getLabIcon(ws.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{ws.name}</p>
                      {ws.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{ws.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {city && (
                          <span className="text-[11px] font-medium text-[#1565C0] dark:text-[#7DD4FC] bg-[#1565C0]/8 dark:bg-[#7DD4FC]/10 px-2 py-0.5 rounded-lg inline-flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 inline" />{city.name}{ws.location ? ` · ${ws.location}` : ''}
                          </span>
                        )}
                        {ws.date && (
                          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg inline-flex items-center gap-0.5">
                            <Calendar className="w-3 h-3 inline" />{formatDate(ws.date)}
                          </span>
                        )}
                        {ws.time && (
                          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg inline-flex items-center gap-0.5">
                            <Clock className="w-3 h-3 inline" />{ws.time}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── NASIL ÇALIŞIR ── */}
      <section id="nasil-calisir" className="relative py-20 px-4 sm:px-6 overflow-hidden bg-gradient-to-br from-white via-[#F5F9FF] to-[#EAF3FF] dark:from-[#040A1C] dark:via-[#061A3A] dark:to-[#0A2565]">
        <div className="absolute top-8 left-1/4 w-64 h-64 bg-[#1565C0]/6 rounded-full blur-3xl pointer-events-none animate-blob" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-12 right-8 w-80 h-80 bg-[#00AEEF]/7 rounded-full blur-3xl pointer-events-none animate-blob-slow" style={{ animationDelay: '6s' }} />
        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-widest text-[#1565C0] dark:text-[#7DD4FC] uppercase">
              {lang === 'TR' ? 'Nasıl Çalışır?' : 'How It Works'}
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              {lang === 'TR' ? '4 Adımda Stüdyona Ulaş' : 'Reach the Studio in 4 Steps'}
            </h2>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden sm:block absolute top-10 left-[calc(12.5%-1px)] right-[calc(12.5%-1px)] h-0.5 bg-gradient-to-r from-transparent via-[#1565C0]/30 to-transparent" />

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 sm:gap-4">
              {steps.map((s, i) => (
                <div key={i} className="text-center relative">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#1565C0] to-[#00AEEF] rounded-2xl flex flex-col items-center justify-center mb-4 shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
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
              className="px-10 py-4 bg-[#1565C0] hover:bg-[#0D47A1] dark:bg-[#7DD4FC] dark:hover:bg-[#4DC8FA] text-white dark:text-[#060E26] font-bold rounded-2xl text-sm transition shadow-xl hover:shadow-blue-200 dark:hover:shadow-blue-900 active:scale-95"
            >
              {lang === 'TR' ? 'Hemen Başla' : 'Get Started'}
            </button>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              {lang === 'TR' ? 'Ücretsiz kayıt — yalnızca MEB bünyesindeki öğretmenler için' : 'Free registration — exclusively for MEB teachers'}
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0A2461] dark:bg-[#020A22] text-white">
        {/* Üst bölüm — beyaz arkaplan */}
        <div className="bg-white dark:bg-[#061A3A] px-4 sm:px-6 py-8">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <AppLogo size={48} />
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">Öğretmen Öğrenme Laboratuvarları</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Öğretmen Eğitimi Dijital Ekosistemi Projesi</p>
              </div>
            </div>
            <div className="flex gap-4">
              {NAV_LINKS.map(l => (
                <button key={l.href} onClick={() => scrollTo(l.href.slice(1))} className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#1565C0] dark:hover:text-[#7DD4FC] transition">
                  {l.label[lang]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alt bölüm — koyu arkaplan */}
        <div className="px-4 sm:px-6 py-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-white/60 max-w-lg leading-relaxed">
              {lang === 'TR'
                ? 'Bu proje AB ve Türkiye Cumhuriyeti tarafından ortaklaşa finanse edilmektedir. Burada ifade edilen görüşler Avrupa Birliği\'nin, T.C. Milli Eğitim Bakanlığı\'nın veya UNICEF\'in resmi tutumunu yansıtmaz.'
                : 'This project is co-funded by the EU and the Republic of Turkey. The views expressed here do not necessarily reflect the official positions of the European Union, the Turkish Ministry of National Education, or UNICEF.'}
            </p>
            <p className="text-xs text-white/40 whitespace-nowrap">© {new Date().getFullYear()} MEB ÖGEDEP</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
