import { useEffect } from 'react'
import { toast } from 'sonner'

export function FeedbackToastBridge() {
  useEffect(() => {
    const showFeedback = (element: Element) => {
      if (element.closest('[data-sonner-toaster]')) return
      const message = element.textContent?.trim()
      if (!message || message.length > 600) return
      const alreadyVisible = [...document.querySelectorAll('[data-sonner-toast]')]
        .some((toastElement) => toastElement.textContent?.trim() === message)
      if (alreadyVisible) return
      const id = `feedback-${message}`
      if (element.getAttribute('role') === 'status') toast.success(message, { id })
      else toast.error(message, { id })
    }
    const scan = (node: Node) => {
      const element = node instanceof Element ? node : node.parentElement
      if (!element) return
      const feedback = element.closest('[role="alert"], [role="status"]')
      if (feedback) showFeedback(feedback)
      if (element.matches('[role="alert"], [role="status"]')) showFeedback(element)
      element.querySelectorAll('[role="alert"], [role="status"]').forEach(showFeedback)
    }
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === 'childList') record.addedNodes.forEach(scan)
        else scan(record.target)
      })
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [])
  return null
}
