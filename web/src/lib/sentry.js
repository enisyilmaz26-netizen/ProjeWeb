import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN
const enabled = Boolean(dsn) && import.meta.env.PROD

export function initSentry() {
  if (!enabled) return

  Sentry.init({
    dsn,
    environment: 'production',
    release: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request?.url) {
        try {
          const u = new URL(event.request.url)
          ;['session_token', 'token', 'access_token'].forEach((k) => u.searchParams.delete(k))
          event.request.url = u.toString()
        } catch {}
      }
      return event
    },
  })
}

export function setSentryUser(user) {
  if (!enabled) return
  if (!user) {
    Sentry.setUser(null)
    return
  }
  Sentry.setUser({
    id: user.id,
    username: user.role || (user.is_global_admin ? 'global_admin' : user.city ? 'city_admin' : 'user'),
  })
}

export function captureException(error, context) {
  if (!enabled) return
  Sentry.captureException(error, context)
}

export { Sentry }
