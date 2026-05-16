import { ActivityTimelineView } from '../components/ActivityTimelineView'
import { ChatComposer } from '../components/ChatComposer'
import { ChatHeader } from '../components/ChatHeader'
import { ChatMessageList } from '../components/ChatMessageList'
import { InsightPanel } from '../components/InsightPanel'
import { LoginView } from '../components/LoginView'
import { MemoryReviewView } from '../components/MemoryReviewView'
import { ReminderReviewView } from '../components/ReminderReviewView'
import { ScheduleReviewView } from '../components/ScheduleReviewView'
import { SettingsView } from '../components/SettingsView'
import { Sidebar } from '../components/Sidebar'
import { useChatPage } from '../hooks/useChatPage'

/**
 * JARVIS 인증 기반 워크스페이스의 라우팅 단위 조립을 담당한다.
 */
export function ChatPage() {
  const chatPage = useChatPage()

  if (chatPage.isBootstrapping) {
    return <main className="boot-shell">JARVIS 초기화 중</main>
  }

  if (!chatPage.user) {
    return (
      <LoginView
        form={chatPage.loginForm}
        systemStatus={chatPage.systemStatus}
        onEmailChange={chatPage.handleLoginEmailChange}
        onPasswordChange={chatPage.handleLoginPasswordChange}
        onSubmit={chatPage.handleLoginSubmit}
      />
    )
  }

  return (
    <main className="app-shell">
      <Sidebar
        activeSessionId={chatPage.activeSessionId}
        activeView={chatPage.activeView}
        isBusy={chatPage.isResourceSubmitting}
        sessions={chatPage.sessions}
        systemStatus={chatPage.systemStatus}
        user={chatPage.user}
        onArchiveSession={chatPage.handleArchiveSession}
        onCreateSession={chatPage.handleCreateSession}
        onLogout={chatPage.handleLogout}
        onSessionSelect={chatPage.handleSessionSelect}
        onViewSelect={chatPage.handleViewSelect}
      />

      {chatPage.activeView === 'chat' && (
        <section className="chat-workspace" aria-label="JARVIS chat">
          <ChatHeader
            activeSessionId={chatPage.activeSessionId}
            isBusy={chatPage.isResourceSubmitting}
            sessionTitleDraft={chatPage.sessionTitleDraft}
            sessions={chatPage.sessions}
            systemStatus={chatPage.systemStatus}
            onSessionTitleDraftChange={chatPage.handleSessionTitleDraftChange}
            onSessionTitleSave={chatPage.handleSaveSessionTitle}
          />
          <ChatMessageList
            isLoading={chatPage.isWorkspaceLoading}
            messages={chatPage.messages}
          />
          <ChatComposer
            isSubmitting={chatPage.isSubmitting}
            quickPrompts={chatPage.quickPrompts}
            value={chatPage.composerText}
            onChange={chatPage.handleComposerTextChange}
            onPromptSelect={chatPage.handlePromptSelect}
            onSubmit={chatPage.handleSubmitMessage}
          />
        </section>
      )}

      {chatPage.activeView === 'reminders' && (
        <ReminderReviewView
          form={chatPage.reminderForm}
          isBusy={chatPage.isResourceSubmitting}
          reminders={chatPage.reminders}
          onCancelReminder={chatPage.handleCancelReminder}
          onFormChange={chatPage.handleReminderFormChange}
          onSubmit={chatPage.handleCreateReminder}
        />
      )}

      {chatPage.activeView === 'schedules' && (
        <ScheduleReviewView
          filters={chatPage.scheduleFilters}
          form={chatPage.scheduleForm}
          isBusy={chatPage.isResourceSubmitting}
          schedules={chatPage.schedules}
          onClearForm={chatPage.handleClearScheduleForm}
          onDeleteSchedule={chatPage.handleDeleteSchedule}
          onEditSchedule={chatPage.handleEditSchedule}
          onFiltersChange={chatPage.handleScheduleFiltersChange}
          onRefresh={chatPage.handleRefreshSchedules}
          onSave={chatPage.handleSaveSchedule}
          onFormChange={chatPage.handleScheduleFormChange}
        />
      )}

      {chatPage.activeView === 'memories' && (
        <MemoryReviewView
          form={chatPage.memoryForm}
          isBusy={chatPage.isResourceSubmitting}
          memories={chatPage.memories}
          onClearForm={chatPage.handleClearMemoryForm}
          onDeleteMemory={chatPage.handleDeleteMemory}
          onEditMemory={chatPage.handleEditMemory}
          onFormChange={chatPage.handleMemoryFormChange}
          onSave={chatPage.handleSaveMemory}
        />
      )}

      {chatPage.activeView === 'activity' && (
        <ActivityTimelineView
          activityEvents={chatPage.activityEvents}
          isBusy={chatPage.isResourceSubmitting}
          onRefresh={chatPage.handleRefreshActivityEvents}
        />
      )}

      {chatPage.activeView === 'settings' && (
        <SettingsView
          isBusy={chatPage.isResourceSubmitting}
          systemStatus={chatPage.systemStatus}
          webPush={chatPage.webPush}
          onRegisterWebPush={chatPage.handleRegisterWebPush}
        />
      )}

      <InsightPanel
        activeView={chatPage.activeView}
        activityEvents={chatPage.activityEvents}
        classifications={chatPage.classifications}
        reminders={chatPage.reminders}
        schedules={chatPage.schedules}
        systemStatus={chatPage.systemStatus}
        onViewSelect={chatPage.handleViewSelect}
      />
    </main>
  )
}
