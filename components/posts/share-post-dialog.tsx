"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Share, Send, Users, MessageCircle } from 'lucide-react'
import { FiregramChat, FiregramUser } from '@/lib/types'
import { getUserChats } from '@/lib/messaging'
import { sharePostToChat } from '@/lib/advanced-messaging'
import { getUserFriends } from '@/lib/friends'
import { getCurrentUserProfile } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'

interface SharePostDialogProps {
  postId: string
  currentUserId: string
  children: React.ReactNode
}

export function SharePostDialog({ postId, currentUserId, children }: SharePostDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [chats, setChats] = useState<FiregramChat[]>([])
  const [friends, setFriends] = useState<FiregramUser[]>([])
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (open) {
      loadChatsAndFriends()
    }
  }, [open, currentUserId])

  const loadChatsAndFriends = async () => {
    try {
      // Load user's chats
      const userChats = await getUserChats(currentUserId)
      setChats(userChats)

      // Load friends
      const friendIds = await getUserFriends(currentUserId)
      const friendProfiles = await Promise.all(
        friendIds.map(async (friendId) => {
          const profile = await getCurrentUserProfile(friendId)
          return profile
        })
      )
      setFriends(friendProfiles.filter(Boolean) as FiregramUser[])
    } catch (error) {
      console.error('Error loading chats and friends:', error)
      toast({
        title: "Error",
        description: "Failed to load chats and friends",
        variant: "destructive"
      })
    }
  }

  const handleShareToChat = async (chatId: string) => {
    setLoading(true)
    try {
      const result = await sharePostToChat(postId, chatId, currentUserId, message)

      if (result.success) {
        toast({
          title: "Post Shared",
          description: "Post has been shared successfully."
        })
        setOpen(false)
        setMessage('')
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to share post",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share post",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleShareToFriend = async (friendId: string) => {
    setLoading(true)
    try {
      // Find or create private chat with friend
      const privateChat = chats.find(chat => 
        chat.type === 'private' && 
        chat.participants.length === 2 &&
        chat.participants.includes(friendId)
      )

      if (privateChat) {
        await handleShareToChat(privateChat.id)
      } else {
        // Create new chat with friend
        const { startPrivateChat } = await import('@/lib/messaging')
        const result = await startPrivateChat(currentUserId, friendId)
        
        if (result.success && result.chatId) {
          await handleShareToChat(result.chatId)
        } else {
          throw new Error(result.error || 'Failed to create chat')
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share post to friend",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getChatDisplayName = (chat: FiregramChat): string => {
    if (chat.type === 'group') {
      return chat.name || 'Unnamed Group'
    }
    // For private chats, we'd need to get the other user's name
    return 'Private Chat'
  }

  const filteredChats = chats.filter(chat =>
    getChatDisplayName(chat).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredFriends = friends.filter(friend =>
    friend.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share className="w-5 h-5" />
            <span>Share Post</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Optional Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Add a message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Write something about this post..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-20"
            />
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search chats and friends</Label>
            <Input
              id="search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Chat and Friends List */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Groups */}
            {filteredChats.filter(chat => chat.type === 'group').length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Groups</span>
                </h3>
                <div className="space-y-1">
                  {filteredChats.filter(chat => chat.type === 'group').map((chat) => (
                    <div key={chat.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{getChatDisplayName(chat)}</p>
                          <p className="text-xs text-gray-500">{chat.participants.length} members</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleShareToChat(chat.id)}
                        size="sm"
                        disabled={loading || chat.postsDisabled}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends */}
            {filteredFriends.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>Friends</span>
                </h3>
                <div className="space-y-1">
                  {filteredFriends.map((friend) => (
                    <div key={friend.uid} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={friend.profilePicture} />
                          <AvatarFallback className="text-xs">
                            {friend.fullName?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{friend.fullName}</p>
                          <p className="text-xs text-gray-500">@{friend.username}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleShareToFriend(friend.uid)}
                        size="sm"
                        disabled={loading}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {filteredChats.length === 0 && filteredFriends.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Share className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No chats or friends found</p>
                {searchTerm && (
                  <p className="text-sm">Try adjusting your search terms</p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
