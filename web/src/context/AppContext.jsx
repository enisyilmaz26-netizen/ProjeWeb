import React, { useContext } from 'react'
import { AuthContext, AuthProvider } from './AuthContext'
import { DataContext, DataProvider } from './DataContext'

export function AppProvider({ children }) {
  return (
    <AuthProvider>
      <DataProvider>
        {children}
      </DataProvider>
    </AuthProvider>
  )
}

export function useApp() {
  const auth = useContext(AuthContext)
  const data = useContext(DataContext)
  if (!auth || !data) throw new Error('useApp must be used within AppProvider')
  return { ...auth, ...data }
}
