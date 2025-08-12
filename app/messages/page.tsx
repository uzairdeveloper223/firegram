"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { ChatList } from '@/components/messaging/chat-list'
import { ChatWindow } from '@/components/messaging/chat-window'
import { NewChatDialog } from '@/components/messaging/new-chat-dialog'
import { useAuth } from '@/components/auth/auth-provider'
import { FiregramChat } from '@/lib/types'
import { listenToUserChats, startPrivateChat } from '@/lib/messaging'
import { searchUsers } from '@/lib/search'
import { useToast } from '@/hooks/use-toast'

export default function MessagesPage() {
  const { userProfile } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const userParam = searchParams.get('user')
  const inviteParam = searchParams.get('invite')

  const [chats, setChats] = useState<FiregramChat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [processedUserParam, setProcessedUserParam] = useState<string | null>(null)

  useEffect(() => {
    if (!userProfile) return

    // Listen to user's chats
    const unsubscribe = listenToUserChats(userProfile.uid, (userChats) => {
      setChats(userChats)
      setLoading(false)
    })

    return unsubscribe
  }, [userProfile])

  useEffect(() => {
    if (userParam && userProfile && userParam !== processedUserParam) {
      setProcessedUserParam(userParam)
      handleStartChatWithUser(userParam)
    }
    if (inviteParam && userProfile) {
      handleJoinGroupViaInvite(inviteParam)
    }
  }, [userParam, inviteParam, userProfile, processedUserParam])

  const handleJoinGroupViaInvite = async (inviteCode: string) => {
    if (!userProfile) return

    try {
      const { joinGroupViaInvite } = await import('@/lib/advanced-messaging')
      const result = await joinGroupViaInvite(inviteCode, userProfile.uid)

      if (result.success) {
        toast({
          title: "Joined Group",
          description: "You have successfully joined the group"
        })
        
        // Clear the invite parameter
        const url = new URL(window.location.href)
        url.searchParams.delete('invite')
        window.history.replaceState({}, '', url.toString())
        
        // Select the new chat
        if (result.chatId) {
          setSelectedChatId(result.chatId)
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to join group",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join group",
        variant: "destructive"
      })
    }
  }

  const handleStartChatWithUser = async (username: string) => {
    if (!userProfile) return

    try {
      setLoading(true)
      
      // Find user by username using search function
      const users = await searchUsers(username)
      const targetUser = users.find((user: any) => user.username === username)
      
      if (!targetUser) {
        toast({
          title: "User not found",
          description: `User with username "${username}" not found`,
          variant: "destructive"
        })
        return
      }

      // Check if chat already exists
      const existingChat = chats.find(chat => 
        chat.type === 'private' && 
        chat.participants.includes(targetUser.uid) && 
        chat.participants.includes(userProfile.uid)
      )

      if (existingChat) {
        // Chat already exists, just select it
        setSelectedChatId(existingChat.id!)
        toast({
          title: "Chat opened",
          description: `Opened conversation with ${targetUser.fullName || username}`
        })
        return
      }

      // Start private chat
      const result = await startPrivateChat(userProfile.uid, targetUser.uid)
      
      if (result.success) {
        toast({
          title: "Chat started",
          description: `Started conversation with ${targetUser.fullName || username}`
        })
        
        // Find and select the new chat
        if (result.chatId) {
          setSelectedChatId(result.chatId)
        }
      } else {
        toast({
          title: "Failed to start chat",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error starting chat:', error)
      toast({
        title: "Error",
        description: "Failed to start chat",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedChat = chats.find(chat => chat.id === selectedChatId)

  if (!userProfile) {
    return null
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-12rem)] flex bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Chat List */}
        <div className={`w-full md:w-1/4 lg:w-1/5 border-r border-gray-200 ${selectedChatId ? 'hidden md:block' : ''}`}>
          <ChatList
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            currentUserId={userProfile.uid}
            loading={loading}
          />
        </div>

        {/* Chat Window */}
        <div className={`flex-1 ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
          {selectedChat ? (
            <ChatWindow
              chat={selectedChat}
              currentUserId={userProfile.uid}
              onBack={() => setSelectedChatId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Chat</h3>
                <p className="text-gray-500">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewChatDialog currentUserId={userProfile.uid} />
    </AppLayout>
  )
}
