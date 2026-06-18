import { useState, type ComponentType, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'

// ConfirmDialog is the shared "are you sure?" flow: a trigger opens a dialog with
// a Cancel and a confirm button that spins while `onConfirm` runs, closes on
// success, and surfaces `errorToast` on failure. `onConfirm` owns the success
// toast (so it can phrase it from the result, e.g. "Cleared 3 deployments") and
// any follow-up callback. For an irreversible delete, ConfirmDeleteDialog adds a
// type-the-name guard on top of the same idea.
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  confirmIcon: Icon,
  confirmVariant = 'destructive',
  confirmClassName,
  cancelLabel = 'Cancel',
  errorToast,
  onConfirm,
}: {
  trigger: ReactNode
  title: ReactNode
  description: ReactNode
  confirmLabel: string
  confirmIcon?: ComponentType<{ className?: string }>
  confirmVariant?: 'default' | 'secondary' | 'destructive'
  confirmClassName?: string
  cancelLabel?: string
  errorToast: string
  onConfirm: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    setPending(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch (err) {
      toast(errorMessage(err, errorToast), 'error')
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <Button
            variant={confirmVariant}
            className={confirmClassName}
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : Icon ? (
              <Icon className="size-4" />
            ) : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
