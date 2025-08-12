"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserBan } from '@/lib/admin'
import { submitUnbanRequest } from '@/lib/admin'
import { useAuth } from '@/components/auth/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { 
  Shield, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  Calendar,
  Timer
} from 'lucide-react'

interface BannedScreenProps {
  ban: UserBan
}

export function BannedScreen({ ban }: BannedScreenProps) {
  const { userProfile } = useAuth()
  const { toast } = useToast()
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [showUnbanRequest, setShowUnbanRequest] = useState(false)
  const [unbanReason, setUnbanReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (ban.type !== 'temporary' || !ban.endTime) return

    const updateTimer = () => {
      const now = new Date()
      const utcPlus5 = new Date(now.getTime() + (5 * 60 * 60 * 1000))
      const endTime = new Date(ban.endTime!)
      
      const timeDiff = endTime.getTime() - utcPlus5.getTime()
      
      if (timeDiff <= 0) {
        setTimeRemaining('Ban expiring soon...')
        // Auto-refresh to check if ban is lifted
        setTimeout(() => window.location.reload(), 5000)
        return
      }
      
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
      
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`)
      } else {
        setTimeRemaining(`${seconds}s`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [ban.endTime, ban.type])

  const handleSubmitUnbanRequest = async () => {
    if (!userProfile || !unbanReason.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a reason for your unban request",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      await submitUnbanRequest(
        userProfile.uid,
        userProfile.username,
        unbanReason.trim(),
        ban.id
      )

      toast({
        title: "Request submitted",
        description: "Your unban request has been submitted for review"
      })

      setShowUnbanRequest(false)
      setUnbanReason('')
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit unban request",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const banDate = new Date(ban.bannedAt).toLocaleString('en-US', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'medium',
    timeStyle: 'short'
  })

  const endDate = ban.endTime ? new Date(ban.endTime).toLocaleString('en-US', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'medium',
    timeStyle: 'short'
  }) : null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-800 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Firegram</h1>
          <Badge variant="destructive" className="bg-red-600">
            <Shield className="w-3 h-3 mr-1" />
            Account {ban.type === 'permanent' ? 'Permanently' : 'Temporarily'} Banned
          </Badge>
        </div>

        {/* Ban Notice */}
        <Card className="bg-white border-red-200">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900 mb-2">
              Your account has been {ban.type === 'permanent' ? 'permanently' : 'temporarily'} banned
            </CardTitle>
            <p className="text-gray-600">
              Your access to Firegram has been restricted due to violations of our community guidelines.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Ban Details */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-900 mb-3 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Reason for Ban
              </h3>
              <p className="text-red-800 bg-white p-3 rounded border">
                {ban.reason}
              </p>
            </div>

            {/* Ban Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar className="w-4 h-4 text-gray-600 mr-2" />
                  <span className="font-medium text-gray-900">Ban Date</span>
                </div>
                <p className="text-gray-700">{banDate}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Timer className="w-4 h-4 text-gray-600 mr-2" />
                  <span className="font-medium text-gray-900">Ban Type</span>
                </div>
                <p className="text-gray-700 capitalize">{ban.type}</p>
              </div>
            </div>

            {/* Temporary Ban Timer */}
            {ban.type === 'temporary' && ban.endTime && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5 text-orange-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Time Remaining</h3>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-4">
                  <div className="text-3xl font-bold text-orange-800 mb-2">
                    {timeRemaining}
                  </div>
                  <p className="text-sm text-orange-600 mb-2">
                    Until ban expires (UTC+5)
                  </p>
                  {endDate && (
                    <p className="text-xs text-orange-500">
                      Ban ends: {endDate}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Appeal Options */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-medium text-gray-900 mb-3">Appeal Options</h4>
              
              {ban.type === 'permanent' ? (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Permanent Ban:</strong> You can request an unban review. 
                    Provide a detailed explanation of why your ban should be lifted.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-orange-200 bg-orange-50">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Temporary Ban:</strong> Your ban will be automatically lifted when the timer expires. 
                    You can also request early unban if you believe this was a mistake.
                  </AlertDescription>
                </Alert>
              )}

              <div className="mt-4">
                {!showUnbanRequest ? (
                  <Button 
                    onClick={() => setShowUnbanRequest(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Request Unban Review
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Explain why your ban should be lifted
                      </label>
                      <Textarea
                        value={unbanReason}
                        onChange={(e) => setUnbanReason(e.target.value)}
                        placeholder="Please provide a detailed explanation of why you believe your ban should be lifted. Be honest and respectful..."
                        className="min-h-32"
                        maxLength={1000}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {unbanReason.length}/1000 characters
                      </p>
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button
                        onClick={handleSubmitUnbanRequest}
                        disabled={!unbanReason.trim() || submitting}
                        className="flex-1 firegram-primary"
                      >
                        {submitting ? "Submitting..." : "Submit Request"}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowUnbanRequest(false)
                          setUnbanReason('')
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Guidelines */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-medium text-gray-900 mb-3">Our Community Guidelines</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  Be respectful to all community members
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  No spam, harassment, or inappropriate content
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  Follow intellectual property rights
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  Report violations to help keep our community safe
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>&copy; 2024 Firegram. All rights reserved.</p>
          <p className="mt-1">
            Questions? Contact us at{' '}
            <a href="mailto:support@firegram.com" className="text-blue-600 hover:text-blue-800">
              support@firegram.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
