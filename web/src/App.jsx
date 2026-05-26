import React, { useState } from 'react'
import { useApp } from './context/AppContext'
import AuthScreen from './screens/AuthScreen'
import MainAppContainer from './screens/MainAppContainer'
import LandingPage from './screens/LandingPage'

export default function App() {
  const { loggedInUser, loggedInAdmin } = useApp()
  const [showAuth, setShowAuth] = useState(false)

  const isLoggedIn = loggedInUser !== null || loggedInAdmin !== null

  if (isLoggedIn) return <MainAppContainer />
  if (showAuth) return <AuthScreen onBack={() => setShowAuth(false)} />
  return <LandingPage onLoginClick={() => setShowAuth(true)} />
}
