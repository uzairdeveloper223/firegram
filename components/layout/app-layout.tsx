"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/components/auth/auth-provider'
import { signOutUser } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { NotificationIndicator } from '@/components/notifications/notification-indicator'
import { 
  Home, 
  Search, 
  MessageCircle, 
  PlusSquare, 
  User, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell
} from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOutUser()
      toast({ title: "Signed out successfully" })
      router.push('/')
    } catch (error) {
      toast({ title: "Error signing out", variant: "destructive" })
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const navigationItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Search, label: 'Search', href: '/search' },
    { icon: PlusSquare, label: 'Create', href: '/create' },
    { icon: MessageCircle, label: 'Messages', href: '/messages' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: User, label: 'Profile', href: `/profile/${userProfile?.username}` },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8">
                <Image
                  src="/favicon.svg"
                  alt="Firegram Logo"
                  width={32}
                  height={32}
                  className="w-full h-full"
                />
              </div>
              <span className="text-xl font-bold text-blue-800 hidden sm:block">Firegram</span>
            </Link>

            {/* Search Bar (Desktop) */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="Search users, posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </form>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {navigationItems.slice(0, 5).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {item.label === 'Notifications' ? (
                    <NotificationIndicator>
                      <item.icon className="h-6 w-6 text-gray-600" />
                    </NotificationIndicator>
                  ) : (
                    <item.icon className="h-6 w-6 text-gray-600" />
                  )}
                </Link>
              ))}

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.profilePicture} />
                      <AvatarFallback className="bg-blue-800 text-white">
                        {userProfile?.fullName?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center space-x-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.profilePicture} />
                      <AvatarFallback className="bg-blue-800 text-white">
                        {userProfile?.fullName?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{userProfile?.fullName}</p>
                      <p className="text-xs text-gray-500">@{userProfile?.username}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${userProfile?.username}`}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>

          {/* Mobile Search */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search users, posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </form>
              
              <div className="space-y-2">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5 text-gray-600" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
                
                <Link
                  href="/settings"
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">Settings</span>
                </Link>
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
                >
                  <LogOut className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center p-2 space-y-1"
            >
              {item.label === 'Notifications' ? (
                <NotificationIndicator>
                  <item.icon className="h-6 w-6 text-gray-600" />
                </NotificationIndicator>
              ) : (
                <item.icon className="h-6 w-6 text-gray-600" />
              )}
              <span className="text-xs text-gray-600">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom padding for mobile navigation */}
      <div className="md:hidden h-20"></div>
    </div>
  )
}
