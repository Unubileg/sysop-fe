import { useId, useState, type ReactNode } from 'react'
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
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  trigger,
  confirmName,
  resourceNoun,
  description,
  onConfirm,
  successToast,
  errorToast,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  trigger?: ReactNode
  confirmName: string
  resourceNoun: string
  description: ReactNode
  onConfirm: () => Promise<unknown>
  successToast: string
  errorToast: string
  onSuccess?: () => void
}) {
  const inputId = useId()
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const matches = confirm === confirmName

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) setConfirm('')
  }

  async function handleConfirm() {
    if (!matches || pending) return
    setPending(true)
    try {
      await onConfirm()
      toast(successToast)
      onOpenChange(false)
      onSuccess?.()  
    } catch (err) {
      toast(errorMessage(err, errorToast), 'error')
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label htmlFor={inputId} className="block text-sm text-muted-foreground">
            To confirm, type{' '}
            <span className="font-medium text-foreground">{confirmName}</span> in
            the box below:
          </label>
          <Input
            id={inputId}
            autoComplete="off"
            placeholder={`Enter the ${resourceNoun} name to confirm`}
            value={confirm}
            disabled={pending}
            aria-invalid={confirm.length > 0 && !matches}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleConfirm()
              }
            }}
          />
          {confirm.length > 0 && !matches && (
            <p className="text-xs text-destructive">
              The name doesn't match the {resourceNoun} name.
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!matches || pending}
            onClick={handleConfirm}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete {resourceNoun}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
