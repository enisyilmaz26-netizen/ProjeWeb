import React, { lazy, Suspense, useState } from 'react'
import { useApp } from './context/AppContext'

const AuthScreen = lazy(() => import('./screens/AuthScreen'))
const MainAppContainer = lazy(() => import('./screens/MainAppContainer'))
const LandingPage = lazy(() => import('./screens/LandingPage'))
const ForcePasswordChange = lazy(() => import('./components/ForcePasswordChange'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#EFF8FF] dark:bg-[#060E26] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const { loggedInUser, loggedInAdmin } = useApp()
  const [showAuth, setShowAuth] = useState(false)
  const isLoggedIn = loggedInUser !== null || loggedInAdmin !== null

  return (
    <Suspense fallback={<PageLoader />}>
      {isLoggedIn && (loggedInUser?.must_change_password || loggedInAdmin?.must_change_password)
        ? <ForcePasswordChange />
        : isLoggedIn
        ? <MainAppContainer />
        : showAuth
        ? <AuthScreen onBack={() => setShowAuth(false)} />
        : <LandingPage onLoginClick={() => setShowAuth(true)} />
      }
    </Suspense>
  )
}
