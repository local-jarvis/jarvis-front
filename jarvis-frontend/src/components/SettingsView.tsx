import type { SystemStatusViewModel, WebPushViewModel } from '../types/chat'

interface SettingsViewProps {
  isBusy: boolean
  systemStatus: SystemStatusViewModel
  webPush: WebPushViewModel
  onRegisterWebPush: () => Promise<void>
}

/**
 * backend runtime과 Web Push 등록 상태를 표시한다.
 */
export function SettingsView({
  isBusy,
  systemStatus,
  webPush,
  onRegisterWebPush,
}: SettingsViewProps) {
  return (
    <section className="resource-workspace" aria-label="설정">
      <header className="resource-header">
        <div>
          <p className="panel-eyebrow">Settings</p>
          <h2>설정</h2>
        </div>
        <span>{systemStatus.healthLabel}</span>
      </header>

      <section className="settings-grid">
        <article className="settings-card">
          <p className="panel-eyebrow">Backend</p>
          <dl className="runtime-grid">
            <dt>model</dt>
            <dd>{systemStatus.modelName}</dd>
            <dt>runtime</dt>
            <dd>{systemStatus.runtimeLabel}</dd>
            <dt>health</dt>
            <dd>{systemStatus.healthLabel}</dd>
          </dl>
        </article>

        <article className="settings-card">
          <p className="panel-eyebrow">Web Push</p>
          <dl className="runtime-grid">
            <dt>enabled</dt>
            <dd>{webPush.enabled ? 'yes' : 'no'}</dd>
            <dt>public key</dt>
            <dd>{webPush.publicKeyLabel}</dd>
            <dt>permission</dt>
            <dd>{webPush.permissionLabel}</dd>
            <dt>subscription</dt>
            <dd>{webPush.subscriptionStatusLabel}</dd>
          </dl>
          {webPush.errorMessage && (
            <p className="form-error" role="alert">
              {webPush.errorMessage}
            </p>
          )}
          <button
            className="send-button"
            disabled={isBusy || webPush.isSubmitting || !webPush.enabled}
            onClick={() => void onRegisterWebPush()}
            type="button"
          >
            {webPush.isSubmitting ? '등록 중' : '이 브라우저 등록'}
          </button>
        </article>
      </section>
    </section>
  )
}
