import React, { useState } from 'react'
import { useApp } from './context/AppContext'
import AuthScreen from './screens/AuthScreen'
import MainAppContainer from './screens/MainAppContainer'
import LandingPage from './screens/LandingPage'
import ForcePasswordChange from './components/ForcePasswordChange'

export default function App() {
  const { loggedInUser, loggedInAdmin } = useApp()
  const [showAuth, setShowAuth] = useState(false)

  const isLoggedIn = loggedInUser !== null || loggedInAdmin !== null

  if (isLoggedIn && (loggedInUser?.must_change_password || loggedInAdmin?.must_change_password)) return <ForcePasswordChange />
  if (isLoggedIn) return <MainAppContainer />
  if (showAuth) return <AuthScreen onBack={() => setShowAuth(false)} />
  return <LandingPage onLoginClick={() => setShowAuth(true)} />
}
