"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AdminSettings, setMaintenanceMode } from '@/lib/admin'
import { useToast } from '@/hooks/use-toast'
import { Wrench, Clock, AlertTriangle, Save } from 'lucide-react'

interface MaintenanceControlProps {
  settings: AdminSettings | null
  onSettingsUpdate: (settings: AdminSettings) => void
}

export function MaintenanceControl({ settings, onSettingsUpdate }: MaintenanceControlProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    enabled: settings?.maintenanceMode.enabled || false,
    message: settings?.maintenanceMode.message || 'Firegram is currently under maintenance. Please check back soon!',
    durationHours: '2'
  })

  const handleToggleMaintenance = async () => {
    setLoading(true)
    try {
      const durationHours = formData.enabled ? undefined : parseFloat(formData.durationHours)
      
      await setMaintenanceMode(
        !formData.enabled,
        formData.message,
        durationHours
      )

      setFormData(prev => ({ ...prev, enabled: !prev.enabled }))
      
      toast({
        title: !formData.enabled ? "Maintenance mode enabled" : "Maintenance mode disabled",
        description: !formData.enabled 
          ? `Maintenance scheduled for ${formData.durationHours} hours`
          : "Users can now access the application"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update maintenance mode",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMessage = async () => {
    if (!formData.enabled) return

    setLoading(true)
    try {
      await setMaintenanceMode(true, formData.message)
      
      toast({
        title: "Message updated",
        description: "Maintenance message has been updated"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getMaintenanceStatus = () => {
    if (!settings?.maintenanceMode.enabled) {
      return {
        status: 'Operational',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        description: 'All systems are running normally'
      }
    }

    if (settings.maintenanceMode.endTime) {
      const now = new Date()
      const utcPlus5 = new Date(now.getTime() + (5 * 60 * 60 * 1000))
      const endTime = new Date(settings.maintenanceMode.endTime)
      
      if (utcPlus5.getTime() > endTime.getTime()) {
        return {
          status: 'Ending Soon',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          description: 'Maintenance period has expired, will end automatically'
        }
      }

      return {
        status: 'Scheduled Maintenance',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        description: `Maintenance active until ${endTime.toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}`
      }
    }

    return {
      status: 'Indefinite Maintenance',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Maintenance mode active without end time'
    }
  }

  const status = getMaintenanceStatus()

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wrench className="w-5 h-5 mr-2" />
            Maintenance Status
          </CardTitle>
          <CardDescription>Current system maintenance state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border-2" style={{ 
            borderColor: status.color.replace('text-', '').replace('-600', '-200'),
            backgroundColor: status.bgColor.replace('bg-', '').replace('-100', '-50')
          }}>
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${status.bgColor.replace('-100', '-600')}`}></div>
              <div>
                <p className={`font-medium ${status.color}`}>{status.status}</p>
                <p className="text-sm text-gray-600">{status.description}</p>
              </div>
            </div>
            
            <Button
              onClick={handleToggleMaintenance}
              disabled={loading}
              variant={settings?.maintenanceMode.enabled ? "destructive" : "default"}
              className={!settings?.maintenanceMode.enabled ? "firegram-primary" : ""}
            >
              {loading ? "Updating..." : settings?.maintenanceMode.enabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Configuration */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Maintenance Configuration</CardTitle>
          <CardDescription>Configure maintenance mode settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Maintenance Message */}
          <div>
            <Label htmlFor="maintenance-message">Maintenance Message</Label>
            <Textarea
              id="maintenance-message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Enter the message users will see during maintenance..."
              className="mt-2"
              rows={4}
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-500">{formData.message.length}/500 characters</p>
              {settings?.maintenanceMode.enabled && (
                <Button
                  onClick={handleUpdateMessage}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Update Message
                </Button>
              )}
            </div>
          </div>

          {/* Duration Settings */}
          <div>
            <Label htmlFor="duration">Maintenance Duration (Hours)</Label>
            <Input
              id="duration"
              type="number"
              min="0.5"
              max="72"
              step="0.5"
              value={formData.durationHours}
              onChange={(e) => setFormData(prev => ({ ...prev, durationHours: e.target.value }))}
              className="mt-2 max-w-xs"
              placeholder="2"
            />
            <p className="text-sm text-gray-500 mt-1">
              Set to 0 for indefinite maintenance (manual disable required)
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => {
                setFormData(prev => ({ ...prev, durationHours: '0.5' }))
                if (!settings?.maintenanceMode.enabled) {
                  handleToggleMaintenance()
                }
              }}
              variant="outline"
              disabled={loading}
            >
              <Clock className="w-4 h-4 mr-2" />
              30 Minutes
            </Button>
            
            <Button
              onClick={() => {
                setFormData(prev => ({ ...prev, durationHours: '2' }))
                if (!settings?.maintenanceMode.enabled) {
                  handleToggleMaintenance()
                }
              }}
              variant="outline"
              disabled={loading}
            >
              <Clock className="w-4 h-4 mr-2" />
              2 Hours
            </Button>
            
            <Button
              onClick={() => {
                setFormData(prev => ({ ...prev, durationHours: '0' }))
                if (!settings?.maintenanceMode.enabled) {
                  handleToggleMaintenance()
                }
              }}
              variant="outline"
              disabled={loading}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Indefinite
            </Button>
          </div>

          {/* Warning */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Warning:</strong> Enabling maintenance mode will make the application 
              inaccessible to all users except administrators. Users will see the maintenance 
              screen with your custom message and countdown timer.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Maintenance History */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Recent Maintenance</CardTitle>
          <CardDescription>Maintenance activity history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Wrench className="w-8 h-8 mx-auto mb-2" />
            <p>Maintenance history will be displayed here</p>
            <p className="text-sm">Feature coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
