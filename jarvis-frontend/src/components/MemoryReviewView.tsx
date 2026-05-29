import type {
  MemoryFormViewModel,
  MemoryViewModel,
  ResourceEditorMode,
} from '../types/chat'

interface MemoryReviewViewProps {
  form: MemoryFormViewModel
  isBusy: boolean
  memories: MemoryViewModel[]
  editorMode: ResourceEditorMode
  onClearForm: () => void
  onCloseEditor: () => void
  onDeleteMemory: (memoryId: string) => Promise<void>
  onEditMemory: (memory: MemoryViewModel) => void
  onFormChange: (field: keyof MemoryFormViewModel, value: string) => void
  onOpenEditor: () => void
  onSave: () => Promise<void>
}

/**
 * 사용자 memory 생성, 수정, soft delete intent를 표시한다.
 */
export function MemoryReviewView({
  form,
  isBusy,
  memories,
  editorMode,
  onClearForm,
  onCloseEditor,
  onDeleteMemory,
  onEditMemory,
  onFormChange,
  onOpenEditor,
  onSave,
}: MemoryReviewViewProps) {
  const isEditorOpen = editorMode !== 'closed'

  return (
    <section className="resource-workspace" aria-label="메모리 관리">
      <header className="resource-header">
        <div>
          <p className="panel-eyebrow">Memories</p>
          <h2>메모리</h2>
        </div>
        <div className="resource-header-actions">
          <span>{memories.length}개</span>
          <button disabled={isBusy || isEditorOpen} onClick={onOpenEditor} type="button">
            + 메모리
          </button>
        </div>
      </header>

      {isEditorOpen ? (
        <section className="resource-editor" aria-label="메모리 추가 및 수정">
          <div className="resource-editor-heading">
            <div>
              <p className="panel-eyebrow">{editorMode === 'edit' ? 'Edit' : 'Create'}</p>
              <h3>{editorMode === 'edit' ? '메모리 수정' : '새 메모리'}</h3>
            </div>
            <button disabled={isBusy} onClick={onCloseEditor} type="button">
              닫기
            </button>
          </div>
          <form
            className="resource-form embedded"
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
                rows={6}
                value={form.content}
              />
            </label>
            <div className="form-actions">
              <button className="send-button" disabled={isBusy} type="submit">
                {editorMode === 'edit' ? '메모리 수정' : '메모리 생성'}
              </button>
              <button disabled={isBusy} onClick={onClearForm} type="button">
                취소
              </button>
            </div>
          </form>
        </section>
      ) : (
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
      )}
    </section>
  )
}
