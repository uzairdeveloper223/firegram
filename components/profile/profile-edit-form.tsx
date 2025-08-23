"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FiregramUser, UserPrivacySettings } from '@/lib/types'
import { database } from '@/lib/firebase'
import { ref, set } from 'firebase/database'
import { uploadToImgBB } from '@/lib/imgbb'
import { verifyMysteryMartBusiness } from '@/lib/mysterymart'
import { submitVerificationRequest, submitAdvancedUserRequest } from '@/lib/admin'
import { getUserPrivacySettings, updateUserPrivacySettings } from '@/lib/advanced-messaging'
import { useToast } from '@/hooks/use-toast'
import { 
  Save, 
  Upload, 
  Shield, 
  Star, 
  Eye, 
  EyeOff, 
  Users, 
  MessageCircle,
  Store,
  Award,
  Zap,
  UserX,
  Search,
  Ghost,
  Bold
} from 'lucide-react'

interface ProfileEditFormProps {
  user: FiregramUser
}

export function ProfileEditForm({ user }: ProfileEditFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    fullName: user.fullName || '',
    bio: user.bio || '',
    profilePicture: user.profilePicture || '',
    isPrivate: user.isPrivate || false,
    hideOnlineStatus: user.hideOnlineStatus || false,
    allowMessages: user.allowMessages || 'everyone'
  })

  // Advanced privacy settings state
  const [privacySettings, setPrivacySettings] = useState<Partial<UserPrivacySettings>>({
    boldInSearches: false,
    boldInPosts: false,
    boldInComments: false,
    boldInFollowing: false,
    isAnonymous: false,
    hideFromFollowingLists: false,
    hideFromGroupMembers: false
  })

  // Load privacy settings for advanced users
  useEffect(() => {
    if (user.isAdvancedUser) {
      loadPrivacySettings()
    }
  }, [user.isAdvancedUser, user.uid])

  const loadPrivacySettings = async () => {
    try {
      const settings = await getUserPrivacySettings(user.uid)
      if (settings) {
        setPrivacySettings(settings)
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error)
    }
  }

  const handleProfilePictureUpload = async (file: File) => {
    try {
      setLoading(true)
      const result = await uploadToImgBB(file)
      
      if (result.success && result.url) {
        setFormData(prev => ({ ...prev, profilePicture: result.url as string }))
        toast({ title: "Profile picture uploaded successfully" })
      } else {
        toast({
          title: "Failed to upload image",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error uploading image",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    
    try {
      // Update user profile in Firebase
      const updates = {
        fullName: formData.fullName.trim(),
        bio: formData.bio.trim(),
        profilePicture: formData.profilePicture,
        isPrivate: formData.isPrivate,
        hideOnlineStatus: formData.hideOnlineStatus,
        allowMessages: formData.allowMessages
      }

      const userRef = ref(database, `users/${user.uid}`)
      await set(userRef, { ...user, ...updates })

      // Update privacy settings for advanced users
      if (user.isAdvancedUser) {
        await updateUserPrivacySettings(user.uid, privacySettings)
      }

      toast({
        title: "Profile updated successfully",
        description: "Your changes have been saved"
      })

      // Redirect back to profile
      router.push(`/profile/${user.username}`)
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error updating profile",
        description: "Please try again",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerificationRequest = async () => {
    setLoading(true)
    
    try {
      await submitVerificationRequest(
        user.uid,
        user.username,
        user.fullName,
        "I would like to get verified on Firegram"
      )

      toast({
        title: "Verification request submitted",
        description: "We'll review your request and get back to you soon"
      })
    } catch (error) {
      toast({
        title: "Error submitting request",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdvancedUserRequest = async () => {
    setLoading(true)
    
    try {
      await submitAdvancedUserRequest(
        user.uid,
        user.username,
        user.fullName,
        "I would like to upgrade to Advanced User for premium features"
      )

      toast({
        title: "Advanced User request submitted",
        description: "We'll review your request for premium features"
      })
    } catch (error) {
      toast({
        title: "Error submitting request",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const [linkingRequest, setLinkingRequest] = useState<{
    requestId: string
    secureLink: string
    expiresAt: number
    expiresIn: number
  } | null>(null)

  const handleGenerateSecureLink = async () => {
    setLoading(true)

    try {
      // Get current user
      const { getAuth } = await import('firebase/auth')
      const { auth } = await import('../../lib/firebase')
      const authInstance = getAuth()
      const user = authInstance.currentUser

      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to generate secure link",
          variant: "destructive"
        })
        return
      }

      // Get the user's ID token
      const idToken = await user.getIdToken()

      const response = await fetch('/api/generate-secure-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to generate secure link')
      }

      const data = await response.json()

      setLinkingRequest({
        requestId: data.requestId,
        secureLink: data.secureLink,
        expiresAt: data.expiresAt,
        expiresIn: data.expiresIn
      })

      toast({
        title: "Secure link generated",
        description: "Click the link below to automatically link your accounts"
      })
    } catch (error) {
      console.error('Error generating secure link:', error)
      toast({
        title: "Error generating secure link",
        description: "Please try again",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Legacy linking method for fallback
  const handleGenerateLinkingRequest = async () => {
    setLoading(true)

    try {
      // Get current user
      const { getAuth } = await import('firebase/auth')
      const { auth } = await import('../../lib/firebase')
      const authInstance = getAuth()
      const user = authInstance.currentUser

      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to generate linking code",
          variant: "destructive"
        })
        return
      }

      // Get the user's ID token
      const idToken = await user.getIdToken()

      const response = await fetch('/api/generate-linking-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          userId: user.uid
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate linking request')
      }

      const data = await response.json()

      // Convert to new format for compatibility
      setLinkingRequest({
        requestId: data.requestId,
        secureLink: data.directLink,
        expiresAt: data.expiresAt,
        expiresIn: Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1000))
      })

      toast({
        title: "Linking code generated",
        description: "Click the link below to complete the connection"
      })
    } catch (error) {
      console.error('Error generating linking request:', error)
      toast({
        title: "Error generating linking code",
        description: "Please try again",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMysteryMartLink = async () => {
    // Use the old email-based method as fallback
    setLoading(true)

    try {
      const mysteryMartData = await verifyMysteryMartBusiness(user.email)

      if (mysteryMartData.verified) {
        // Update user profile with MysteryMart data
        const userRef = ref(database, `users/${user.uid}`)
        await set(userRef, {
          ...user,
          mysteryMartLinked: true,
          mysteryMartData: mysteryMartData
        })

        toast({
          title: "MysteryMart account linked successfully",
          description: "Your business profile is now connected"
        })
      } else {
        toast({
          title: "No MysteryMart account found",
          description: "Register on MysteryMart first to link your business",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error linking MysteryMart account",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Basic Information */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          
          {/* Profile Picture */}
          <div className="flex items-center space-x-6 mb-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={formData.profilePicture} />
              <AvatarFallback className="bg-blue-800 text-white text-2xl">
                {user.fullName?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <Label htmlFor="profile-picture" className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture
              </Label>
              <Input
                id="profile-picture"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setProfilePictureFile(file)
                    handleProfilePictureUpload(file)
                  }
                }}
                className="max-w-xs"
              />
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG or GIF. Max size 5MB.
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="Enter your full name"
              maxLength={50}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell people about yourself..."
              className="min-h-24"
              maxLength={150}
            />
            <p className="text-xs text-gray-500">
              {formData.bio.length}/150 characters
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Privacy Settings */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
        
        <div className="space-y-4">
          {/* Private Account */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-gray-600" />
                <Label htmlFor="private-account">Private Account</Label>
              </div>
              <p className="text-sm text-gray-500">
                Only approved followers can see your posts
              </p>
            </div>
            <Switch
              id="private-account"
              checked={formData.isPrivate}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: checked }))}
            />
          </div>

          {/* Hide Online Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <EyeOff className="w-4 h-4 text-gray-600" />
                <Label htmlFor="hide-online">Hide Online Status</Label>
              </div>
              <p className="text-sm text-gray-500">
                Don't show when you're online
              </p>
            </div>
            <Switch
              id="hide-online"
              checked={formData.hideOnlineStatus}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hideOnlineStatus: checked }))}
            />
          </div>

          {/* Message Settings */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4 text-gray-600" />
              <Label>Who can send you messages?</Label>
            </div>
            <Select
              value={formData.allowMessages}
              onValueChange={(value: 'everyone' | 'followers' | 'none') => 
                setFormData(prev => ({ ...prev, allowMessages: value }))
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
        </div>
      </div>

      <Separator />

      {/* Advanced Privacy Settings - Only for Advanced Users */}
      {user.isAdvancedUser && (
        <>
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              <span>Advanced Privacy Settings</span>
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Premium</span>
            </h3>
            
            <div className="space-y-4">
              {/* Bold Features */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg space-y-4">
                <h4 className="text-sm font-medium text-gray-800 flex items-center space-x-2">
                  <Bold className="w-4 h-4" />
                  <span>Enhanced Visibility</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="flex items-center space-x-2">
                        <Search className="w-4 h-4 text-gray-600" />
                        <span>Bold in Searches</span>
                      </Label>
                      <p className="text-xs text-gray-500">
                        Stand out in search results
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.boldInSearches || false}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, boldInSearches: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4 text-gray-600" />
                        <span>Bold in Posts</span>
                      </Label>
                      <p className="text-xs text-gray-500">
                        Highlight your posts
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.boldInPosts || false}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, boldInPosts: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4 text-gray-600" />
                        <span>Bold in Comments</span>
                      </Label>
                      <p className="text-xs text-gray-500">
                        Make comments stand out
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.boldInComments || false}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, boldInComments: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span>Bold in Following</span>
                      </Label>
                      <p className="text-xs text-gray-500">
                        Highlight in follower lists
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.boldInFollowing || false}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, boldInFollowing: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Anonymous Mode */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-lg space-y-4">
                <h4 className="text-sm font-medium text-gray-800 flex items-center space-x-2">
                  <Ghost className="w-4 h-4" />
                  <span>Anonymous Mode</span>
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="flex items-center space-x-2">
                        <UserX className="w-4 h-4 text-gray-600" />
                        <span>Enable Anonymous Mode</span>
                      </Label>
                      <p className="text-xs text-gray-500">
                        Reduce your visibility across the platform
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.isAnonymous || false}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, isAnonymous: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span>Hide from Following Lists</span>
                      </Label>
                      <p className="text-xs text-gray-500">
                        Don't appear in other users' following/followers lists
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.hideFromFollowingLists || false}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, hideFromFollowingLists: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4 text-gray-600" />
                        <span>Hide from Group Members</span>
                      </Label>
                      <p className="text-xs text-gray-500">
                        Don't appear in group member lists (still participate)
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.hideFromGroupMembers || false}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, hideFromGroupMembers: checked }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />
        </>
      )}

      {/* Account Upgrades */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Account Features</h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          {/* Verification */}
          {!user.isVerified && (
            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-blue-800">
                  <Shield className="w-5 h-5 mr-2" />
                  Get Verified
                </CardTitle>
                <CardDescription>
                  Get the blue verification badge
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleVerificationRequest}
                  disabled={loading}
                  className="w-full firegram-primary"
                >
                  <Award className="w-4 h-4 mr-2" />
                  Request Verification
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Advanced User */}
          {!user.isAdvancedUser && (
            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-green-800">
                  <Star className="w-5 h-5 mr-2" />
                  Advanced User
                </CardTitle>
                <CardDescription>
                  Unlock premium features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleAdvancedUserRequest}
                  disabled={loading}
                  className="w-full firegram-success"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Request Upgrade
                </Button>
              </CardContent>
            </Card>
          )}

          {/* MysteryMart Integration */}
          {!user.mysteryMartLinked && (
            <Card className="border-purple-200 md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-purple-800">
                  <Store className="w-5 h-5 mr-2" />
                  Link MysteryMart Business
                </CardTitle>
                <CardDescription>
                  Connect your business profile from MysteryMart (works with different emails)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!linkingRequest ? (
                  <div className="space-y-4">
                    <div className="flex space-x-3">
                      <Button
                        onClick={handleGenerateSecureLink}
                        disabled={loading}
                        className="flex-1 firegram-primary"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {loading ? "Generating..." : "One-Click Link"}
                      </Button>
                      <Button
                        onClick={handleMysteryMartLink}
                        disabled={loading}
                        className="flex-1"
                        variant="outline"
                      >
                        <Store className="w-4 h-4 mr-2" />
                        Link with Same Email
                      </Button>
                    </div>
                    <div className="flex space-x-3">
                      <Button
                        onClick={handleGenerateLinkingRequest}
                        disabled={loading}
                        className="flex-1"
                        variant="outline"
                      >
                        <Store className="w-4 h-4 mr-2" />
                        Manual Code Method
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="flex-1"
                      >
                        <a href="https://mystery-mart-app.vercel.app" target="_blank" rel="noopener noreferrer">
                          Register on MysteryMart
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 space-y-3">
                      <div className="text-center">
                        <h4 className="font-medium text-green-900 mb-2 flex items-center justify-center">
                          <Shield className="w-4 h-4 mr-2" />
                          Secure Link Generated
                        </h4>
                        <p className="text-sm text-green-700 mb-3">
                          Click the button below to automatically link your accounts - no code entry required!
                        </p>
                      </div>

                      <div className="text-center">
                        <Button
                          onClick={() => {
                            window.location.href = linkingRequest.secureLink
                          }}
                          className="w-full firegram-primary"
                          size="lg"
                        >
                          <Store className="w-4 h-4 mr-2" />
                          Auto-Link Accounts
                        </Button>
                        <p className="text-xs text-green-600 mt-2">
                          Link expires in {Math.max(0, Math.ceil((linkingRequest.expiresAt - Date.now()) / 60000))} minutes
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setLinkingRequest(null)}
                        variant="outline"
                        className="flex-1"
                      >
                        Generate New Link
                      </Button>
                      <Button
                        onClick={handleMysteryMartLink}
                        disabled={loading}
                        variant="outline"
                        className="flex-1"
                      >
                        Use Email Method
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Separator />

      {/* Save Changes */}
      <div className="flex justify-end space-x-4">
        <Button
          onClick={() => router.push(`/profile/${user.username}`)}
          variant="outline"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="firegram-primary"
        >
          {loading ? (
            "Saving..."
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
