import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? ''
const FROM_NAME = 'MEB OGEDEP'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  if (!BREVO_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'BREVO_API_KEY is not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let body: { recipients: { email: string; name: string }[]; subject: string; html: string }
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { recipients, subject, html } = body
  if (!recipients?.length || !subject?.trim() || !html?.trim()) {
    return new Response(
      JSON.stringify({ error: 'recipients, subject and html are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ email: recipient.email, name: recipient.name || recipient.email }],
          subject,
          htmlContent: html,
        }),
      })

      if (res.ok) {
        sent++
      } else {
        const err = await res.json().catch(() => ({}))
        console.error('Brevo error for', recipient.email, ':', JSON.stringify(err))
        failed++
      }
    } catch (e) {
      console.error('Fetch error for', recipient.email, ':', e)
      failed++
    }
  }

  return new Response(
    JSON.stringify({ success: true, sent, failed, total: recipients.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
