"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { AdminSettings, updateAdminSettings } from '@/lib/admin'
import { 
  Settings, 
  Users,
  Shield,
  FileText,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SystemSettingsProps {
  adminSettings: AdminSettings | null
  onSettingsUpdate: () => void
}

export function SystemSettings({ adminSettings, onSettingsUpdate }: SystemSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<AdminSettings>({
    maintenanceMode: {
      enabled: false,
      message: ''
    },
    verificationEnabled: true,
    postModerationEnabled: false,
    registrationEnabled: true
  })
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (adminSettings) {
      setSettings(adminSettings)
      setHasChanges(false)
    }
  }, [adminSettings])

  const handleSettingChange = (key: keyof AdminSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    setHasChanges(true)
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    try {
      // Don't update maintenance mode settings here to avoid conflicts
      const { maintenanceMode, ...settingsToUpdate } = settings
      
      await updateAdminSettings(settingsToUpdate)
      
      toast({
        title: "Settings Updated",
        description: "System settings have been saved successfully.",
      })
      
      setHasChanges(false)
      onSettingsUpdate()
    } catch (error) {
      console.error('Error updating settings:', error)
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetChanges = () => {
    if (adminSettings) {
      setSettings(adminSettings)
      setHasChanges(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            System Settings
          </CardTitle>
          <CardDescription>
            Configure global application settings and features
          </CardDescription>
        </CardHeader>
      </Card>

      {/* User Registration Settings */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            User Registration
          </CardTitle>
          <CardDescription>
            Control who can register new accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="registration-enabled" className="text-base">
                Allow New Registrations
              </Label>
              <p className="text-sm text-gray-500">
                When disabled, new users cannot create accounts
              </p>
            </div>
            <Switch
              id="registration-enabled"
              checked={settings.registrationEnabled}
              onCheckedChange={(checked) => handleSettingChange('registrationEnabled', checked)}
            />
          </div>
          
          {!settings.registrationEnabled && (
            <div className="flex items-start space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-800">Registration Disabled</p>
                <p className="text-orange-700">
                  New users will not be able to create accounts. Existing users can still log in.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Settings */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Verification System
          </CardTitle>
          <CardDescription>
            Manage the user verification process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="verification-enabled" className="text-base">
                Enable Verification Requests
              </Label>
              <p className="text-sm text-gray-500">
                Allow users to submit verification requests for blue checkmarks
              </p>
            </div>
            <Switch
              id="verification-enabled"
              checked={settings.verificationEnabled}
              onCheckedChange={(checked) => handleSettingChange('verificationEnabled', checked)}
            />
          </div>
          
          {!settings.verificationEnabled && (
            <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Verification Disabled</p>
                <p className="text-blue-700">
                  Users cannot submit new verification requests. Existing verified users keep their status.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Moderation Settings */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Content Moderation
          </CardTitle>
          <CardDescription>
            Configure automatic content moderation features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="post-moderation" className="text-base">
                Post Moderation
              </Label>
              <p className="text-sm text-gray-500">
                Require admin approval for all new posts before they become visible
              </p>
            </div>
            <Switch
              id="post-moderation"
              checked={settings.postModerationEnabled}
              onCheckedChange={(checked) => handleSettingChange('postModerationEnabled', checked)}
            />
          </div>
          
          {settings.postModerationEnabled && (
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <FileText className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Post Moderation Active</p>
                <p className="text-yellow-700">
                  All new posts will require admin approval before appearing in feeds. This may slow down user engagement.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Settings Summary */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
          <CardDescription>
            Summary of all active system settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">New Registrations</span>
              <span className={`text-sm font-medium ${
                settings.registrationEnabled ? 'text-green-600' : 'text-red-600'
              }`}>
                {settings.registrationEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Verification System</span>
              <span className={`text-sm font-medium ${
                settings.verificationEnabled ? 'text-green-600' : 'text-red-600'
              }`}>
                {settings.verificationEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Post Moderation</span>
              <span className={`text-sm font-medium ${
                settings.postModerationEnabled ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {settings.postModerationEnabled ? 'Required' : 'Automatic'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Maintenance Mode</span>
              <span className={`text-sm font-medium ${
                adminSettings?.maintenanceMode.enabled ? 'text-orange-600' : 'text-green-600'
              }`}>
                {adminSettings?.maintenanceMode.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Changes */}
      {hasChanges && (
        <Card className="bg-white border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-blue-900">Unsaved Changes</p>
                  <p className="text-sm text-blue-700">You have unsaved changes to system settings</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={resetChanges}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={loading}
                  size="sm"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health Warning */}
      <Card className="bg-white border-amber-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Configuration Notice</p>
              <p className="text-amber-700">
                These settings affect the entire application. Changes take effect immediately and apply to all users. 
                Use maintenance mode when making significant changes that might affect user experience.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
