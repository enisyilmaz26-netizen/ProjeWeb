export const generateTempPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '!@#$%'
  const all = upper + lower + digits + special
  const rand = (set) => set[Math.floor(Math.random() * set.length)]
  const base = [rand(upper), rand(lower), rand(digits), rand(special),
    ...Array.from({ length: 6 }, () => rand(all))]
  return base.sort(() => Math.random() - 0.5).join('')
}

export const passwordRequirements = [
  { key: 'pw_req_length',  met: pw => pw.length >= 8 },
  { key: 'pw_req_upper',   met: pw => /[A-Z]/.test(pw) },
  { key: 'pw_req_lower',   met: pw => /[a-z]/.test(pw) },
  { key: 'pw_req_number',  met: pw => /[0-9]/.test(pw) },
  { key: 'pw_req_special', met: pw => /[^A-Za-z0-9]/.test(pw) },
]

export const isPasswordStrong = (pw) => passwordRequirements.every(r => r.met(pw))
