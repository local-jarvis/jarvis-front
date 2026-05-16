import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import type { ChatMessageViewModel } from '../types/chat'

interface ChatMessageListProps {
  isLoading: boolean
  messages: ChatMessageViewModel[]
}

/**
 * 대화 메시지 목록과 초기 로딩 상태를 표시한다.
 */
export function ChatMessageList({
  isLoading,
  messages,
}: ChatMessageListProps) {
  const messageListRef = useRef<HTMLElement>(null)
  const latestMessage = messages[messages.length - 1]

  useEffect(() => {
    const messageList = messageListRef.current

    if (!messageList || isLoading) {
      return
    }

    messageList.scrollTo({
      top: messageList.scrollHeight,
      behavior: 'smooth',
    })
  }, [isLoading, latestMessage?.id, latestMessage?.content])

  if (isLoading) {
    return (
      <section className="message-list loading" aria-live="polite">
        JARVIS 연결 중
      </section>
    )
  }

  return (
    <section
      ref={messageListRef}
      className="message-list"
      aria-label="대화 메시지"
      aria-live="polite"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </section>
  )
}
