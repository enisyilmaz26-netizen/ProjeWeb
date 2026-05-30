import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'

export function useFocusTrap(active = true) {
  const ref = useRef(null)

  useEffect(() => {
    if (!active || !ref.current) return
    const el = ref.current
    const getFocusable = () => Array.from(el.querySelectorAll(FOCUSABLE))
    const previouslyFocused = document.activeElement

    const first = getFocusable()[0]
    if (first) first.focus()

    const handler = (e) => {
      if (e.key !== 'Tab') return
      const items = getFocusable()
      if (!items.length) return
      if (e.shiftKey) {
        if (document.activeElement === items[0]) { e.preventDefault(); items[items.length - 1].focus() }
      } else {
        if (document.activeElement === items[items.length - 1]) { e.preventDefault(); items[0].focus() }
      }
    }

    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      if (previouslyFocused?.focus) previouslyFocused.focus()
    }
  }, [active])

  return ref
}
