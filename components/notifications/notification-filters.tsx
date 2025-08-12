"use client"

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Bell, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  AtSign, 
  Mail, 
  Shield,
  Eye
} from 'lucide-react'

interface NotificationFiltersProps {
  activeFilter: 'all' | 'unread' | 'likes' | 'comments' | 'follows' | 'mentions' | 'messages' | 'admin'
  onFilterChange: (filter: 'all' | 'unread' | 'likes' | 'comments' | 'follows' | 'mentions' | 'messages' | 'admin') => void
  counts: {
    all: number
    unread: number
    likes: number
    comments: number
    follows: number
    mentions: number
    messages: number
    admin: number
  }
}

export function NotificationFilters({ activeFilter, onFilterChange, counts }: NotificationFiltersProps) {
  const filters = [
    {
      key: 'all' as const,
      label: 'All',
      icon: Bell,
      count: counts.all,
      color: 'gray'
    },
    {
      key: 'unread' as const,
      label: 'Unread',
      icon: Eye,
      count: counts.unread,
      color: 'blue'
    },
    {
      key: 'likes' as const,
      label: 'Likes',
      icon: Heart,
      count: counts.likes,
      color: 'red'
    },
    {
      key: 'comments' as const,
      label: 'Comments',
      icon: MessageCircle,
      count: counts.comments,
      color: 'green'
    },
    {
      key: 'follows' as const,
      label: 'Follows',
      icon: UserPlus,
      count: counts.follows,
      color: 'purple'
    },
    {
      key: 'mentions' as const,
      label: 'Mentions',
      icon: AtSign,
      count: counts.mentions,
      color: 'yellow'
    },
    {
      key: 'messages' as const,
      label: 'Messages',
      icon: Mail,
      count: counts.messages,
      color: 'blue'
    },
    {
      key: 'admin' as const,
      label: 'Admin',
      icon: Shield,
      count: counts.admin,
      color: 'orange'
    }
  ]

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const IconComponent = filter.icon
            const isActive = activeFilter === filter.key
            
            return (
              <Button
                key={filter.key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterChange(filter.key)}
                className={`flex items-center space-x-2 ${
                  isActive ? 'firegram-primary' : ''
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{filter.label}</span>
                {filter.count > 0 && (
                  <Badge 
                    variant={isActive ? "secondary" : "default"}
                    className="ml-1 h-4 px-1 text-xs"
                  >
                    {filter.count}
                  </Badge>
                )}
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
