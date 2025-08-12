"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Copy, RefreshCw, UserPlus, Users, X, Search } from 'lucide-react'
import { FiregramChat, FiregramUser } from '@/lib/types'
import { updateGroupSettings, createGroupInviteLink } from '@/lib/advanced-messaging'
import { searchUsers } from '@/lib/search'
import { removeUserFromGroup } from '@/lib/messaging'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'

interface GroupSettingsDialogProps {
  chat: FiregramChat
  currentUserId: string
  onUpdate?: () => void
}

export function GroupSettingsDialog({ chat, currentUserId, onUpdate }: GroupSettingsDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Settings state
  const [bannedWords, setBannedWords] = useState(chat.bannedWords?.join(', ') || '')
  const [kickBehavior, setKickBehavior] = useState<'kick' | 'temp_kick'>(chat.kickBehavior || 'kick')
  const [tempKickDuration, setTempKickDuration] = useState(chat.tempKickDuration || 24)
  const [postsDisabled, setPostsDisabled] = useState(chat.postsDisabled || false)
  const [inviteLink, setInviteLink] = useState(chat.inviteLink || '')
  
  // Member management state
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FiregramUser[]>([])
  const [searching, setSearching] = useState(false)
  const [participantUsers, setParticipantUsers] = useState<{[key: string]: FiregramUser}>({})
  const [loadingParticipants, setLoadingParticipants] = useState(false)

  const isAdmin = chat.adminIds?.includes(currentUserId) || false

  // Fetch participant user data
  useEffect(() => {
    const fetchParticipantUsers = async () => {
      if (chat.participants.length === 0) return
      
      setLoadingParticipants(true)
      try {
        const { database } = await import('@/lib/firebase')
        const { ref, get } = await import('firebase/database')
        
        const userPromises = chat.participants.map(async (participantId) => {
          const userRef = ref(database, `users/${participantId}`)
          const snapshot = await get(userRef)
          if (snapshot.exists()) {
            return {
              [participantId]: {
                uid: participantId,
                ...snapshot.val()
              }
            }
          }
          return {
            [participantId]: {
              uid: participantId,
              username: participantId,
              fullName: 'Unknown User'
            }
          }
        })
        
        const userResults = await Promise.all(userPromises)
        const usersMap = userResults.reduce((acc, userObj) => ({ ...acc, ...userObj }), {})
        
        setParticipantUsers(usersMap)
      } catch (error) {
        console.error('Error fetching participant users:', error)
      } finally {
        setLoadingParticipants(false)
      }
    }
    
    fetchParticipantUsers()
  }, [chat.participants])

  // Search users for adding to group
  useEffect(() => {
    const searchUsersFunc = async () => {
      if (userSearchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }

      setSearching(true)
      try {
        const results = await searchUsers(userSearchQuery)
        setSearchResults(results.filter((user: FiregramUser) => 
          !chat.participants.includes(user.uid)
        ))
      } catch (error) {
        console.error('Error searching users:', error)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }

    const debounce = setTimeout(searchUsersFunc, 300)
    return () => clearTimeout(debounce)
  }, [userSearchQuery, chat.participants])

  const handleAddMember = async (user: FiregramUser) => {
    try {
      // Add user to group participants
      const { database } = await import('@/lib/firebase')
      const { ref, set, get } = await import('firebase/database')
      
      const chatRef = ref(database, `chats/${chat.id}`)
      const snapshot = await get(chatRef)
      
      if (snapshot.exists()) {
        const chatData = snapshot.val()
        const newParticipants = [...chatData.participants, user.uid]
        
        await set(ref(database, `chats/${chat.id}/participants`), newParticipants)
        
        // Add chat to user's chat list
        await set(ref(database, `userChats/${user.uid}/${chat.id}`), {
          chatId: chat.id,
          joinedAt: Date.now(),
          lastRead: Date.now()
        })
        
        toast({
          title: "Member added",
          description: `${user.username} has been added to the group`
        })
        
        setUserSearchQuery('')
        setSearchResults([])
        onUpdate?.()
      }
    } catch (error) {
      toast({
        title: "Error adding member",
        variant: "destructive"
      })
    }
  }

  const handleRemoveMember = async (userId: string, username: string) => {
    if (!window.confirm(`Remove ${username} from the group?`)) return
    
    try {
      const result = await removeUserFromGroup(chat.id!, userId, currentUserId)
      
      if (result.success) {
        toast({
          title: "Member removed",
          description: `${username} has been removed from the group`
        })
        onUpdate?.()
      } else {
        toast({
          title: "Error removing member",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error removing member",
        variant: "destructive"
      })
    }
  }

  const handleSaveSettings = async () => {
    if (!isAdmin) return

    setLoading(true)
    try {
      const bannedWordsArray = bannedWords
        .split(',')
        .map(word => word.trim())
        .filter(word => word.length > 0)

      const result = await updateGroupSettings(chat.id, currentUserId, {
        bannedWords: bannedWordsArray,
        kickBehavior,
        tempKickDuration,
        postsDisabled
      })

      if (result.success) {
        toast({
          title: "Settings Updated",
          description: "Group settings have been saved successfully."
        })
        onUpdate?.()
        setOpen(false)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update settings",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInviteLink = async () => {
    if (!isAdmin) return

    setLoading(true)
    try {
      const result = await createGroupInviteLink(
        chat.id,
        currentUserId,
        Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        50 // max 50 uses
      )

      if (result.success && result.inviteLink) {
        setInviteLink(result.inviteLink.code)
        toast({
          title: "Invite Link Created",
          description: "New invite link has been generated successfully."
        })
        onUpdate?.()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create invite link",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create invite link",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyInviteLink = () => {
    const fullLink = `${window.location.origin}/messages?invite=${inviteLink}`
    navigator.clipboard.writeText(fullLink)
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard."
    })
  }

  if (!isAdmin) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Group Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Banned Words */}
          <div className="space-y-2">
            <Label htmlFor="bannedWords">Banned Words</Label>
            <Textarea
              id="bannedWords"
              placeholder="Enter banned words separated by commas (e.g., word1, word2, word3)"
              value={bannedWords}
              onChange={(e) => setBannedWords(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-gray-500">
              Users will be automatically kicked when they use these words
            </p>
          </div>

          {/* Kick Behavior */}
          <div className="space-y-2">
            <Label htmlFor="kickBehavior">Violation Action</Label>
            <Select value={kickBehavior} onValueChange={(value: 'kick' | 'temp_kick') => setKickBehavior(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kick">Permanent Kick</SelectItem>
                <SelectItem value="temp_kick">Temporary Kick</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Temp Kick Duration */}
          {kickBehavior === 'temp_kick' && (
            <div className="space-y-2">
              <Label htmlFor="tempKickDuration">Temporary Kick Duration (hours)</Label>
              <Input
                id="tempKickDuration"
                type="number"
                min="1"
                max="168"
                value={tempKickDuration}
                onChange={(e) => setTempKickDuration(parseInt(e.target.value) || 24)}
              />
            </div>
          )}

          {/* Posts Disabled */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Disable Post Sharing</Label>
              <p className="text-xs text-gray-500">
                Prevent users from sharing posts in this group
              </p>
            </div>
            <Switch
              checked={postsDisabled}
              onCheckedChange={setPostsDisabled}
            />
          </div>

          {/* Member Management */}
          <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Manage Members ({chat.participants.length})
            </Label>
            
            {/* Add Members */}
            <div className="space-y-2">
              <Label htmlFor="userSearch">Add Member</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="userSearch"
                  placeholder="Search users to add..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Search Results */}
              {userSearchQuery && (
                <div className="border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                  {searching && (
                    <div className="text-center py-2 text-sm text-gray-500">
                      Searching...
                    </div>
                  )}
                  
                  {searchResults.map((user) => (
                    <div
                      key={user.uid}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={user.profilePicture} />
                          <AvatarFallback className="bg-blue-800 text-white text-xs">
                            {user.fullName?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.username}</p>
                          <p className="text-xs text-gray-500">{user.fullName}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddMember(user)}
                        className="h-7"
                      >
                        <UserPlus className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {!searching && searchResults.length === 0 && (
                    <div className="text-center py-2 text-sm text-gray-500">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Current Members */}
            <div className="space-y-2">
              <Label>Current Members</Label>
              <div className="border rounded-lg p-2 max-h-60 overflow-y-auto space-y-1">
                {loadingParticipants ? (
                  <div className="text-center py-4 text-sm text-gray-500">
                    Loading members...
                  </div>
                ) : (
                  chat.participants.map((participantId) => {
                    const user = participantUsers[participantId]
                    return (
                      <div
                        key={participantId}
                        className="flex items-center justify-between p-2 rounded border-b last:border-b-0"
                      >
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user?.profilePicture} />
                            <AvatarFallback className="bg-gray-800 text-white text-xs">
                              {user?.fullName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || participantId.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {user?.username || participantId}
                            </p>
                            <p className="text-xs text-gray-500">
                              {user?.fullName}
                            </p>
                            {chat.adminIds?.includes(participantId) && (
                              <p className="text-xs text-blue-600">Admin</p>
                            )}
                          </div>
                        </div>
                        {participantId !== currentUserId && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveMember(participantId, user?.username || participantId)}
                            className="h-7"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Invite Link */}
          <div className="space-y-2">
            <Label>Invite Link</Label>
            {inviteLink ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={`${window.location.origin}/messages?invite=${inviteLink}`}
                  readOnly
                  className="flex-1"
                />
                <Button onClick={copyInviteLink} size="sm">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No invite link created yet</p>
            )}
            <Button
              onClick={handleCreateInviteLink}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {inviteLink ? 'Generate New Link' : 'Create Invite Link'}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
