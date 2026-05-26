import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { t } from '../lib/languages'

export default function AuthScreen() {
  const { loginUser, loginAdmin, registerUser, findUserForReset, resetPassword, language, toggleLanguage, isDarkMode, toggleDarkMode, cities } = useApp()
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
  const [showKvkkModal, setShowKvkkModal] = useState(false)

  // Forgot password form
  const [forgotStep, setForgotStep] = useState(1) // 1=lookup, 2=new password
  const [forgotForm, setForgotForm] = useState({ name: '', surname: '', email: '' })
  const [forgotFoundUser, setForgotFoundUser] = useState(null)
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)

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
        if (result.error === 'err_rate_limited') {
          setLoginError(t('err_rate_limited', language).replace('{secs}', result.secs))
        } else {
          setLoginError(t(result.error, language))
        }
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
    const phoneDigits = regForm.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setRegError(language === 'TR' ? 'Geçerli bir telefon numarası giriniz (10-11 rakam).' : 'Please enter a valid phone number (10-11 digits).')
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
        const errKey = result.error
        setRegError(errKey?.startsWith('err_') ? t(errKey, language) : (errKey || (language === 'TR' ? 'Kayıt sırasında bir hata oluştu.' : 'An error occurred during registration.')))
      }
    } finally {
      setRegLoading(false)
    }
  }

  const handleCityChange = (cityId) => {
    const city = cities.find(c => String(c.id) === String(cityId))
    setRegForm(prev => ({ ...prev, city_id: cityId, city_name: city ? city.name : '' }))
  }

  const handleForgotLookup = async (e) => {
    e.preventDefault()
    setForgotError('')
    setForgotLoading(true)
    try {
      const result = await findUserForReset(forgotForm.name, forgotForm.surname, forgotForm.email)
      if (result.success) {
        setForgotFoundUser(result.data)
        setForgotStep(2)
      } else {
        setForgotError(t(result.error, language))
      }
    } finally {
      setForgotLoading(false)
    }
  }

  const handleForgotReset = async (e) => {
    e.preventDefault()
    setForgotError('')
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError(t('err_password_mismatch', language))
      return
    }
    setForgotLoading(true)
    try {
      const result = await resetPassword(forgotFoundUser.id, forgotFoundUser.email, forgotNewPassword)
      if (result.success) {
        setForgotSuccess(true)
      } else {
        setForgotError(result.error || (language === 'TR' ? 'Bir hata oluştu.' : 'An error occurred.'))
      }
    } finally {
      setForgotLoading(false)
    }
  }

  const goBackToLogin = () => {
    setActiveTab('login')
    setForgotStep(1)
    setForgotForm({ name: '', surname: '', email: '' })
    setForgotFoundUser(null)
    setForgotNewPassword('')
    setForgotConfirmPassword('')
    setForgotError('')
    setForgotSuccess(false)
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
          {activeTab !== 'forgot' && (
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
          )}

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
              {loginType === 'user' && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => setActiveTab('forgot')}
                    className="text-xs text-[#6750A4] dark:text-[#D0BCFF] hover:underline"
                  >
                    {t('forgot_password', language)}
                  </button>
                </div>
              )}
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
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regForm.kvkk}
                      onChange={e => setRegForm(p => ({ ...p, kvkk: e.target.checked }))}
                      className="mt-0.5 accent-[#6750A4]"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      <button
                        type="button"
                        onClick={() => setShowKvkkModal(true)}
                        className="text-[#6750A4] dark:text-[#D0BCFF] underline font-semibold hover:opacity-80"
                      >
                        {language === 'TR' ? 'KVKK Aydınlatma Metni' : 'KVKK Consent Text'}
                      </button>
                      {language === 'TR' ? "'ni okudum ve kabul ediyorum. *" : " — I have read and agree. *"}
                    </span>
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
          {/* Forgot Password Form */}
          {activeTab === 'forgot' && (
            <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-6">
              <div className="mb-4">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{t('forgot_password', language)}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {forgotStep === 1 ? t('forgot_subtitle', language) : t('forgot_new_password_subtitle', language)}
                </p>
              </div>

              {forgotSuccess ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center py-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                      <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 text-center">{t('forgot_success', language)}</p>
                  </div>
                  <button
                    onClick={goBackToLogin}
                    className="w-full py-3 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] rounded-xl font-semibold text-sm hover:opacity-90 transition"
                  >
                    {t('back_to_login', language)}
                  </button>
                </div>
              ) : forgotStep === 1 ? (
                <form onSubmit={handleForgotLookup} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{t('input_name', language)} *</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={forgotForm.name}
                        onChange={e => setForgotForm(p => ({ ...p, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('input_surname', language)} *</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={forgotForm.surname}
                        onChange={e => setForgotForm(p => ({ ...p, surname: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t('input_email', language)} *</label>
                    <input
                      type="email"
                      className={inputClass}
                      value={forgotForm.email}
                      onChange={e => setForgotForm(p => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>
                  {forgotError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm">
                      {forgotError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
                  >
                    {forgotLoading ? (language === 'TR' ? 'Sorgulanıyor...' : 'Looking up...') : t('forgot_verify_btn', language)}
                  </button>
                  <button type="button" onClick={goBackToLogin} className="w-full text-xs text-[#6750A4] dark:text-[#D0BCFF] hover:underline pt-1">
                    ← {t('back_to_login', language)}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotReset} className="space-y-3">
                  <div className="bg-[#6750A4]/5 dark:bg-[#D0BCFF]/5 rounded-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                    {forgotFoundUser?.name} {forgotFoundUser?.surname} — {forgotFoundUser?.email}
                  </div>
                  <div>
                    <label className={labelClass}>{t('input_password', language)} *</label>
                    <input
                      type="password"
                      className={inputClass}
                      value={forgotNewPassword}
                      onChange={e => setForgotNewPassword(e.target.value)}
                      required
                      minLength={4}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('input_confirm_password', language)} *</label>
                    <input
                      type="password"
                      className={inputClass}
                      value={forgotConfirmPassword}
                      onChange={e => setForgotConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  {forgotError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm">
                      {forgotError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
                  >
                    {forgotLoading ? (language === 'TR' ? 'Kaydediliyor...' : 'Saving...') : t('forgot_save_btn', language)}
                  </button>
                  <button type="button" onClick={() => { setForgotStep(1); setForgotError('') }} className="w-full text-xs text-[#6750A4] dark:text-[#D0BCFF] hover:underline pt-1">
                    ← {language === 'TR' ? 'Geri' : 'Back'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Registration Success Modal */}
      {/* KVKK Modal */}
      {showKvkkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow-xl w-full max-w-lg flex flex-col" style={{maxHeight: '80vh'}}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                {language === 'TR' ? 'KVKK Aydınlatma Metni' : 'KVKK Information Text'}
              </h3>
              <button
                onClick={() => setShowKvkkModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold leading-none"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4 flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('kvkk_text', language)}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => { setRegForm(p => ({ ...p, kvkk: true })); setShowKvkkModal(false) }}
                className="flex-1 py-2.5 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] rounded-xl font-semibold text-sm hover:opacity-90 transition"
              >
                {language === 'TR' ? 'Okudum, Onaylıyorum' : 'I Read and Agree'}
              </button>
              <button
                onClick={() => setShowKvkkModal(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                {language === 'TR' ? 'Kapat' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

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
