"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Test-only component for exercising behavior that jsdom cannot model reliably.
 * Delete tests/fixtures/test-dialog.tsx with the browser-component examples when
 * the application has a production dialog worth testing instead.
 */
export function TestDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (isOpen && dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [isOpen])

  function closeDialog() {
    dialogRef.current?.close()
    setIsOpen(false)
  }

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        Review plan
      </button>
      <dialog ref={dialogRef} onCancel={() => setIsOpen(false)}>
        <h2>Confirm plan</h2>
        <label>
          Plan name
          <input autoFocus defaultValue="Balanced growth" />
        </label>
        <button type="button" onClick={closeDialog}>
          Done
        </button>
      </dialog>
    </div>
  )
}
