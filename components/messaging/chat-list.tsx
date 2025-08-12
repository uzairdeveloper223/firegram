"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { FiregramChat, FiregramUser } from '@/lib/types'
import { database } from '@/lib/firebase'
import { ref, get } from 'firebase/database'
import { Search, Plus, Users, MessageCircle } from 'lucide-react'

interface ChatListProps {
  chats: FiregramChat[]
  selectedChatId: string | null
  onSelectChat: (chatId: string) => void
  currentUserId: string
  loading: boolean
}

export function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
  currentUserId,
  loading
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true
    
    if (chat.type === 'group') {
      return chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
    }
    
    // For private chats, we'd need to search by participant names
    // This would require loading user data for participants
    return true
  })

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Messages</h2>
            <Button size="sm" className="firegram-primary">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value=""
              className="pl-10"
              disabled
            />
          </div>
        </div>

        {/* Loading skeleton */}
        <div className="flex-1 p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center space-x-3 p-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="bg-gray-200 h-4 rounded w-32"></div>
                <div className="bg-gray-200 h-3 rounded w-48"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Messages</h2>
          <Button size="sm" className="firegram-primary">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Messages Yet</h3>
            <p className="text-gray-500 mb-4">
              Start a conversation with someone or create a group chat
            </p>
            <Button className="firegram-primary">
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isSelected={selectedChatId === chat.id}
                onSelect={() => onSelectChat(chat.id!)}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ChatListItemProps {
  chat: FiregramChat
  isSelected: boolean
  onSelect: () => void
  currentUserId: string
}

function ChatListItem({ chat, isSelected, onSelect, currentUserId }: ChatListItemProps) {
  const [otherUser, setOtherUser] = useState<any>(null)

  // Fetch other user data for private chats
  useEffect(() => {
    const fetchOtherUser = async () => {
      if (chat.type === 'private' && chat.participants.length === 2) {
        const otherUserId = chat.participants.find(id => id !== currentUserId)
        if (otherUserId) {
          try {
            const userRef = ref(database, `users/${otherUserId}`)
            const snapshot = await get(userRef)
            if (snapshot.exists()) {
              setOtherUser({
                uid: otherUserId,
                ...snapshot.val()
              })
            }
          } catch (error) {
            console.error('Error fetching other user:', error)
          }
        }
      }
    }

    fetchOtherUser()
  }, [chat.participants, chat.type, currentUserId])

  const getChatDisplayInfo = () => {
    if (chat.type === 'group') {
      return {
        name: chat.name || 'Group Chat',
        avatar: null, // Could show group avatar
        subtitle: `${chat.participants.length} members`
      }
    } else {
      // For private chats, show the other participant's info
      if (otherUser) {
        return {
          name: otherUser.fullName || otherUser.username || 'Private Chat',
          avatar: otherUser.profilePicture,
          subtitle: `@${otherUser.username}`
        }
      }
      return {
        name: 'Private Chat',
        avatar: null,
        subtitle: 'Loading...'
      }
    }
  }

  const { name, avatar, subtitle } = getChatDisplayInfo()
  const lastMessageTime = chat.lastMessageAt
    ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <button
      onClick={onSelect}
      className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-r-2 border-blue-600' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="w-12 h-12">
            <AvatarImage src={avatar || undefined} />
            <AvatarFallback className="bg-blue-800 text-white">
              {chat.type === 'group' ? (
                <Users className="w-6 h-6" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          
          {/* Online indicator */}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        </div>

        {/* Chat Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-gray-900 truncate">
              {name}
            </h3>
            <span className="text-xs text-gray-500">
              {lastMessageTime}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 truncate">
              {subtitle}
            </p>
            
            {/* Badges */}
            <div className="flex items-center space-x-1">
              {chat.isMuted && (
                <Badge variant="outline" className="text-xs">
                  Muted
                </Badge>
              )}
              
              {chat.isAdvancedOnly && (
                <Badge className="advanced-user-indicator text-xs">
                  Advanced
                </Badge>
              )}
              
              {/* Unread count would go here */}
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
