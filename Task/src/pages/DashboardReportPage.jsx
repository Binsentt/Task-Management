import { useState } from 'react'
import { Download, Send } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { deadlineToLocalFields } from '../dashboard/taskDates.js'

const quoteCsv = (value) => {
  const text = String(value ?? '')
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export function buildTaskReport(tasks, scope) {
  const completed = tasks.filter((task) => task.status === 'DONE').length
  const inProgress = tasks.filter((task) => task.status === 'IN_PROGRESS').length
  const title = `${scope === 'organization' ? 'Organization' : 'Personal'} task report`
  const details = tasks.slice(0, 50).map((task) => `- ${task.title} (${task.status.replaceAll('_', ' ')})`).join('\n')
  const summary = `${title}\nTotal: ${tasks.length}\nCompleted: ${completed}\nIn progress: ${inProgress}\nTo do: ${tasks.length - completed - inProgress}${details ? `\n\nTasks:\n${details}` : ''}${tasks.length > 50 ? `\n…and ${tasks.length - 50} more. Download the CSV for the full list.` : ''}`
  const lines = [['Title', 'Status', 'Priority', 'Deadline', 'Description'], ...tasks.map((task) => [task.title, task.status, task.priority, task.deadline ? `${deadlineToLocalFields(task.deadline).date} ${deadlineToLocalFields(task.deadline).time}` : '', task.content])]
  return { title, summary, csv: '\uFEFF' + lines.map((line) => line.map(quoteCsv).join(',')).join('\r\n') }
}

function DashboardReportPage() {
  const { tasks = [], loading, error, refreshTasks, scope } = useOutletContext()
  const [message, setMessage] = useState('')
  const report = buildTaskReport(tasks, scope)

  function download() {
    const url = URL.createObjectURL(new Blob([report.csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${scope}-task-report.csv`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function send() {
    setMessage('')
    try {
      if (navigator.share) {
        await navigator.share({ title: report.title, text: report.summary })
        setMessage('Report shared.')
      } else {
        const mailto = `mailto:?subject=${encodeURIComponent(report.title)}&body=${encodeURIComponent(report.summary)}`
        window.location.href = mailto
        setMessage('Your email app is opening with the report.')
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') setMessage('The report could not be shared. You can download it instead.')
    }
  }

  return <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
    <h2 className="text-xl font-semibold text-slate-950">Task report</h2>
    <p className="mt-1 text-sm text-slate-500">Share a summary or download every task as a CSV file.</p>
    {loading ? <p role="status" className="mt-5 text-sm">Loading tasks…</p> : null}
    {error ? <div role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" onClick={refreshTasks} className="font-semibold underline">Retry</button></div> : null}
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-label="Report summary">
      <h3 className="font-semibold text-slate-950">{report.title}</h3>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Total', tasks.length], ['Completed', tasks.filter((task) => task.status === 'DONE').length], ['In progress', tasks.filter((task) => task.status === 'IN_PROGRESS').length], ['To do', tasks.filter((task) => task.status === 'TO_DO').length]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={send} disabled={loading || Boolean(error)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><Send size={16} /> Send report</button>
        <button type="button" onClick={download} disabled={loading || Boolean(error)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold disabled:opacity-50"><Download size={16} /> Download CSV</button>
      </div>
      {message ? <p role="status" className="mt-4 text-sm text-slate-600">{message}</p> : null}
    </section>
  </main>
}

export default DashboardReportPage
