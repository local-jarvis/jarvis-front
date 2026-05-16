import type { MemoryFormViewModel, MemoryViewModel } from '../types/chat'

interface MemoryReviewViewProps {
  form: MemoryFormViewModel
  isBusy: boolean
  memories: MemoryViewModel[]
  onClearForm: () => void
  onDeleteMemory: (memoryId: string) => Promise<void>
  onEditMemory: (memory: MemoryViewModel) => void
  onFormChange: (field: keyof MemoryFormViewModel, value: string) => void
  onSave: () => Promise<void>
}

/**
 * 사용자 memory 생성, 수정, soft delete intent를 표시한다.
 */
export function MemoryReviewView({
  form,
  isBusy,
  memories,
  onClearForm,
  onDeleteMemory,
  onEditMemory,
  onFormChange,
  onSave,
}: MemoryReviewViewProps) {
  return (
    <section className="resource-workspace" aria-label="메모리 관리">
      <header className="resource-header">
        <div>
          <p className="panel-eyebrow">Memories</p>
          <h2>메모리</h2>
        </div>
        <span>{memories.length}개</span>
      </header>

      <form
        className="resource-form"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave()
        }}
      >
        <label>
          <span>내용</span>
          <textarea
            disabled={isBusy}
            onChange={(event) => onFormChange('content', event.target.value)}
            rows={3}
            value={form.content}
          />
        </label>
        <div className="form-actions">
          <button className="send-button" disabled={isBusy} type="submit">
            {form.editingId ? '메모리 수정' : '메모리 생성'}
          </button>
          <button disabled={isBusy} onClick={onClearForm} type="button">
            초기화
          </button>
        </div>
      </form>

      <div className="resource-list">
        {memories.length === 0 ? (
          <p className="empty-state">저장된 메모리가 없습니다.</p>
        ) : (
          memories.map((memory) => (
            <article className="resource-item" key={memory.id}>
              <div>
                <strong>{memory.content}</strong>
                <span>{memory.activeLabel}</span>
                <small>updated {memory.updatedAtLabel}</small>
              </div>
              <div className="item-actions">
                <button
                  disabled={isBusy}
                  onClick={() => onEditMemory(memory)}
                  type="button"
                >
                  수정
                </button>
                <button
                  disabled={isBusy}
                  onClick={() => void onDeleteMemory(memory.id)}
                  type="button"
                >
                  삭제
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
