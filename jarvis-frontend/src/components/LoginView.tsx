import type { LoginFormViewModel, SystemStatusViewModel } from '../types/chat'

interface LoginViewProps {
  form: LoginFormViewModel
  systemStatus: SystemStatusViewModel
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: () => Promise<void>
}

/**
 * 개인 JARVIS 계정 로그인을 표시한다.
 */
export function LoginView({
  form,
  systemStatus,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginViewProps) {
  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="JARVIS 로그인">
        <div className="brand-block">
          <div className="brand-mark">J</div>
          <div>
            <h1>JARVIS</h1>
            <p>Private Assistant Workspace</p>
          </div>
        </div>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault()
            void onSubmit()
          }}
        >
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              disabled={form.isSubmitting}
              onChange={(event) => onEmailChange(event.target.value)}
              type="email"
              value={form.email}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              disabled={form.isSubmitting}
              onChange={(event) => onPasswordChange(event.target.value)}
              type="password"
              value={form.password}
            />
          </label>
          {form.errorMessage && (
            <p className="form-error" role="alert">
              {form.errorMessage}
            </p>
          )}
          <button className="send-button" disabled={form.isSubmitting} type="submit">
            {form.isSubmitting ? '로그인 중' : '로그인'}
          </button>
        </form>

        <dl className="runtime-grid">
          <dt>api</dt>
          <dd>{systemStatus.runtimeLabel}</dd>
          <dt>health</dt>
          <dd>{systemStatus.healthLabel}</dd>
        </dl>
      </section>
    </main>
  )
}
