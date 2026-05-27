import { Mic, Video, Monitor, Pencil } from 'lucide-react'

export function getLabIcon(name = '', size = 'md') {
  const cls = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'
  const n = name.toLowerCase()
  if (n.includes('ses') || n.includes('podcast') || n.includes('audio') || n.includes('mikrofon')) return <Mic className={cls} />
  if (n.includes('video') || n.includes('yeşil ekran') || n.includes('green') || n.includes('kamera')) return <Video className={cls} />
  if (n.includes('post') || n.includes('prodüksiyon') || n.includes('düzenle') || n.includes('montaj')) return <Monitor className={cls} />
  return <Pencil className={cls} />
}
