import type {
  ChatExecutionMode,
  ChatExecutionModeViewModel,
  QuickPromptViewModel,
} from '../types/chat'

interface ChatComposerProps {
  executionModes: ChatExecutionModeViewModel[]
  isSubmitting: boolean
  quickPrompts: QuickPromptViewModel[]
  selectedExecutionMode: ChatExecutionMode
  value: string
  onChange: (value: string) => void
  onExecutionModeChange: (mode: ChatExecutionMode) => void
  onPromptSelect: (prompt: QuickPromptViewModel) => void
  onSubmit: () => Promise<void>
}

/**
 * 채팅 입력과 빠른 프롬프트를 표시한다.
 */
export function ChatComposer({
  executionModes,
  isSubmitting,
  quickPrompts,
  selectedExecutionMode,
  value,
  onChange,
  onExecutionModeChange,
  onPromptSelect,
  onSubmit,
}: ChatComposerProps) {
  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit()
      }}
    >
      <div className="execution-mode-tabs" aria-label="실행 방식">
        {executionModes.map((mode) => (
          <button
            className={selectedExecutionMode === mode.id ? 'active' : ''}
            disabled={isSubmitting}
            key={mode.id}
            onClick={() => onExecutionModeChange(mode.id)}
            type="button"
          >
            {mode.label}
          </button>
        ))}
      </div>
      <div className="quick-prompts" aria-label="빠른 프롬프트">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            onClick={() => onPromptSelect(prompt)}
          >
            {prompt.label}
          </button>
        ))}
      </div>
      <div className="composer-row">
        <textarea
          aria-label="메시지 입력"
          disabled={isSubmitting}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey || isSubmitting) {
              return
            }

            event.preventDefault()
            void onSubmit()
          }}
          placeholder="자비스에게 요청하기..."
          rows={2}
          value={value}
        />
        <div className="composer-actions">
          <button className="send-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? '전송 중' : '전송'}
          </button>
        </div>
      </div>
    </form>
  )
}
