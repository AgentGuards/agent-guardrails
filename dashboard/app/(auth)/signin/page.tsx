"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Shield, Loader2 } from "lucide-react"
import { useSiws } from "@/lib/providers/SiwsContext"
import { useToast } from "@/components/ui/use-toast"

export default function SignInPage() {
  const { connected } = useWallet()
  const { signIn, isLoading, isAuthenticated } = useSiws()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (isAuthenticated) router.push("/agents")
  }, [isAuthenticated, router])

  async function handleSignIn() {
    try {
      await signIn()
      toast({ title: "Signed in", description: "Welcome to Agent Guardrails" })
    } catch (e) {
      toast({ title: "Sign-in failed", description: String(e), variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Connect your wallet to access Agent Guardrails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <WalletMultiButton />
          </div>
          {connected && (
            <Button onClick={handleSignIn} disabled={isLoading} className="w-full">
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</>
              ) : (
                "Sign In with Wallet"
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
