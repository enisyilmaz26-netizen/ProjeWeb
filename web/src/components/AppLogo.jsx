import React from 'react'

export default function AppLogo({ size = 40 }) {
  return (
    <img
      src="/logo.png"
      alt="ÖÖL Logo"
      style={{ height: size, width: 'auto', flexShrink: 0, objectFit: 'contain' }}
    />
  )
}
