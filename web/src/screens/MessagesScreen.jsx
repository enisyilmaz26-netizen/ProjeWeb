import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { t, getLocale } from '../lib/languages'
import { Send, MessageSquare, ArrowLeft, Shield } from 'lucide-react'

function formatMsgTime(iso, language) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(getLocale(language), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function MessagesScreen() {
  const { loggedInUser, conversations, language, getOrCreateConversation, loadConversationMessages, sendMessage, markConversationRead } = useApp()

  const [selectedConvId, setSelectedConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const [convError, setConvError] = useState('')
  const messagesEndRef = useRef(null)
  const lastKnownAt = useRef(null)

  const userConvs = conversations.filter(c => String(c.sender_id) === String(loggedInUser?.id))
  const selectedConv = conversations.find(c => c.id === selectedConvId)

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const t = selectedConv?.last_message_at
    if (!selectedConvId || !t) return
    if (lastKnownAt.current && t > lastKnownAt.current) {
      lastKnownAt.current = t
      let mounted = true
      loadConversationMessages(selectedConvId)
        .then(msgs => { if (mounted) setMessages(msgs) })
        .catch(err => { console.error('[messages] reload failed:', err) })
      return () => { mounted = false }
    }
  }, [selectedConv?.last_message_at])

  const openOrCreateConv = async (recipientType) => {
    setConvError('')
    let conv = userConvs.find(c => c.recipient_type === recipientType)
    if (!conv) {
      const result = await getOrCreateConversation(
        'user',
        loggedInUser.id,
        loggedInUser.email,
        `${loggedInUser.name} ${loggedInUser.surname}`,
        loggedInUser.city_id,
        recipientType
      )
      if (!result.success) {
        setConvError(t('err_conv_start', language))
        return
      }
      conv = result.data
    }
    setSelectedConvId(conv.id)
    lastKnownAt.current = conv.last_message_at ?? null
    setLoadingMsgs(true)
    try {
      const msgs = await loadConversationMessages(conv.id)
      setMessages(msgs)
      if (conv.unread_for_sender > 0) markConversationRead(conv.id, 'sender').catch(err => console.error('[messages] markRead failed:', err))
    } catch (err) {
      console.error('[messages] load failed:', err)
      setConvError(t('err_msgs_load', language))
    } finally {
      setLoadingMsgs(false)
    }
  }

  const handleSend = async () => {
    if (!msgInput.trim() || !selectedConvId || sending || !loggedInUser) return
    setSending(true)
    try {
      const result = await sendMessage(selectedConvId, msgInput, 'sender', `${loggedInUser.name} ${loggedInUser.surname}`)
      if (result.success) {
        setMessages(prev => [...prev, result.data])
        setMsgInput('')
      } else {
        setConvError(t('err_msg_send', language))
      }
    } finally {
      setSending(false)
    }
  }

  if (!loggedInUser) return null

  // Thread list view
  if (!selectedConvId) {
    const threads = [
      { type: 'city_admin', label: t('msg_to_city_admin', language), icon: <MessageSquare className="w-5 h-5" aria-hidden="true" /> },
      { type: 'global_admin', label: t('msg_to_global_admin', language), icon: <Shield className="w-5 h-5" aria-hidden="true" /> },
    ]
    return (
      <div className="px-4 py-4">
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-4">{t('tab_messages', language)}</h2>
        {convError && (
          <div role="status" aria-live="polite" className="mb-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
            {convError}
          </div>
        )}
        <div className="space-y-3">
          {threads.map(({ type, label, icon }) => {
            const conv = userConvs.find(c => c.recipient_type === type)
            const unread = conv?.unread_for_sender || 0
            return (
              <button
                key={type}
                onClick={() => openOrCreateConv(type)}
                className="w-full bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center text-[#1565C0] dark:text-[#7DD4FC] flex-shrink-0">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{label}</p>
                  {conv ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatMsgTime(conv.last_message_at, language)}</p>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('msg_no_conversations', language)}</p>
                  )}
                </div>
                {unread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Chat view
  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#0D1E3D] shadow-sm sticky top-0 z-10">
        <button onClick={() => { setSelectedConvId(null); setMessages([]); lastKnownAt.current = null }} aria-label={t('btn_back', language)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
            {selectedConv?.recipient_type === 'city_admin' ? t('msg_to_city_admin', language) : t('msg_to_global_admin', language)}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loadingMsgs ? (
          <div className="text-center text-gray-400 text-sm py-8">{t('loading', language)}</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">{t('msg_no_messages', language)}</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.authored_by === 'sender'
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMine ? 'bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-br-sm' : 'bg-white dark:bg-[#0D1E3D] text-gray-900 dark:text-gray-100 shadow rounded-bl-sm'}`}>
                  {!isMine && <p className="text-[10px] font-semibold text-[#1565C0] dark:text-[#7DD4FC] mb-0.5">{msg.author_name}</p>}
                  <p className="text-sm leading-relaxed">{msg.body}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70 dark:text-[#060E26]/70' : 'text-gray-400 dark:text-gray-500'}`}>{formatMsgTime(msg.created_at, language)}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 bg-[#EFF8FF] dark:bg-[#060E26]">
        <div className="flex gap-2 items-end bg-white dark:bg-[#0D1E3D] rounded-2xl shadow px-3 py-2">
          <textarea
            className="flex-1 bg-transparent resize-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none min-h-[36px] max-h-[120px]"
            placeholder={t('msg_placeholder', language)}
            value={msgInput}
            onChange={e => setMsgInput(e.target.value.slice(0, 4000))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            maxLength={4000}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!msgInput.trim() || sending}
            aria-label={t('msg_send', language)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] hover:opacity-90 transition disabled:opacity-40 flex-shrink-0"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        {msgInput.length > 3500 && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-right mt-1 pr-1">
            {msgInput.length}/4000
          </p>
        )}
      </div>
    </div>
  )
}
