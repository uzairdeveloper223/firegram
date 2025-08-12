"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createChat, startPrivateChat } from '@/lib/messaging'
import { searchUsers } from '@/lib/search'
import { FiregramUser } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { Plus, Users, MessageCircle, Search, X } from 'lucide-react'

interface NewChatDialogProps {
  currentUserId: string
}

export function NewChatDialog({ currentUserId }: NewChatDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Private chat state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<FiregramUser | null>(null)
  const [searchResults, setSearchResults] = useState<FiregramUser[]>([])
  const [searching, setSearching] = useState(false)

  // Group chat state
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [isAdvancedOnly, setIsAdvancedOnly] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<FiregramUser[]>([])
  const [groupSearchQuery, setGroupSearchQuery] = useState('')
  const [groupSearchResults, setGroupSearchResults] = useState<FiregramUser[]>([])
  const [groupSearching, setGroupSearching] = useState(false)

  const handleStartPrivateChat = async () => {
    if (!selectedUser) return

    setLoading(true)
    try {
      const result = await startPrivateChat(currentUserId, selectedUser.uid)
      
      if (result.success) {
        toast({ title: "Chat started successfully" })
        setOpen(false)
        // Navigate to chat or refresh chat list
      } else {
        toast({
          title: "Failed to start chat",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start chat",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      toast({
        title: "Missing information",
        description: "Please provide a group name and select at least one user",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const result = await createChat({
        type: 'group',
        participants: [currentUserId, ...selectedUsers.map(user => user.uid)],
        name: groupName.trim(),
        description: groupDescription.trim(),
        isAdvancedOnly
      })

      if (result.success) {
        toast({ title: "Group created successfully" })
        setOpen(false)
        resetForm()
      } else {
        toast({
          title: "Failed to create group",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Search users for private chat
  useEffect(() => {
    const searchUsersFunc = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }

      setSearching(true)
      try {
        const results = await searchUsers(searchQuery)
        setSearchResults(results.filter((user: FiregramUser) => user.uid !== currentUserId))
      } catch (error) {
        console.error('Error searching users:', error)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }

    const debounce = setTimeout(searchUsersFunc, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, currentUserId])

  // Search users for group chat
  useEffect(() => {
    const searchUsersFunc = async () => {
      if (groupSearchQuery.trim().length < 2) {
        setGroupSearchResults([])
        return
      }

      setGroupSearching(true)
      try {
        const results = await searchUsers(groupSearchQuery)
        setGroupSearchResults(results.filter((user: FiregramUser) => 
          user.uid !== currentUserId && 
          !selectedUsers.some(selected => selected.uid === user.uid)
        ))
      } catch (error) {
        console.error('Error searching users:', error)
        setGroupSearchResults([])
      } finally {
        setGroupSearching(false)
      }
    }

    const debounce = setTimeout(searchUsersFunc, 300)
    return () => clearTimeout(debounce)
  }, [groupSearchQuery, currentUserId, selectedUsers])

  const addUserToGroup = (user: FiregramUser) => {
    setSelectedUsers(prev => [...prev, user])
    setGroupSearchQuery('')
    setGroupSearchResults([])
  }

  const removeUserFromGroup = (userId: string) => {
    setSelectedUsers(prev => prev.filter(user => user.uid !== userId))
  }

  const resetForm = () => {
    setSearchQuery('')
    setSelectedUser(null)
    setSearchResults([])
    setGroupName('')
    setGroupDescription('')
    setIsAdvancedOnly(false)
    setSelectedUsers([])
    setGroupSearchQuery('')
    setGroupSearchResults([])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="firegram-primary fixed bottom-20 md:bottom-6 right-6 rounded-full w-14 h-14 shadow-lg">
          <Plus className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Start a private chat or create a group conversation
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="private" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="private">Private Chat</TabsTrigger>
            <TabsTrigger value="group">Group Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="private" className="space-y-4">
            {/* Search users */}
            <div>
              <Label htmlFor="user-search">Find User</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="user-search"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* User search results */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searching && (
                <div className="text-center py-4 text-gray-500">
                  <p>Searching...</p>
                </div>
              )}
              
              {searchResults.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.profilePicture} />
                    <AvatarFallback className="bg-blue-800 text-white">
                      {user.fullName?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{user.username}</p>
                    <p className="text-xs text-gray-500">{user.fullName}</p>
                  </div>
                </div>
              ))}
              
              {searchQuery && !searching && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p>No users found</p>
                </div>
              )}
              
              {!searchQuery && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p>Search for users to start a conversation</p>
                </div>
              )}
            </div>

            {/* Selected user */}
            {selectedUser && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedUser.profilePicture} />
                    <AvatarFallback className="bg-blue-800 text-white">
                      {selectedUser.fullName?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedUser.username}</p>
                    <p className="text-sm text-gray-600">{selectedUser.fullName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action button */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStartPrivateChat}
                disabled={!selectedUser || loading}
                className="firegram-primary"
              >
                {loading ? "Starting..." : "Start Chat"}
                <MessageCircle className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            {/* Group info */}
            <div>
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="group-description">Description (Optional)</Label>
              <Textarea
                id="group-description"
                placeholder="What's this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Advanced features */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="advanced-only">Advanced Users Only</Label>
                <p className="text-sm text-gray-500">Only Advanced Users can join this group</p>
              </div>
              <Switch
                id="advanced-only"
                checked={isAdvancedOnly}
                onCheckedChange={setIsAdvancedOnly}
              />
            </div>

            {isAdvancedOnly && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge className="advanced-user-indicator">Advanced</Badge>
                  <span className="text-sm font-medium text-blue-800">Exclusive Group</span>
                </div>
                <p className="text-sm text-blue-700">
                  This group will only be accessible to Advanced Users with premium features.
                </p>
              </div>
            )}

            {/* Add members */}
            <div>
              <Label>Add Members</Label>
              
              {/* Search input */}
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by username..."
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Search results */}
              {groupSearchQuery && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {groupSearching && (
                    <div className="text-center py-2 text-gray-500 text-sm">
                      Searching...
                    </div>
                  )}
                  
                  {groupSearchResults.map((user) => (
                    <div
                      key={user.uid}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => addUserToGroup(user)}
                    >
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
                  ))}
                  
                  {!groupSearching && groupSearchResults.length === 0 && (
                    <div className="text-center py-2 text-gray-500 text-sm">
                      No users found
                    </div>
                  )}
                </div>
              )}

              {/* Selected users */}
              {selectedUsers.length > 0 && (
                <div className="mt-3 space-y-2">
                  <Label className="text-sm text-gray-600">Selected Members ({selectedUsers.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.uid}
                        className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full"
                      >
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={user.profilePicture} />
                          <AvatarFallback className="bg-blue-800 text-white text-xs">
                            {user.fullName?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.username}</span>
                        <button
                          onClick={() => removeUserFromGroup(user.uid)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {selectedUsers.length === 0 && !groupSearchQuery && (
                <div className="mt-2 text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                  <Users className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                  <p className="text-sm text-gray-500">Search and add users to your group</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0 || loading}
                className="firegram-primary"
              >
                {loading ? "Creating..." : "Create Group"}
                <Users className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
