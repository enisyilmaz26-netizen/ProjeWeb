import React from 'react'
import { useApp } from './context/AppContext'
import AuthScreen from './screens/AuthScreen'
import MainAppContainer from './screens/MainAppContainer'

export default function App() {
  const { loggedInUser, loggedInAdmin } = useApp()

  const isLoggedIn = loggedInUser !== null || loggedInAdmin !== null

  return (
    <div className="min-h-screen bg-[#FEF7FF] dark:bg-[#141218] transition-colors duration-200">
      {isLoggedIn ? <MainAppContainer /> : <AuthScreen />}
    </div>
  )
}
