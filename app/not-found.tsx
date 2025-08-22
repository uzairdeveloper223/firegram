"use client"

import Link from "next/link"
import Image from "next/image"
import { Home, ArrowLeft, Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
      <div className="text-center max-w-md w-full firegram-fade-in">
        <Card className="border-2 border-muted-foreground/20">
          <CardContent className="p-8">
            {/* Firegram Logo */}
            <div className="mb-6 flex justify-center firegram-fade-in">
              <div className="bg-blue-800 rounded-2xl p-6">
                <Image
                  src="/favicon.svg"
                  alt="Firegram Logo"
                  width={64}
                  height={64}
                  className="h-16 w-16"
                />
              </div>
            </div>

            {/* Error Message */}
            <div className="firegram-fade-in">
              <h1 className="text-6xl font-bold text-blue-800 mb-4">404</h1>
              <h2 className="text-2xl font-semibold mb-2">Content Not Found</h2>
              <p className="text-muted-foreground mb-8">
                The page or content you're looking for doesn't exist on Firegram. 
                It might have been removed, moved, or you may have entered an incorrect URL.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 firegram-fade-in">
              <Button asChild className="w-full firegram-primary hover:bg-blue-900 transition-colors">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Feed
                </Link>
              </Button>
              
              <div className="flex gap-2">
                <Button variant="outline" asChild className="flex-1 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  <Link href="/search">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Link>
                </Button>
                
                <Button variant="outline" asChild className="flex-1 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  <Link href="javascript:history.back()">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                  </Link>
                </Button>
              </div>

              <Button variant="outline" asChild className="w-full hover:bg-blue-50 hover:border-blue-200 transition-colors">
                <Link href="/profile">
                  <Users className="mr-2 h-4 w-4" />
                  Explore Profiles
                </Link>
              </Button>
            </div>

            {/* Social Quote */}
            <div className="mt-8 pt-6 border-t border-muted-foreground/20 firegram-fade-in">
              <p className="text-sm text-muted-foreground italic">
                "Every connection starts with finding the right path."
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