"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/components/auth/auth-provider'
import { signOutUser } from '@/lib/auth'
import { database } from '@/lib/firebase'
import { ref, set, remove } from 'firebase/database'
import { isAdmin } from '@/lib/admin'
import { useToast } from '@/hooks/use-toast'
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Moon, 
  LogOut, 
  Trash2, 
  Download,
  AlertTriangle,
  ExternalLink,
  Crown
} from 'lucide-react'

export default function SettingsPage() {
  const { userProfile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    notifications: {
      likes: true,
      comments: true,
      follows: true,
      mentions: true,
      messages: true,
      posts: true
    },
    privacy: {
      isPrivate: userProfile?.isPrivate || false,
      hideOnlineStatus: userProfile?.hideOnlineStatus || false,
      allowMessages: userProfile?.allowMessages || 'everyone'
    },
    display: {
      theme: 'light'
    }
  })

  const handleSaveSettings = async () => {
    if (!userProfile) return

    setSaving(true)
    try {
      // Update user privacy settings in Firebase
      const userRef = ref(database, `users/${userProfile.uid}`)
      await set(userRef, {
        ...userProfile,
        isPrivate: settings.privacy.isPrivate,
        hideOnlineStatus: settings.privacy.hideOnlineStatus,
        allowMessages: settings.privacy.allowMessages
      })

      // Save notification preferences
      const notificationRef = ref(database, `userSettings/${userProfile.uid}/notifications`)
      await set(notificationRef, settings.notifications)

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated"
      })
    } catch (error) {
      toast({
        title: "Error saving settings",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOutUser()
      toast({ title: "Signed out successfully" })
      router.push('/')
    } catch (error) {
      toast({
        title: "Error signing out",
        variant: "destructive"
      })
    }
  }

  const handleDeleteAccount = async () => {
    if (!userProfile) return

    const confirmed = confirm(
      'Are you sure you want to delete your account? This action cannot be undone. All your posts, messages, and data will be permanently removed.'
    )

    if (!confirmed) return

    const doubleConfirm = prompt(
      'Type "DELETE MY ACCOUNT" to confirm account deletion:'
    )

    if (doubleConfirm !== 'DELETE MY ACCOUNT') {
      toast({
        title: "Account deletion cancelled",
        description: "Account was not deleted"
      })
      return
    }

    setSaving(true)
    try {
      // Remove user data from Firebase
      await remove(ref(database, `users/${userProfile.uid}`))
      await remove(ref(database, `userSettings/${userProfile.uid}`))
      // Note: In production, you'd also need to delete posts, messages, etc.
      
      await signOutUser()
      
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted"
      })
      
      router.push('/')
    } catch (error) {
      toast({
        title: "Error deleting account",
        description: "Please try again or contact support",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const exportData = () => {
    if (!userProfile) return

    const dataToExport = {
      profile: userProfile,
      settings: settings,
      exportDate: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `firegram-data-${userProfile.username}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Data exported",
      description: "Your data has been downloaded"
    })
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="bg-gray-200 h-8 rounded w-48"></div>
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div className="bg-gray-200 h-4 rounded w-32"></div>
              <div className="bg-gray-200 h-10 rounded"></div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!userProfile) {
    return null
  }

  const isAdminUser = isAdmin(userProfile.email)

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <Settings className="w-8 h-8 text-blue-800" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* Account Information */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Username</p>
                <p className="text-sm text-gray-500">@{userProfile.username}</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={`/profile/${userProfile.username}/edit`}>
                  Edit Profile
                </a>
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-gray-500">{userProfile.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {userProfile.isVerified && (
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium">Verified</span>
                </div>
              )}
              
              {userProfile.isAdvancedUser && (
                <div className="flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-600 font-medium">Advanced User</span>
                </div>
              )}
              
              {userProfile.mysteryMartLinked && (
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Business</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notifications
            </CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(settings.notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key} className="capitalize">
                  {key === 'posts' ? 'New posts from followed users' : key}
                </Label>
                <Switch
                  id={key}
                  checked={value}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, [key]: checked }
                    }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Privacy & Security
            </CardTitle>
            <CardDescription>Control who can see your content and contact you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Private Account</Label>
                <p className="text-sm text-gray-500">Only approved followers can see your posts</p>
              </div>
              <Switch
                checked={settings.privacy.isPrivate}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({
                    ...prev,
                    privacy: { ...prev.privacy, isPrivate: checked }
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Hide Online Status</Label>
                <p className="text-sm text-gray-500">Don't show when you're online</p>
              </div>
              <Switch
                checked={settings.privacy.hideOnlineStatus}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({
                    ...prev,
                    privacy: { ...prev.privacy, hideOnlineStatus: checked }
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Who can send you messages?</Label>
              <Select
                value={settings.privacy.allowMessages}
                onValueChange={(value: 'everyone' | 'followers' | 'none') =>
                  setSettings(prev => ({
                    ...prev,
                    privacy: { ...prev.privacy, allowMessages: value }
                  }))
                }
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="followers">Followers Only</SelectItem>
                  <SelectItem value="none">No One</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Moon className="w-5 h-5 mr-2" />
              Display & Appearance
            </CardTitle>
            <CardDescription>Customize how Firegram looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select
                value={settings.display.theme}
                onValueChange={(value) =>
                  setSettings(prev => ({
                    ...prev,
                    display: { ...prev.display, theme: value }
                  }))
                }
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark" disabled>Dark (Coming Soon)</SelectItem>
                  <SelectItem value="auto" disabled>Auto (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Admin Panel Access */}
        {isAdminUser && (
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <Crown className="w-5 h-5 mr-2" />
                Administrator Access
              </CardTitle>
              <CardDescription>System administration and management</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
                <a href="/admin">
                  <Shield className="w-4 h-4 mr-2" />
                  Open Admin Panel
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Data & Privacy */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Data & Privacy</CardTitle>
            <CardDescription>Manage your data and account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={exportData} variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Export My Data
            </Button>

            <Button onClick={handleSignOut} variant="outline" className="w-full justify-start">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-white border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> Deleting your account will permanently remove all your data, 
                including posts, messages, and profile information. This action cannot be undone.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleDeleteAccount}
              disabled={saving}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account Permanently
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="firegram-primary"
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
