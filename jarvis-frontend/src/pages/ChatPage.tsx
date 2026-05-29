import { ActivityTimelineView } from '../components/ActivityTimelineView'
import { ChatComposer } from '../components/ChatComposer'
import { ChatHeader } from '../components/ChatHeader'
import { ChatMessageList } from '../components/ChatMessageList'
import { InsightPanel } from '../components/InsightPanel'
import { LoginView } from '../components/LoginView'
import { MemoryReviewView } from '../components/MemoryReviewView'
import { MobileWorkspaceNav } from '../components/MobileWorkspaceNav'
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
        onCreateSession={chatPage.handleCreateSession}
        onDeleteSession={chatPage.handleDeleteSession}
        onLogout={chatPage.handleLogout}
        onSessionSelect={chatPage.handleSessionSelect}
        onViewSelect={chatPage.handleViewSelect}
      />
      <MobileWorkspaceNav
        activeSessionId={chatPage.activeSessionId}
        activeView={chatPage.activeView}
        isBusy={chatPage.isResourceSubmitting}
        sessionTitleDraft={chatPage.sessionTitleDraft}
        sessions={chatPage.sessions}
        systemStatus={chatPage.systemStatus}
        user={chatPage.user}
        onCreateSession={chatPage.handleCreateSession}
        onDeleteSession={chatPage.handleDeleteSession}
        onLogout={chatPage.handleLogout}
        onSessionSelect={chatPage.handleSessionSelect}
        onSessionTitleDraftChange={chatPage.handleSessionTitleDraftChange}
        onSessionTitleSave={chatPage.handleSaveSessionTitle}
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
            executionModes={chatPage.executionModes}
            isSubmitting={chatPage.isSubmitting}
            quickPrompts={chatPage.quickPrompts}
            selectedExecutionMode={chatPage.selectedExecutionMode}
            value={chatPage.composerText}
            onChange={chatPage.handleComposerTextChange}
            onExecutionModeChange={chatPage.handleExecutionModeChange}
            onPromptSelect={chatPage.handlePromptSelect}
            onSubmit={chatPage.handleSubmitMessage}
          />
        </section>
      )}

      {chatPage.activeView === 'reminders' && (
        <ReminderReviewView
          calendar={chatPage.reminderCalendar}
          form={chatPage.reminderForm}
          isBusy={chatPage.isResourceSubmitting}
          reminders={chatPage.reminders}
          editorMode={chatPage.reminderEditorMode}
          viewMode={chatPage.reminderViewMode}
          onCalendarMonthChange={chatPage.handleReminderCalendarMonthChange}
          onCancelReminder={chatPage.handleCancelReminder}
          onCloseEditor={chatPage.handleCloseReminderEditor}
          onFormChange={chatPage.handleReminderFormChange}
          onOpenEditor={chatPage.handleOpenReminderEditor}
          onSubmit={chatPage.handleCreateReminder}
          onViewModeChange={chatPage.handleReminderViewModeChange}
        />
      )}

      {chatPage.activeView === 'schedules' && (
        <ScheduleReviewView
          calendar={chatPage.scheduleCalendar}
          filters={chatPage.scheduleFilters}
          form={chatPage.scheduleForm}
          isBusy={chatPage.isResourceSubmitting}
          schedules={chatPage.schedules}
          editorMode={chatPage.scheduleEditorMode}
          viewMode={chatPage.scheduleViewMode}
          onCalendarMonthChange={chatPage.handleScheduleCalendarMonthChange}
          onCloseEditor={chatPage.handleCloseScheduleEditor}
          onClearForm={chatPage.handleClearScheduleForm}
          onDeleteSchedule={chatPage.handleDeleteSchedule}
          onEditSchedule={chatPage.handleEditSchedule}
          onFiltersChange={chatPage.handleScheduleFiltersChange}
          onOpenEditor={chatPage.handleOpenScheduleEditor}
          onRefresh={chatPage.handleRefreshSchedules}
          onSave={chatPage.handleSaveSchedule}
          onFormChange={chatPage.handleScheduleFormChange}
          onViewModeChange={chatPage.handleScheduleViewModeChange}
        />
      )}

      {chatPage.activeView === 'memories' && (
        <MemoryReviewView
          form={chatPage.memoryForm}
          isBusy={chatPage.isResourceSubmitting}
          memories={chatPage.memories}
          editorMode={chatPage.memoryEditorMode}
          onClearForm={chatPage.handleClearMemoryForm}
          onCloseEditor={chatPage.handleCloseMemoryEditor}
          onDeleteMemory={chatPage.handleDeleteMemory}
          onEditMemory={chatPage.handleEditMemory}
          onFormChange={chatPage.handleMemoryFormChange}
          onOpenEditor={chatPage.handleOpenMemoryEditor}
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
