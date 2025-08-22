"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Firegram application error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
      <div className="text-center max-w-md w-full firegram-fade-in">
        <Card className="border-2 border-destructive/20">
          <CardContent className="p-8">
            {/* Error Icon */}
            <div className="mb-6 flex justify-center">
              <div className="bg-destructive/10 rounded-2xl p-6 firegram-fade-in">
                <AlertTriangle className="h-16 w-16 text-destructive" />
              </div>
            </div>

            {/* Error Message */}
            <div className="firegram-fade-in">
              <h1 className="text-6xl font-bold text-destructive mb-4">500</h1>
              <h2 className="text-2xl font-semibold mb-2 text-blue-800">Something Went Wrong</h2>
              <p className="text-muted-foreground mb-6">
                Firegram is experiencing some technical difficulties. 
                Our team is working to restore your premium social experience.
              </p>
            </div>

            {/* Error Details - Development Only */}
            {process.env.NODE_ENV === "development" && (
              <div className="mb-6 firegram-fade-in">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-left">
                    <strong>Error:</strong> {error.message}
                    {error.digest && (
                      <div className="mt-1">
                        <strong>Error ID:</strong> {error.digest}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 firegram-fade-in">
              <Button 
                onClick={reset} 
                className="w-full firegram-primary hover:bg-blue-900 transition-colors"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              
              <div className="flex gap-2">
                <Button variant="outline" asChild className="flex-1 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Link>
                </Button>
                
                <Button variant="outline" asChild className="flex-1 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  <Link href="/settings">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Support
                  </Link>
                </Button>
              </div>
            </div>

            {/* Support Message */}
            <div className="mt-8 pt-6 border-t border-muted-foreground/20 firegram-fade-in">
              <p className="text-sm text-muted-foreground">
                If this problem persists, please reach out to our support team. 
                We're committed to providing you with the best social experience.
              </p>
            </div>

            {/* Firegram Branding */}
            <div className="mt-4 firegram-fade-in">
              <p className="text-xs text-blue-800 font-semibold">
                Firegram - High-End Social Platform
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}