import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#040A1C] px-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-red-600 dark:text-red-400">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Beklenmeyen bir hata oluştu</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Sayfayı yenileyerek tekrar deneyin.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-[#1565C0] hover:bg-[#0D47A1] text-white font-semibold rounded-xl text-sm transition"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
