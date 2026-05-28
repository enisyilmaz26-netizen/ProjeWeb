import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { t } from '../../lib/languages'
import { Send, ArrowLeft, MessageSquare, Shield } from 'lucide-react'

function formatMsgTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AdminMessagesTab({ language, isGlobal, adminCityId }) {
  const { loggedInAdmin, conversations, cities, getOrCreateConversation, loadConversationMessages, sendMessage, markConversationRead } = useApp()

  const [selectedConvId, setSelectedConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // City admin: sees user→city convos from their city + their own→global thread
  // Global admin: sees ALL conversations
  const cityConvs = isGlobal
    ? conversations.filter(c => c.recipient_type === 'city_admin')
    : conversations.filter(c => c.recipient_type === 'city_admin' && String(c.city_id) === String(adminCityId))

  const globalConvs = isGlobal
    ? conversations.filter(c => c.recipient_type === 'global_admin')
    : conversations.filter(c => c.recipient_type === 'global_admin' && String(c.sender_id) === String(loggedInAdmin?.id))

  const allConvs = [...cityConvs, ...globalConvs]
  const selectedConv = conversations.find(c => c.id === selectedConvId)

  const totalUnread = isGlobal
    ? conversations.reduce((sum, c) => sum + (c.unread_for_recipient || 0), 0)
    : cityConvs.reduce((sum, c) => sum + (c.unread_for_recipient || 0), 0) +
      globalConvs.reduce((sum, c) => sum + (c.unread_for_sender || 0), 0)

  const openConv = async (conv) => {
    setSelectedConvId(conv.id)
    setLoadingMsgs(true)
    const msgs = await loadConversationMessages(conv.id)
    setMessages(msgs)
    setLoadingMsgs(false)
    // Determine which side we are and mark as read
    const amRecipient = conv.recipient_type === 'city_admin' || conv.recipient_type === 'global_admin'
    const iAmCityAdmin = !isGlobal && conv.recipient_type === 'city_admin'
    const iAmGlobalAdmin = isGlobal
    const side = (iAmCityAdmin || iAmGlobalAdmin) && amRecipient ? 'recipient' : 'sender'
    const unreadField = side === 'recipient' ? 'unread_for_recipient' : 'unread_for_sender'
    if (conv[unreadField] > 0) markConversationRead(conv.id, side)
  }

  const openOrCreateGlobalConv = async () => {
    if (!loggedInAdmin) return
    let conv = globalConvs.find(c => String(c.sender_id) === String(loggedInAdmin.id))
    if (!conv) {
      const cityName = cities.find(c => String(c.id) === String(adminCityId))?.name || ''
      const result = await getOrCreateConversation(
        'city_admin', loggedInAdmin.id, loggedInAdmin.email,
        `${loggedInAdmin.name} (${cityName})`,
        adminCityId, 'global_admin'
      )
      if (!result.success) return
      conv = result.data
    }
    openConv(conv)
  }

  const handleSend = async () => {
    if (!msgInput.trim() || !selectedConvId || sending || !selectedConv) return
    setSending(true)
    // Am I the recipient or the sender in this conversation?
    const iAmRecipient = (selectedConv.recipient_type === 'city_admin' && !isGlobal) ||
                         (selectedConv.recipient_type === 'global_admin' && isGlobal)
    const authoredBy = iAmRecipient ? 'recipient' : 'sender'
    const result = await sendMessage(selectedConvId, msgInput, authoredBy, loggedInAdmin?.name || '')
    if (result.success) {
      setMessages(prev => [...prev, result.data])
      setMsgInput('')
    }
    setSending(false)
  }

  const getConvTitle = (conv) => {
    if (conv.recipient_type === 'global_admin') {
      return isGlobal
        ? `${conv.sender_name} → ${t('msg_to_global_admin', language)}`
        : t('msg_to_global_admin', language)
    }
    // city_admin type
    return conv.sender_name || conv.sender_email
  }

  const getConvSubtitle = (conv) => {
    const city = conv.city_id ? cities.find(c => String(c.id) === String(conv.city_id))?.name : null
    if (conv.recipient_type === 'global_admin' && isGlobal) {
      return city || ''
    }
    return city || conv.sender_email || ''
  }

  // Chat view
  if (selectedConvId && selectedConv) {
    const iAmRecipient = (selectedConv.recipient_type === 'city_admin' && !isGlobal) ||
                         (selectedConv.recipient_type === 'global_admin' && isGlobal)

    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
          <button onClick={() => { setSelectedConvId(null); setMessages([]) }} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{getConvTitle(selectedConv)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{getConvSubtitle(selectedConv)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mb-3">
          {loadingMsgs ? (
            <div className="text-center text-gray-400 text-sm py-8">{language === 'TR' ? 'Yükleniyor...' : 'Loading...'}</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">{t('msg_no_messages', language)}</div>
          ) : (
            messages.map(msg => {
              const isMine = (iAmRecipient && msg.authored_by === 'recipient') || (!iAmRecipient && msg.authored_by === 'sender')
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMine ? 'bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-br-sm' : 'bg-gray-100 dark:bg-[#0E1A30] text-gray-900 dark:text-gray-100 rounded-bl-sm'}`}>
                    {!isMine && <p className="text-[10px] font-semibold text-[#1565C0] dark:text-[#7DD4FC] mb-0.5">{msg.author_name}</p>}
                    <p className="text-sm leading-relaxed">{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70 dark:text-[#060E26]/70' : 'text-gray-400 dark:text-gray-500'}`}>{formatMsgTime(msg.created_at)}</p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 items-end bg-white dark:bg-[#0D1E3D] rounded-2xl shadow px-3 py-2">
          <textarea
            className="flex-1 bg-transparent resize-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none min-h-[36px] max-h-[100px]"
            placeholder={t('msg_placeholder', language)}
            value={msgInput}
            onChange={e => setMsgInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!msgInput.trim() || sending}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] hover:opacity-90 transition disabled:opacity-40 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Conversation list
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t('tab_messages', language)}</h3>
        {totalUnread > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">{totalUnread} {t('msg_unread_badge', language)}</span>
        )}
      </div>

      {/* City admin → global thread button */}
      {!isGlobal && (
        <button
          onClick={openOrCreateGlobalConv}
          className="w-full mb-3 bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center text-[#1565C0] dark:text-[#7DD4FC] flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('msg_to_global_admin', language)}</p>
            {globalConvs.find(c => String(c.sender_id) === String(loggedInAdmin?.id)) ? (
              <p className="text-xs text-gray-400">{formatMsgTime(globalConvs.find(c => String(c.sender_id) === String(loggedInAdmin?.id))?.last_message_at)}</p>
            ) : (
              <p className="text-xs text-gray-400">{t('msg_no_conversations', language)}</p>
            )}
          </div>
          {globalConvs.find(c => String(c.sender_id) === String(loggedInAdmin?.id))?.unread_for_sender > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
              {globalConvs.find(c => String(c.sender_id) === String(loggedInAdmin?.id)).unread_for_sender}
            </span>
          )}
        </button>
      )}

      {/* User conversations (for this city) */}
      {cityConvs.length === 0 && globalConvs.filter(c => isGlobal).length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-8 text-center text-gray-400 text-sm">
          {t('msg_no_conversations', language)}
        </div>
      ) : (
        <div className="space-y-2">
          {[...cityConvs, ...(isGlobal ? globalConvs : [])].map(conv => {
            const unread = (conv.recipient_type === 'city_admin' || isGlobal)
              ? conv.unread_for_recipient
              : conv.unread_for_sender
            return (
              <button
                key={conv.id}
                onClick={() => openConv(conv)}
                className="w-full bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center text-[#1565C0] dark:text-[#7DD4FC] flex-shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{getConvTitle(conv)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{getConvSubtitle(conv)} · {formatMsgTime(conv.last_message_at)}</p>
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
      )}
    </div>
  )
}
