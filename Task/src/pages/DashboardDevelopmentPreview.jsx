import DashboardPage from './DashboardPage.jsx'

// Only loaded by App in Vite development mode; never an authentication bypass.
export default function DashboardDevelopmentPreview() {
  return (
    <DashboardPage
      user={{ name: 'Alex Morgan' }}
      now={new Date(2026, 9, 8, 9)}
      summary={{ total: 24, completed: 16, pending: 8, projectCount: 3, completedThisWeek: 4, onTrackPercent: 92, completedToday: 4 }}
      projects={[
        { id: 'launch', name: 'Product launch', color: 'indigo' },
        { id: 'website', name: 'Website refresh', color: 'blue' },
      ]}
      tasks={[
        { id: 'proposal', title: 'Review project proposal', project: 'Product launch', dueLabel: 'Today', color: 'indigo', status: 'In progress' },
        { id: 'handoff', title: 'Prepare design handoff', project: 'Website refresh', dueLabel: 'Today', color: 'blue', status: 'In progress' },
        { id: 'update', title: 'Send weekly team update', project: 'Team operations', dueLabel: 'Tomorrow', color: 'emerald', status: 'To do' },
      ]}
    />
  )
}
