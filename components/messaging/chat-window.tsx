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
import { MediaWithFallback } from '@/components/ui/media-with-fallback'
import { CustomVideoPlayer } from '@/components/ui/custom-video-player'
import {
  listenToChatMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markMessagesAsRead
} from '@/lib/messaging'
import { validateFile } from '@/lib/cloudinary-client'
import { uploadFileInChunks } from '@/lib/chunked-upload'
import { addVideoUsage } from '@/lib/video-usage'
import { useToast } from '@/hooks/use-toast'
import { database } from '@/lib/firebase'
import { ref, set, get, remove } from 'firebase/database'
import {
  ArrowLeft,
  Send,
  Image,
  Video,
  MoreVertical,
  Reply,
  Edit,
  Trash2,
  Users,
  Search,
  X,
  ImagePlus,
  Play
} from 'lucide-react'

interface ChatWindowProps {
  chat: FiregramChat
  currentUserId: string
  onBack: () => void
}

interface MediaItem {
  file: File
  preview: string
  type: 'image' | 'video'
  duration?: number
  uploadProgress?: number
  uploading?: boolean
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
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])

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
    
    if ((!newMessage.trim() && mediaItems.length === 0) || sending) return

    // If there are media items, send them instead
    if (mediaItems.length > 0) {
      await handleSendMediaMessage()
      return
    }

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

  const handleMediaUpload = (files: FileList | null) => {
    if (!files) return

    const newMediaItems: MediaItem[] = []
    const maxItems = 5 - mediaItems.length // Max 5 media items for messages

    Array.from(files).slice(0, maxItems).forEach(file => {
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null
      
      if (!type) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported image or video file.`,
          variant: "destructive"
        })
        return
      }

      // Validate file
      const validation = validateFile(file, type)
      if (!validation.valid) {
        toast({
          title: "File validation failed",
          description: `${file.name}: ${validation.error}`,
          variant: "destructive"
        })
        return
      }

      const preview = URL.createObjectURL(file)
      
      newMediaItems.push({
        file,
        preview,
        type,
        uploadProgress: 0,
        uploading: false
      })
    })

    if (newMediaItems.length > 0) {
      setMediaItems(prev => [...prev, ...newMediaItems])
    }
  }

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaItems[index].preview)
    setMediaItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSendMediaMessage = async () => {
    if (mediaItems.length === 0) return

    setSending(true)

    try {
      // Process media items with direct Cloudinary upload
      for (let i = 0; i < mediaItems.length; i++) {
        const mediaItem = mediaItems[i]
        
        // Update upload status
        setMediaItems(prev => {
          const newItems = [...prev]
          newItems[i] = { ...newItems[i], uploading: true, uploadProgress: 0 }
          return newItems
        })

        try {
          // Use chunked upload system (handles large files by splitting into 4MB chunks)
          const result = await uploadFileInChunks(
            mediaItem.file,
            mediaItem.type,
            (progress: number) => {
              // Real-time progress updates
              setMediaItems(prev => {
                const newItems = [...prev]
                newItems[i] = { ...newItems[i], uploadProgress: progress }
                return newItems
              })
            }
          )

          if (result.success && result.url) {
            // Check video usage limits for videos
            if (mediaItem.type === 'video') {
              const duration = result.duration || 10
              const canUpload = await addVideoUsage(currentUserId, duration)

              if (!canUpload) {
                toast({
                  title: "Video limit exceeded",
                  description: "You have exceeded your video upload limit. Please upgrade your account.",
                  variant: "destructive"
                })
                // Mark as failed
                setMediaItems(prev => {
                  const newItems = [...prev]
                  newItems[i] = { ...newItems[i], uploading: false, uploadProgress: 0 }
                  return newItems
                })
                continue
              }
            }

            // Send message with media
            await sendMessage(chat.id!, currentUserId, {
              content: mediaItem.type === 'image' ? 'Image' : 'Video',
              type: mediaItem.type,
              mediaUrl: result.url,
              mediaType: mediaItem.file.type,
              ...(result.duration && { duration: result.duration }),
              replyTo: replyToMessage?.id
            })
            
            // Mark as completed
            setMediaItems(prev => {
              const newItems = [...prev]
              newItems[i] = { ...newItems[i], uploading: false, uploadProgress: 100 }
              return newItems
            })
          } else {
            throw new Error(result.error || "Failed to upload media")
          }
        } catch (uploadError) {
          // Mark as failed
          setMediaItems(prev => {
            const newItems = [...prev]
            newItems[i] = { ...newItems[i], uploading: false, uploadProgress: 0 }
            return newItems
          })
          toast({
            title: "Upload failed",
            description: `Failed to upload ${mediaItem.file.name}`,
            variant: "destructive"
          })
        }
      }

      // Clear media items and reply after successful uploads
      mediaItems.forEach(item => URL.revokeObjectURL(item.preview))
      setMediaItems([])
      setReplyToMessage(null)

    } catch (error) {
      console.error('Error sending media messages:', error)
      toast({
        title: "Error",
        description: "Failed to send media messages",
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

      {/* Media Preview */}
      {mediaItems.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Media to send ({mediaItems.length}/5)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendMediaMessage}
              disabled={sending || mediaItems.some(item => item.uploading)}
            >
              {sending ? "Sending..." : "Send Media"}
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {mediaItems.map((mediaItem, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {mediaItem.type === 'image' ? (
                    <img
                      src={mediaItem.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black relative">
                      <video
                        src={mediaItem.preview}
                        className="w-full h-full object-cover"
                        muted={false}
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white opacity-80" />
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded">
                        Video
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Progress */}
                {mediaItem.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center rounded-lg">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
                    <div className="text-white text-xs font-medium">
                      {mediaItem.uploadProgress || 0}%
                    </div>
                    <div className="w-3/4 bg-gray-600 rounded-full h-1 mt-1">
                      <div
                        className="bg-white h-1 rounded-full transition-all duration-300"
                        style={{ width: `${mediaItem.uploadProgress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Remove Button */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => removeMedia(index)}
                    disabled={mediaItem.uploading}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleMediaUpload(e.target.files)}
          />
          
          <div className="flex space-x-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || mediaItems.length >= 5}
              title="Add media (images/videos)"
            >
              <ImagePlus className="w-4 h-4" />
            </Button>
          </div>

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
            disabled={(!newMessage.trim() && mediaItems.length === 0) || sending || mediaItems.some(item => item.uploading)}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

// Format time for display (simple version)
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
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
              <MediaWithFallback
                src={message.mediaUrl}
                alt="Shared image"
                type="image"
                className="rounded-lg max-w-full h-auto"
              />
            </div>
          ) : message.type === 'video' && message.mediaUrl ? (
            <div className="mb-2 relative">
              <CustomVideoPlayer
                src={message.mediaUrl}
                className="rounded-lg max-w-full h-auto max-h-64"
                autoPlay={true}
                muted={false}
                playsInline={true}
                loop={false}
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
