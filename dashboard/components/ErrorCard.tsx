import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface ErrorCardProps {
  message: string
  onRetry?: () => void
}

export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="p-6 flex items-start gap-4">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium mb-1">Something went wrong</p>
          <p className="text-xs text-muted-foreground mb-3">{message}</p>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
