import type { ChatMessageViewModel } from '../types/chat'
import { MarkdownMessageContent } from './MarkdownMessageContent'

interface MessageBubbleProps {
  message: ChatMessageViewModel
}

/**
 * 단일 채팅 메시지와 분류 결과를 표시한다.
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const isUserMessage = message.role === 'user'
  const className = [
    'message',
    isUserMessage ? 'user' : 'assistant',
    message.isPending ? 'pending' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const shouldShowDiagnostics = isUserMessage && message.details.length > 0

  return (
    <article className={className} aria-busy={message.isPending}>
      {!isUserMessage && <div className="avatar">{message.avatarLabel}</div>}
      <div className="message-body">
        {isUserMessage ? (
          <p className="plain-message-content">{message.content}</p>
        ) : (
          <MarkdownMessageContent content={message.content} />
        )}
        <div className="message-meta">
          <span>{message.senderName}</span>
          <span>{message.createdAtLabel}</span>
        </div>
        {shouldShowDiagnostics && (
          <dl className="detail-grid">
            {message.details.map((detail) => (
              <div key={`${message.id}-${detail.label}`}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  )
}
