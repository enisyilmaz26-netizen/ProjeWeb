import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { t } from '../lib/languages'
import { INPUT_BASE, LABEL_CLASS } from '../lib/ui'
import AppLogo from '../components/AppLogo'
import PasswordInput from '../components/PasswordInput'
import { passwordRequirements, isPasswordStrong } from '../lib/passwordUtils'
import { Sun, Moon, Check, Circle, X } from 'lucide-react'

export default function AuthScreen({ onBack }) {
  const { loginUser, loginAdmin, registerUser, findUserForReset, resetPassword, language, toggleLanguage, isDarkMode, toggleDarkMode, cities } = useApp()
  const [activeTab, setActiveTab] = useState('login')

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
  const [forgotForm, setForgotForm] = useState({ email: '' })
  const [forgotFoundUser, setForgotFoundUser] = useState(null)
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)

  useEffect(() => {
    const anyModal = showRegSuccessModal || showKvkkModal
    if (!anyModal) return
    const handler = (e) => { if (e.key === 'Escape') { setShowRegSuccessModal(false); setShowKvkkModal(false) } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showRegSuccessModal, showKvkkModal])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      let result = await loginUser(loginEmail, loginPassword)
      if (!result.success && result.error === 'err_email_not_found') {
        result = await loginAdmin(loginEmail, loginPassword)
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
    if (!isPasswordStrong(regForm.password)) {
      setRegError(t('err_password_weak', language))
      return
    }
    if (regForm.password !== regForm.confirmPassword) {
      setRegError(t('err_password_mismatch', language))
      return
    }
    if (!regForm.kvkk) {
      setRegError(t('err_kvkk_required', language))
      return
    }
    const phoneDigits = regForm.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setRegError(t('err_phone_invalid', language))
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
        setRegError(errKey?.startsWith('err_') ? t(errKey, language) : (errKey || t('err_registration_failed', language)))
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
      const result = await findUserForReset(forgotForm.email)
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
    if (!isPasswordStrong(forgotNewPassword)) {
      setForgotError(t('err_password_weak', language))
      return
    }
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
        setForgotError(result.error || t('err_generic', language))
      }
    } finally {
      setForgotLoading(false)
    }
  }

  const goBackToLogin = () => {
    setActiveTab('login')
    setForgotStep(1)
    setForgotForm({ email: '' })
    setForgotFoundUser(null)
    setForgotNewPassword('')
    setForgotConfirmPassword('')
    setForgotError('')
    setForgotSuccess(false)
  }

  const inputClass = `w-full ${INPUT_BASE} placeholder-gray-400 dark:placeholder-gray-500`
  const labelClass = LABEL_CLASS

  return (
    <div className="min-h-screen bg-[#EFF8FF] dark:bg-[#060E26] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1565C0] dark:bg-[#061A3A] shadow">
        {onBack ? (
          <button onClick={onBack} className="text-white/80 hover:text-white flex items-center gap-1 text-xs font-medium transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            {t('btn_back', language)}
          </button>
        ) : <div />}
        <div className="text-center">
          <h1 className="text-white font-bold text-sm leading-tight">{t('app_title', language)}</h1>
          <p className="text-blue-200 dark:text-[#7DD4FC] text-xs">{t('app_subtitle', language)}</p>
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
            aria-label={t('toggle_dark', language)}
            className="text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center px-4 py-8 overflow-auto">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <AppLogo size={64} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {activeTab === 'login' ? t('login_title', language) : t('register_title', language)}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{t('login_subtitle', language)}</p>
          </div>

          {/* Tab switcher */}
          {activeTab !== 'forgot' && (
            <div className="flex bg-gray-100 dark:bg-[#0E1A30] rounded-xl p-1 mb-6">
              <button
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'login' ? 'bg-white dark:bg-[#1565C0] text-[#1565C0] dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setActiveTab('login')}
              >
                {t('btn_login', language)}
              </button>
              <button
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'register' ? 'bg-white dark:bg-[#1565C0] text-[#1565C0] dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setActiveTab('register')}
              >
                {t('btn_register', language)}
              </button>
            </div>
          )}

          {/* Login Form */}
          {activeTab === 'login' && (
            <div className="bg-white dark:bg-[#070E1E] rounded-2xl shadow p-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={labelClass}>{t('input_email', language)}</label>
                  <input
                    type="email"
                    className={inputClass}
                    placeholder={t('placeholder_email', language)}
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('input_password', language)}</label>
                  <PasswordInput
                    className={inputClass}
                    placeholder={t('placeholder_password', language)}
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
                  className="w-full py-3 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
                >
                  {loginLoading ? t('loading_signin', language) : t('btn_login', language)}
                </button>
              </form>
              <div className="mt-3 text-center">
                <button
                  onClick={() => setActiveTab('forgot')}
                  className="text-xs text-[#1565C0] dark:text-[#7DD4FC] hover:underline"
                >
                  {t('forgot_password', language)}
                </button>
              </div>
            </div>
          )}

          {/* Register Form */}
          {activeTab === 'register' && (
            <div className="bg-white dark:bg-[#070E1E] rounded-2xl shadow p-6">
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
                  <PasswordInput
                    className={inputClass}
                    value={regForm.password}
                    onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))}
                    required
                    minLength={8}
                  />
                  {regForm.password.length === 0 ? (
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 italic">
                      {t('pw_requirement_hint', language)}
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-0.5" aria-label={t('pw_requirement_hint', language)}>
                      {passwordRequirements.map(({ key, met }) => {
                        const ok = met(regForm.password)
                        return (
                          <li key={key} className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            <span aria-hidden="true" className="flex-shrink-0">{ok ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}</span>
                            {t(key, language)}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                <div>
                  <label className={labelClass}>{t('input_confirm_password', language)} *</label>
                  <PasswordInput
                    className={inputClass}
                    value={regForm.confirmPassword}
                    onChange={e => setRegForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    required
                    minLength={8}
                  />
                  {regForm.confirmPassword.length > 0 && regForm.password !== regForm.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">{t('err_password_mismatch', language)}</p>
                  )}
                </div>

                {/* KVKK */}
                <div className="bg-gray-50 dark:bg-[#0E1A30] rounded-xl p-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regForm.kvkk}
                      onChange={e => setRegForm(p => ({ ...p, kvkk: e.target.checked }))}
                      className="mt-0.5 accent-[#1565C0]"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      <button
                        type="button"
                        onClick={() => setShowKvkkModal(true)}
                        className="text-[#1565C0] dark:text-[#7DD4FC] underline font-semibold hover:opacity-80"
                      >
                        {t('kvkk_title', language)}
                      </button>
                      {t('kvkk_consent_suffix', language)}
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
                  className="w-full py-3 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
                >
                  {regLoading ? t('loading_registering', language) : t('btn_register', language)}
                </button>
              </form>
            </div>
          )}
          {/* Forgot Password Form */}
          {activeTab === 'forgot' && (
            <div className="bg-white dark:bg-[#070E1E] rounded-2xl shadow p-6">
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
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 text-center">{t('forgot_success', language)}</p>
                  </div>
                  <button
                    onClick={goBackToLogin}
                    className="w-full py-3 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 transition"
                  >
                    {t('back_to_login', language)}
                  </button>
                </div>
              ) : forgotStep === 1 ? (
                <form onSubmit={handleForgotLookup} className="space-y-3">
                  <div>
                    <label className={labelClass}>{t('input_email', language)} *</label>
                    <input
                      type="email"
                      className={inputClass}
                      placeholder={t('placeholder_registered_email', language)}
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
                    className="w-full py-3 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
                  >
                    {forgotLoading ? t('loading_looking_up', language) : t('forgot_verify_btn', language)}
                  </button>
                  <button type="button" onClick={goBackToLogin} className="w-full text-xs text-[#1565C0] dark:text-[#7DD4FC] hover:underline pt-1">
                    ← {t('back_to_login', language)}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotReset} className="space-y-3">
                  <div className="bg-[#1565C0]/5 dark:bg-[#7DD4FC]/5 rounded-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                    {forgotFoundUser?.name} {forgotFoundUser?.surname} — {forgotFoundUser?.email}
                  </div>
                  <div>
                    <label className={labelClass}>{t('input_password', language)} *</label>
                    <PasswordInput
                      className={inputClass}
                      value={forgotNewPassword}
                      onChange={e => setForgotNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('input_confirm_password', language)} *</label>
                    <PasswordInput
                      className={inputClass}
                      value={forgotConfirmPassword}
                      onChange={e => setForgotConfirmPassword(e.target.value)}
                      required
                      minLength={8}
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
                    className="w-full py-3 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
                  >
                    {forgotLoading ? t('loading_saving', language) : t('forgot_save_btn', language)}
                  </button>
                  <button type="button" onClick={() => { setForgotStep(1); setForgotError('') }} className="w-full text-xs text-[#1565C0] dark:text-[#7DD4FC] hover:underline pt-1">
                    ← {t('btn_back', language)}
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
          <div className="bg-white dark:bg-[#070E1E] rounded-2xl shadow-xl w-full max-w-lg flex flex-col" style={{maxHeight: '80vh'}}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                {t('kvkk_title', language)}
              </h3>
              <button
                onClick={() => setShowKvkkModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold leading-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4 flex-1 space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {language === 'TR' ? (
                <>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-center">KİŞİSEL VERİLERİN KORUNMASI KANUNU KAPSAMINDA AYDINLATMA METNİ</p>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">1. Veri Sorumlusu</p>
                    <p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz; veri sorumlusu sıfatıyla Millî Eğitim Bakanlığı Öğretmen Geliştirme Politikaları Genel Müdürlüğü (ÖGEDEP) tarafından işlenecektir.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">2. İşlenen Kişisel Veriler</p>
                    <p className="mb-1">Sistemimiz aracılığıyla aşağıdaki kişisel verileriniz işlenmektedir:</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-2">
                      <li>Ad, soyad</li>
                      <li>E-posta adresi</li>
                      <li>Telefon numarası</li>
                      <li>Branş bilgisi</li>
                      <li>Çalışılan kurum adı ve ilçe</li>
                      <li>İl / şehir bilgisi</li>
                      <li>Randevu tarihleri ve seçilen stüdyo / laboratuvar bilgileri</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">3. Kişisel Verilerin İşlenme Amacı</p>
                    <p className="mb-1">Kişisel verileriniz;</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-2">
                      <li>Öğretmen Öğrenme Laboratuvarlarına (ÖÖL) randevu oluşturulması ve yönetilmesi,</li>
                      <li>Üyelik başvurusunun değerlendirilmesi ve onaylanması,</li>
                      <li>Sistem güvenliği ve yetkisiz erişimlerin önlenmesi,</li>
                      <li>Yönetici bildirimleri ve iletişim süreçlerinin yürütülmesi</li>
                    </ul>
                    <p className="mt-1">amaçlarıyla işlenmektedir.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">4. Hukuki Dayanak</p>
                    <p>Kişisel verileriniz; KVKK'nın 5. maddesi kapsamında "kanunlarda açıkça öngörülmesi" ve "ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla, veri sorumlusunun meşru menfaatleri için zorunlu olması" hukuki sebeplerine dayanılarak işlenmektedir.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">5. Kişisel Verilerin Aktarılması</p>
                    <p>Kişisel verileriniz; yetkili kamu kurum ve kuruluşları haricinde üçüncü taraflarla paylaşılmamaktadır. Sistem altyapısı için kullanılan bulut hizmet sağlayıcısı, uluslararası teknik güvenlik standartlarına uygun şekilde hizmet vermekte olup veri aktarımları şifreli kanallar üzerinden gerçekleştirilmektedir.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">6. Veri Güvenliği</p>
                    <p>Kişisel verileriniz SHA-256 kriptografik algoritması ile şifrelenerek saklanmakta; yetkisiz erişimlere karşı teknik ve idari güvenlik tedbirleri uygulanmaktadır. Şifreler hiçbir koşulda açık metin olarak depolanmamaktadır.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">7. Veri Sahibinin Hakları (KVKK Madde 11)</p>
                    <p className="mb-1">KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-2">
                      <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
                      <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
                      <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
                      <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
                      <li>Eksik veya yanlış işlenmesi hâlinde düzeltilmesini isteme,</li>
                      <li>Kanunda öngörülen koşulların varlığı hâlinde silinmesini veya yok edilmesini isteme,</li>
                      <li>Yapılan işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
                      <li>İşlenen verilerin münhasıran otomatik sistemler aracılığıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme,</li>
                      <li>Kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme.</li>
                    </ul>
                    <p className="mt-2">Taleplerinizi <span className="font-medium text-[#1565C0] dark:text-[#7DD4FC]">ögedep@meb.gov.tr</span> adresine iletebilirsiniz.</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-center">PERSONAL DATA PROTECTION LAW (KVKK) DISCLOSURE TEXT</p>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">1. Data Controller</p>
                    <p>Pursuant to the Personal Data Protection Law No. 6698 ("KVKK"), your personal data will be processed by the Directorate General of Teacher Development Policies (ÖGEDEP) of the Ministry of National Education as the data controller.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">2. Personal Data Processed</p>
                    <p className="mb-1">The following personal data is processed through our system:</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-2">
                      <li>First and last name</li>
                      <li>Email address</li>
                      <li>Phone number</li>
                      <li>Branch information</li>
                      <li>Institution name and district</li>
                      <li>City information</li>
                      <li>Appointment dates and selected studio / laboratory information</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">3. Purposes of Processing</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-2">
                      <li>Creating and managing appointments for Teacher Learning Labs (ÖÖL),</li>
                      <li>Evaluating and approving membership applications,</li>
                      <li>System security and prevention of unauthorized access,</li>
                      <li>Admin notifications and communication processes.</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">4. Legal Basis</p>
                    <p>Your personal data is processed based on Article 5 of KVKK: "explicitly provided for by law" and "necessary for the legitimate interests of the data controller, provided that this does not harm the fundamental rights and freedoms of the data subject."</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">5. Data Transfers</p>
                    <p>Your personal data is not shared with third parties outside of authorized public institutions. The cloud service provider used for the system infrastructure operates in accordance with international technical security standards, and data transfers are carried out through encrypted channels.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">6. Data Security</p>
                    <p>Your personal data is stored encrypted using the SHA-256 cryptographic algorithm; technical and administrative security measures are implemented against unauthorized access. Passwords are never stored in plain text.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">7. Rights of the Data Subject (KVKK Article 11)</p>
                    <p className="mb-1">Pursuant to Article 11 of KVKK, you have the following rights:</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-2">
                      <li>To learn whether your personal data has been processed,</li>
                      <li>To request information if it has been processed,</li>
                      <li>To learn the purpose of processing and whether it is used for its purpose,</li>
                      <li>To know the third parties to whom it is transferred domestically or abroad,</li>
                      <li>To request correction if it is incomplete or incorrectly processed,</li>
                      <li>To request deletion or destruction under conditions stipulated by law,</li>
                      <li>To request notification of the operations to third parties to whom data is transferred,</li>
                      <li>To object to a result arising exclusively through automated systems,</li>
                      <li>To demand compensation if you suffer damage due to unlawful processing.</li>
                    </ul>
                    <p className="mt-2">You can submit your requests to <span className="font-medium text-[#1565C0] dark:text-[#7DD4FC]">ögedep@meb.gov.tr</span>.</p>
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => { setRegForm(p => ({ ...p, kvkk: true })); setShowKvkkModal(false) }}
                className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 transition"
              >
                {t('kvkk_agree_btn', language)}
              </button>
              <button
                onClick={() => setShowKvkkModal(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                {t('btn_close', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRegSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#070E1E] rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">
              {t('reg_success_title', language)}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              {t('reg_success_msg', language)}
            </p>
            <button
              onClick={() => { setShowRegSuccessModal(false); setActiveTab('login') }}
              className="w-full py-3 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 transition"
            >
              {t('btn_ok', language)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
