import React from 'react'

export default function AppLogo({ size = 40 }) {
  return (
    <img
      src="/logo.png"
      alt="ÖÖL Logo"
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  )
}
