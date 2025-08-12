"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AdminSettings } from '@/lib/admin'
import { Wrench, Clock, AlertTriangle } from 'lucide-react'

interface MaintenanceScreenProps {
  settings: AdminSettings
}

export function MaintenanceScreen({ settings }: MaintenanceScreenProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    if (!settings.maintenanceMode.endTime) return

    const updateTimer = () => {
      const now = new Date()
      const utcPlus5 = new Date(now.getTime() + (5 * 60 * 60 * 1000))
      const endTime = new Date(settings.maintenanceMode.endTime!)
      
      const timeDiff = endTime.getTime() - utcPlus5.getTime()
      
      if (timeDiff <= 0) {
        setTimeRemaining('Maintenance ending soon...')
        return
      }
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
      
      if (hours > 0) {
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
  }, [settings.maintenanceMode.endTime])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-800 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Firegram</h1>
          <Badge variant="outline" className="border-orange-500 text-orange-600">
            <Wrench className="w-3 h-3 mr-1" />
            Under Maintenance
          </Badge>
        </div>

        {/* Maintenance Notice */}
        <Card className="bg-white border-orange-200">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-orange-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900 mb-2">
              We'll be back soon!
            </CardTitle>
            <p className="text-gray-600">
              {settings.maintenanceMode.message}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Countdown Timer */}
            {settings.maintenanceMode.endTime && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Estimated Completion</h3>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
                  <div className="text-3xl font-bold text-blue-800 mb-2">
                    {timeRemaining}
                  </div>
                  <p className="text-sm text-blue-600">
                    Time remaining (UTC+5)
                  </p>
                </div>
                
                <p className="text-sm text-gray-500">
                  Maintenance started: {new Date(settings.maintenanceMode.startTime!).toLocaleString('en-US', {
                    timeZone: 'Asia/Karachi',
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
            )}

            {/* What we're working on */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-medium text-gray-900 mb-3">What we're working on:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  Improving server performance
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  Adding new features
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  Enhancing security
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  Fixing bugs and issues
                </li>
              </ul>
            </div>

            {/* Follow us */}
            <div className="border-t border-gray-200 pt-6 text-center">
              <h4 className="font-medium text-gray-900 mb-3">Stay updated</h4>
              <p className="text-sm text-gray-600 mb-4">
                Follow us for real-time updates and announcements
              </p>
              
              <div className="flex justify-center space-x-4">
                <a 
                  href="https://mystery-mart-app.vercel.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Visit MysteryMart
                </a>
              </div>
            </div>

            {/* Refresh notice */}
            <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
              This page will automatically refresh when maintenance is complete.
              <br />
              If you continue to see this message after the estimated completion time, please refresh your browser.
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>&copy; 2024 Firegram. All rights reserved.</p>
          <p className="mt-1">Thank you for your patience!</p>
        </div>
      </div>
    </div>
  )
}
