"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { FiregramChat, FiregramMessage } from '@/lib/types'
import { SharedPostMessage } from './shared-post-message'
import { GroupSettingsDialog } from './group-settings-dialog'
import { 
  listenToChatMessages, 
  sendMessage, 
  editMessage, 
  deleteMessage, 
  markMessagesAsRead 
} from '@/lib/messaging'
import { uploadToImgBB } from '@/lib/imgbb'
import { useToast } from '@/hooks/use-toast'
import { database } from '@/lib/firebase'
import { ref, set, get, remove } from 'firebase/database'
import { 
  ArrowLeft, 
  Send, 
  Image, 
  MoreVertical, 
  Reply, 
  Edit, 
  Trash2, 
  Users,
  Search,
  
} from 'lucide-react'

interface ChatWindowProps {
  chat: FiregramChat
  currentUserId: string
  onBack: () => void
}

export function ChatWindow({ chat, currentUserId, onBack }: ChatWindowProps) {
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<FiregramMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [replyToMessage, setReplyToMessage] = useState<FiregramMessage | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showChatInfo, setShowChatInfo] = useState(false)
  const [otherUser, setOtherUser] = useState<any>(null)

  useEffect(() => {
    if (!chat.id) return

    // Listen to messages
    const unsubscribe = listenToChatMessages(chat.id, (chatMessages) => {
      setMessages(chatMessages)
      scrollToBottom()
    })

    // Mark messages as read
    markMessagesAsRead(chat.id, currentUserId)

    return unsubscribe
  }, [chat.id, currentUserId])

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

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || sending) return

    setSending(true)
    
    try {
      const result = await sendMessage(chat.id!, currentUserId, {
        content: newMessage.trim(),
        type: 'text',
        replyTo: replyToMessage?.id
      })

      if (result.success) {
        setNewMessage('')
        setReplyToMessage(null)
      } else {
        toast({
          title: "Failed to send message",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    try {
      setSending(true)
      
      const result = await uploadToImgBB(file)
      if (result.success && result.url) {
        await sendMessage(chat.id!, currentUserId, {
          content: 'Image',
          type: 'image',
          mediaUrl: result.url,
          mediaType: file.type
        })
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
      setSending(false)
    }
  }

  const handleEditMessage = async (messageId: string) => {
    if (!editingContent.trim()) return

    try {
      const result = await editMessage(messageId, chat.id!, editingContent.trim(), currentUserId)
      
      if (result.success) {
        setEditingMessageId(null)
        setEditingContent('')
        toast({ title: "Message edited" })
      } else {
        toast({
          title: "Failed to edit message",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error editing message",
        variant: "destructive"
      })
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const result = await deleteMessage(messageId, chat.id!, currentUserId)
      
      if (result.success) {
        toast({ title: "Message deleted" })
      } else {
        toast({
          title: "Failed to delete message",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error deleting message",
        variant: "destructive"
      })
    }
  }

  const handleMuteChat = async () => {
    try {
      // Toggle mute status in user's chat settings
      const userChatRef = ref(database, `userChats/${currentUserId}/${chat.id}/muted`)
      const snapshot = await get(userChatRef)
      const currentMuteStatus = snapshot.val() || false
      
      await set(userChatRef, !currentMuteStatus)
      
      toast({ 
        title: !currentMuteStatus ? "Chat muted" : "Chat unmuted" 
      })
    } catch (error) {
      toast({
        title: "Error updating mute status",
        variant: "destructive"
      })
    }
  }

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) {
      return
    }

    try {
      if (chat.type !== 'group') {
        toast({
          title: "This is not a group chat",
          variant: "destructive"
        })
        return
      }

      // Remove user from group participants
      const chatRef = ref(database, `chats/${chat.id}`)
      const chatSnapshot = await get(chatRef)
      
      if (chatSnapshot.exists()) {
        const chatData = chatSnapshot.val() as FiregramChat
        const newParticipants = chatData.participants.filter(id => id !== currentUserId)
        
        // Update participants list
        await set(ref(database, `chats/${chat.id}/participants`), newParticipants)
        
        // Remove chat from user's chat list
        await remove(ref(database, `userChats/${currentUserId}/${chat.id}`))
        
        // Send system message
        await sendMessage(chat.id!, 'system', {
          content: `${currentUserId} left the group`,
          type: 'text'
        })
        
        toast({ title: "Left group successfully" })
        
        // Navigate back to chat list
        window.history.back()
      }
    } catch (error) {
      toast({
        title: "Error leaving group",
        variant: "destructive"
      })
    }
  }

  const getChatDisplayName = () => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat'
    } else {
      // For private chats, show the other participant's name
      if (otherUser) {
        return otherUser.fullName || otherUser.username || 'Private Chat'
      }
      return 'Private Chat'
    }
  }

  const getParticipantCount = () => {
    if (chat.type === 'group') {
      return `${chat.participants.length} members`
    }
    return 'Online' // Would show online status
  }

  const filteredMessages = searchQuery
    ? messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-blue-800 text-white">
                {chat.type === 'group' ? (
                  <Users className="w-5 h-5" />
                ) : (
                  getChatDisplayName().charAt(0).toUpperCase()
                )}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="font-medium text-gray-900">{getChatDisplayName()}</h3>
              <p className="text-sm text-gray-500">{getParticipantCount()}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-48"
              />
            </div>



            {/* Group Settings - Only for group admins */}
            {chat.type === 'group' && chat.adminIds?.includes(currentUserId) && (
              <GroupSettingsDialog chat={chat} currentUserId={currentUserId} />
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowChatInfo(true)}>
                  View Info
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMuteChat()}>
                  Mute Chat
                </DropdownMenuItem>
                {chat.type === 'group' && (
                  <DropdownMenuItem onClick={() => handleLeaveGroup()}>
                    Leave Group
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {filteredMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.senderId === currentUserId}
            onReply={() => setReplyToMessage(message)}
            onEdit={() => {
              setEditingMessageId(message.id!)
              setEditingContent(message.content)
            }}
            onDelete={() => handleDeleteMessage(message.id!)}
            isEditing={editingMessageId === message.id}
            editingContent={editingContent}
            onEditingContentChange={setEditingContent}
            onSaveEdit={() => handleEditMessage(message.id!)}
            onCancelEdit={() => {
              setEditingMessageId(null)
              setEditingContent('')
            }}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyToMessage && (
        <div className="px-4 py-2 bg-blue-50 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                Replying to {replyToMessage.senderId === currentUserId ? 'yourself' : 'message'}
              </p>
              <p className="text-sm text-blue-600 truncate">
                {replyToMessage.content}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyToMessage(null)}
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImageUpload(file)
            }}
          />
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <Image className="w-4 h-4" />
          </Button>

          <div className="flex-1">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
            />
          </div>

          <Button
            type="submit"
            size="sm"
            className="firegram-primary"
            disabled={!newMessage.trim() || sending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

interface MessageBubbleProps {
  message: FiregramMessage
  isOwn: boolean
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
  isEditing: boolean
  editingContent: string
  onEditingContentChange: (content: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
}

function MessageBubble({
  message,
  isOwn,
  onReply,
  onEdit,
  onDelete,
  isEditing,
  editingContent,
  onEditingContentChange,
  onSaveEdit,
  onCancelEdit
}: MessageBubbleProps) {
  const messageTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })

  if (isEditing) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-xs lg:max-w-md">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <Input
              value={editingContent}
              onChange={(e) => onEditingContentChange(e.target.value)}
              className="mb-2"
            />
            <div className="flex justify-end space-x-1">
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={onSaveEdit}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
      <div className="max-w-xs lg:max-w-md">
        {/* Reply indicator */}
        {message.replyTo && (
          <div className="text-xs text-gray-500 mb-1 px-2">
            Replying to a message
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`relative rounded-lg p-3 ${
            isOwn 
              ? 'message-bubble-sent'
              : 'message-bubble-received'
          }`}
        >
          {/* Message content */}
          {message.type === 'image' && message.mediaUrl ? (
            <div className="mb-2">
              <img
                src={message.mediaUrl}
                alt="Shared image"
                className="rounded-lg max-w-full h-auto"
              />
            </div>
          ) : message.type === 'post_share' && message.sharedPostId ? (
            <div className="mb-2">
              <SharedPostMessage postId={message.sharedPostId} />
            </div>
          ) : null}

          {!message.isDeleted ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <p className="text-sm italic text-gray-500">{message.content}</p>
          )}

          {/* Message footer */}
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xs ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>
              {messageTime}
              {message.isEdited && ' (edited)'}
            </span>

            {/* Message actions */}
            {!message.isDeleted && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onReply}>
                      <Reply className="w-3 h-3 mr-2" />
                      Reply
                    </DropdownMenuItem>
                    {isOwn && (
                      <>
                        <DropdownMenuItem onClick={onEdit}>
                          <Edit className="w-3 h-3 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="text-red-600">
                          <Trash2 className="w-3 h-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
