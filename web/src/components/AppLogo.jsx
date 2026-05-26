import React from 'react'

export default function AppLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#6750A4"/>
      <rect x="7" y="10" width="22" height="14" rx="2" fill="white" fillOpacity="0.15"/>
      <rect x="8" y="11" width="20" height="12" rx="1.5" fill="white" fillOpacity="0.9"/>
      <circle cx="13" cy="17" r="3" fill="#6750A4"/>
      <circle cx="13" cy="17" r="1.5" fill="#D0BCFF"/>
      <path d="M19 14.5C20.5 15.5 20.5 18.5 19 19.5" stroke="#6750A4" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M21.5 13C23.5 14.5 23.5 19.5 21.5 21" stroke="#6750A4" strokeWidth="1.2" strokeLinecap="round"/>
      <rect x="16" y="24" width="1.5" height="3" fill="white" fillOpacity="0.5"/>
      <rect x="13" y="27" width="7" height="1.5" rx="0.75" fill="white" fillOpacity="0.5"/>
      <circle cx="30" cy="12" r="4" fill="#E53E3E"/>
      <circle cx="30" cy="12" r="2" fill="white"/>
    </svg>
  )
}
