import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { normalizeApiError } from '../api/client.js'
import { deadlineFieldsToIso, deadlineToLocalFields } from '../dashboard/taskDates.js'

function formValuesForTask(task) {
  const deadlineFields = task?.deadline
    ? deadlineToLocalFields(task.deadline)
    : { date: '', time: '' }

  return {
    title: task?.title ?? '',
    content: task?.content ?? '',
    date: deadlineFields.date,
    time: deadlineFields.time,
    priority: task?.priority ?? 'MEDIUM',
    checklist: (task?.checklist ?? []).map((item, index) => ({
      _id: item._id,
      text: item.text ?? '',
      isDone: Boolean(item.isDone),
      order: item.order ?? index,
    })),
  }
}

function PersonalTaskDialog({ task, onClose, onSave, scope = 'personal' }) {
  const [form, setForm] = useState(() => formValuesForTask(task))
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const dialogRef = useRef(null)
  const titleInputRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const organizationScope = scope === 'organization'

  useEffect(() => {
    const previouslyFocused = document.activeElement
    titleInputRef.current?.focus()

    return () => {
      if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateChecklistItem(index, changes) {
    setForm((current) => ({
      ...current,
      checklist: current.checklist.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    }))
  }

  function addChecklistItem() {
    setForm((current) => ({
      ...current,
      checklist: [
        ...current.checklist,
        { text: '', isDone: false, order: current.checklist.length },
      ],
    }))
  }

  function removeChecklistItem(index) {
    setForm((current) => ({
      ...current,
      checklist: current.checklist
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, order) => ({ ...item, order })),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submittingRef.current) return

    const title = form.title.trim()
    if (title.length < 3) {
      setFormError('Task title must be at least 3 characters.')
      return
    }
    if (title.length > 120) {
      setFormError('Task title must be at most 120 characters.')
      return
    }

    const deadlineResult = deadlineFieldsToIso(form.date, form.time)
    if (deadlineResult.error) {
      setFormError(deadlineResult.error)
      return
    }
    if (form.checklist.length > 100) {
      setFormError('A task can have at most 100 checklist items.')
      return
    }
    if (form.checklist.some((item) => !item.text.trim())) {
      setFormError('Each checklist item needs text.')
      return
    }

    const payload = {
      title,
      content: form.content.trim(),
      deadline: deadlineResult.deadline,
      priority: form.priority,
      checklist: form.checklist.map(({ _id, text, isDone, order }) => ({
        ...(_id ? { _id } : {}),
        text: text.trim(),
        isDone,
        order,
      })),
      ...(!task ? { is_org_task: organizationScope } : {}),
    }

    submittingRef.current = true
    setIsSubmitting(true)
    setFormError('')
    try {
      await onSave(payload, task?._id)
      onCloseRef.current()
    } catch (error) {
      setFormError(normalizeApiError(error).message)
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!isSubmitting) onClose()
      return
    }
    if (event.key !== 'Tab') return

    const focusableElements = [
      ...dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
      ),
    ]
    const first = focusableElements[0]
    const last = focusableElements[focusableElements.length - 1]
    if (!first || !last) {
      event.preventDefault()
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const heading = task ? 'Edit task' : 'Create task'

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-4 sm:p-6">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-task-dialog-heading"
        onKeyDown={handleKeyDown}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="personal-task-dialog-heading" className="text-xl font-semibold tracking-tight text-slate-950">
              {heading}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {task
                ? 'Update the details for this task.'
                : `Add the details for your ${organizationScope ? 'organization' : 'personal'} task.`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close task dialog"
            disabled={isSubmitting}
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        <form className="mt-6 space-y-5" noValidate onSubmit={handleSubmit}>
          <div>
            <label htmlFor="personal-task-title" className="mb-2 block text-sm font-medium text-slate-700">
              Task title
            </label>
            <input
              ref={titleInputRef}
              id="personal-task-title"
              type="text"
              required
              disabled={isSubmitting}
              minLength={3}
              maxLength={120}
              autoComplete="off"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="What needs to get done?"
            />
          </div>

          <div>
            <label htmlFor="personal-task-description" className="mb-2 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="personal-task-description"
              disabled={isSubmitting}
              maxLength={5000}
              rows={3}
              value={form.content}
              onChange={(event) => updateField('content', event.target.value)}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="Add task details (optional)"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="personal-task-deadline-date" className="mb-2 block text-sm font-medium text-slate-700">
                Deadline date <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="personal-task-deadline-date"
                type="date"
                disabled={isSubmitting}
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label htmlFor="personal-task-deadline-time" className="mb-2 block text-sm font-medium text-slate-700">
                Deadline time <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="personal-task-deadline-time"
                type="time"
                disabled={isSubmitting}
                value={form.time}
                onChange={(event) => updateField('time', event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="personal-task-priority" className="mb-2 block text-sm font-medium text-slate-700">
              Priority
            </label>
            <select
              id="personal-task-priority"
              disabled={isSubmitting}
              value={form.priority}
              onChange={(event) => updateField('priority', event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <fieldset className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <legend className="text-sm font-medium text-slate-700">Checklist <span className="font-normal text-slate-400">(optional)</span></legend>
              <button
                type="button"
                onClick={addChecklistItem}
                disabled={isSubmitting || form.checklist.length >= 100}
                className="min-h-9 rounded-lg px-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add checklist item
              </button>
            </div>
            {form.checklist.map((item, index) => (
              <div key={item._id ?? `new-${index}`} className="flex items-center gap-2">
                <input
                  id={`personal-task-checklist-done-${index}`}
                  type="checkbox"
                  disabled={isSubmitting}
                  checked={item.isDone}
                  onChange={(event) => updateChecklistItem(index, { isDone: event.target.checked })}
                  className="size-4 shrink-0 accent-indigo-600"
                />
                <label htmlFor={`personal-task-checklist-${index}`} className="sr-only">
                  Checklist item {index + 1}
                </label>
                <input
                  id={`personal-task-checklist-${index}`}
                  type="text"
                  disabled={isSubmitting}
                  maxLength={200}
                  value={item.text}
                  onChange={(event) => updateChecklistItem(index, { text: event.target.value })}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
                <label htmlFor={`personal-task-checklist-done-${index}`} className="sr-only">
                  Mark checklist item {index + 1} complete
                </label>
                <button
                  type="button"
                  aria-label={`Remove checklist item ${index + 1}`}
                  onClick={() => removeChecklistItem(index)}
                  disabled={isSubmitting}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </fieldset>

          {formError ? (
            <p id="personal-task-form-error" role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-live="polite"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Save task'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default PersonalTaskDialog
