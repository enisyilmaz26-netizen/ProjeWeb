import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { t } from '../lib/languages'

export default function AuthScreen() {
  const { loginUser, loginAdmin, registerUser, language, toggleLanguage, isDarkMode, toggleDarkMode, cities } = useApp()
  const [activeTab, setActiveTab] = useState('login')
  const [loginType, setLoginType] = useState('user') // 'user' | 'admin'

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Register form
  const [regForm, setRegForm] = useState({
    name: '', surname: '', email: '', password: '', confirmPassword: '',
    branch: '', work_location: '', phone: '', city_id: '', city_name: '', district: '',
    kvkk: false,
  })
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [showRegSuccessModal, setShowRegSuccessModal] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      let result
      if (loginType === 'admin') {
        result = await loginAdmin(loginEmail, loginPassword)
      } else {
        result = await loginUser(loginEmail, loginPassword)
      }
      if (!result.success) {
        setLoginError(t(result.error, language))
      }
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setRegError('')
    if (regForm.password !== regForm.confirmPassword) {
      setRegError(t('err_password_mismatch', language))
      return
    }
    if (!regForm.kvkk) {
      setRegError(language === 'TR' ? 'KVKK onayı zorunludur.' : 'KVKK consent is required.')
      return
    }
    setRegLoading(true)
    try {
      const result = await registerUser({
        name: regForm.name,
        surname: regForm.surname,
        email: regForm.email,
        password: regForm.password,
        branch: regForm.branch,
        work_location: regForm.work_location,
        phone: regForm.phone,
        city_id: regForm.city_id || null,
        city_name: regForm.city_name,
        district: regForm.district,
      })
      if (result.success) {
        setShowRegSuccessModal(true)
        setRegForm({
          name: '', surname: '', email: '', password: '', confirmPassword: '',
          branch: '', work_location: '', phone: '', city_id: '', city_name: '', district: '',
          kvkk: false,
        })
      } else {
        setRegError(result.error || (language === 'TR' ? 'Kayıt sırasında bir hata oluştu.' : 'An error occurred during registration.'))
      }
    } finally {
      setRegLoading(false)
    }
  }

  const handleCityChange = (cityId) => {
    const city = cities.find(c => String(c.id) === String(cityId))
    setRegForm(prev => ({ ...prev, city_id: cityId, city_name: city ? city.name : '' }))
  }

  const inputClass = "w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2C2A31] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6750A4] dark:focus:ring-[#D0BCFF] text-sm placeholder-gray-400 dark:placeholder-gray-500"
  const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"

  return (
    <div className="min-h-screen bg-[#FEF7FF] dark:bg-[#141218] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#6750A4] dark:bg-[#1D1B20] shadow">
        <div />
        <div className="text-center">
          <h1 className="text-white font-bold text-sm leading-tight">{t('app_title', language)}</h1>
          <p className="text-purple-200 dark:text-[#D0BCFF] text-xs">{t('app_subtitle', language)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="text-white border border-white/40 rounded-lg px-2 py-0.5 text-xs font-medium hover:bg-white/20 transition"
          >
            {language === 'TR' ? 'EN' : 'TR'}
          </button>
          <button
            onClick={toggleDarkMode}
            className="text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition"
            title="Toggle dark mode"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center px-4 py-8 overflow-auto">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#6750A4] dark:bg-[#D0BCFF] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white dark:text-[#141218] text-2xl font-bold">L</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {activeTab === 'login' ? t('login_title', language) : t('register_title', language)}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{t('login_subtitle', language)}</p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 dark:bg-[#2C2A31] rounded-xl p-1 mb-6">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'login' ? 'bg-white dark:bg-[#6750A4] text-[#6750A4] dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setActiveTab('login')}
            >
              {t('btn_login', language)}
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'register' ? 'bg-white dark:bg-[#6750A4] text-[#6750A4] dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setActiveTab('register')}
            >
              {t('btn_register', language)}
            </button>
          </div>

          {/* Login Form */}
          {activeTab === 'login' && (
            <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-6">
              {/* Login type selector */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setLoginType('user')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${loginType === 'user' ? 'bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] border-[#6750A4] dark:border-[#D0BCFF]' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}
                >
                  {language === 'TR' ? 'Öğretmen Girişi' : 'Teacher Login'}
                </button>
                <button
                  onClick={() => setLoginType('admin')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${loginType === 'admin' ? 'bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] border-[#6750A4] dark:border-[#D0BCFF]' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}
                >
                  {language === 'TR' ? 'Yönetici Girişi' : 'Admin Login'}
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={labelClass}>{t('input_email', language)}</label>
                  <input
                    type="email"
                    className={inputClass}
                    placeholder={language === 'TR' ? 'E-posta adresiniz' : 'Your email address'}
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('input_password', language)}</label>
                  <input
                    type="password"
                    className={inputClass}
                    placeholder={language === 'TR' ? 'Şifreniz' : 'Your password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                {loginError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm">
                    {loginError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
                >
                  {loginLoading ? (language === 'TR' ? 'Giriş yapılıyor...' : 'Signing in...') : t('btn_login', language)}
                </button>
              </form>
            </div>
          )}

          {/* Register Form */}
          {activeTab === 'register' && (
            <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-6">
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t('input_name', language)} *</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={regForm.name}
                      onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('input_surname', language)} *</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={regForm.surname}
                      onChange={e => setRegForm(p => ({ ...p, surname: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t('input_email', language)} *</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={regForm.email}
                    onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>{t('input_branch', language)} *</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={regForm.branch}
                    onChange={e => setRegForm(p => ({ ...p, branch: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>{t('input_work_location', language)} *</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={regForm.work_location}
                    onChange={e => setRegForm(p => ({ ...p, work_location: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>{t('input_phone', language)} *</label>
                  <input
                    type="tel"
                    className={inputClass}
                    value={regForm.phone}
                    onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>{t('input_city', language)} *</label>
                  <select
                    className={inputClass}
                    value={regForm.city_id}
                    onChange={e => handleCityChange(e.target.value)}
                    required
                  >
                    <option value="">{t('select_city', language)}</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>{t('input_district', language)} *</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={regForm.district}
                    onChange={e => setRegForm(p => ({ ...p, district: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>{t('input_password', language)} *</label>
                  <input
                    type="password"
                    className={inputClass}
                    value={regForm.password}
                    onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>{t('input_confirm_password', language)} *</label>
                  <input
                    type="password"
                    className={inputClass}
                    value={regForm.confirmPassword}
                    onChange={e => setRegForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    required
                  />
                </div>

                {/* KVKK */}
                <div className="bg-gray-50 dark:bg-[#2C2A31] rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('kvkk_text', language)}</p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regForm.kvkk}
                      onChange={e => setRegForm(p => ({ ...p, kvkk: e.target.checked }))}
                      className="mt-0.5 accent-[#6750A4]"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{t('kvkk_checkbox_label', language)}</span>
                  </label>
                </div>

                {regError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm">
                    {regError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-3 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
                >
                  {regLoading ? (language === 'TR' ? 'Kaydediliyor...' : 'Registering...') : t('btn_register', language)}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Registration Success Modal */}
      {showRegSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 dark:text-green-400 text-2xl">✓</span>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">
              {language === 'TR' ? 'Başvurunuz Alındı' : 'Application Received'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              {language === 'TR'
                ? 'Üyelik talebiniz alınmıştır. Bilgileriniz kontrol edildikten sonra üyeliğiniz onaylanacaktır.'
                : 'Your membership request has been received. Your membership will be approved after your information is verified.'}
            </p>
            <button
              onClick={() => { setShowRegSuccessModal(false); setActiveTab('login') }}
              className="w-full py-3 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] rounded-xl font-semibold text-sm hover:opacity-90 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
