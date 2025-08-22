"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { banUser, unbanUser, checkUserBanStatus, UserBan } from '@/lib/admin'
import { ref, get, query, orderByChild, limitToFirst } from 'firebase/database'
import { database } from '@/lib/firebase'
import { FiregramUser } from '@/lib/types'
import { 
  Users, 
  Search,
  Shield,
  Star,
  UserX,
  UserCheck,
  Clock,
  AlertTriangle,
  Loader2,
  MoreHorizontal,
  Calendar
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth/auth-provider'

export function UserManagement() {
  const [users, setUsers] = useState<(FiregramUser & { id: string; banInfo?: UserBan })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<FiregramUser & { id: string; banInfo?: UserBan } | null>(null)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary')
  const [banDuration, setBanDuration] = useState(24)
  const [banLoading, setBanLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const usersRef = ref(database, 'users')
      const snapshot = await get(usersRef)
      
      if (snapshot.exists()) {
        const usersData = snapshot.val()
        const usersList = await Promise.all(
          Object.entries(usersData).map(async ([id, userData]) => {
            const user = userData as FiregramUser
            let banInfo: UserBan | null = null
            
            if (user.isBanned) {
              banInfo = await checkUserBanStatus(id)
            }
            
            return {
              id,
              ...user,
              banInfo: banInfo || undefined
            }
          })
        )
        
        // Sort by creation date (newest first)
        usersList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        setUsers(usersList)
      }
    } catch (error) {
      console.error('Error loading users:', error)
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleBanUser = async () => {
    if (!selectedUser || !user || !banReason.trim()) return

    setBanLoading(true)
    try {
      await banUser(
        selectedUser.id,
        banReason.trim(),
        banType,
        user.uid,
        banType === 'temporary' ? banDuration : undefined
      )
      
      toast({
        title: "User Banned",
        description: `${selectedUser.username} has been ${banType === 'temporary' ? `banned for ${banDuration} hours` : 'permanently banned'}.`,
      })
      
      setBanDialogOpen(false)
      setBanReason('')
      setSelectedUser(null)
      loadUsers()
    } catch (error) {
      console.error('Error banning user:', error)
      toast({
        title: "Error",
        description: "Failed to ban user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setBanLoading(false)
    }
  }

  const handleUnbanUser = async (user: FiregramUser & { id: string; banInfo?: UserBan }) => {
    if (!user.banInfo) return

    setBanLoading(true)
    try {
      await unbanUser(user.id, user.banInfo.id)
      
      toast({
        title: "User Unbanned",
        description: `${user.username} has been unbanned successfully.`,
      })
      
      loadUsers()
    } catch (error) {
      console.error('Error unbanning user:', error)
      toast({
        title: "Error",
        description: "Failed to unban user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setBanLoading(false)
    }
  }

  const openBanDialog = (user: FiregramUser & { id: string; banInfo?: UserBan }) => {
    setSelectedUser(user)
    setBanDialogOpen(true)
    setBanReason('')
    setBanType('temporary')
    setBanDuration(24)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRemainingBanTime = (banInfo: UserBan) => {
    if (banInfo.type === 'permanent') return 'Permanent'
    if (!banInfo.endTime) return 'Indefinite'
    
    const now = new Date()
    const utcPlus5 = new Date(now.getTime() + (5 * 60 * 60 * 1000))
    const remaining = banInfo.endTime - utcPlus5.getTime()
    
    if (remaining <= 0) return 'Expired'
    
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            User Management
          </CardTitle>
          <CardDescription>
            Search, manage, and moderate user accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users by username, name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={loadUsers} variant="outline" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Users className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            All registered users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-800 rounded-full flex items-center justify-center text-white font-bold">
                      {user.fullName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{user.fullName || user.username}</h3>
                        {user.isVerified && <Shield className="w-4 h-4 text-blue-600" />}
                        {user.isAdvancedUser && <Star className="w-4 h-4 text-yellow-600" />}
                        {user.isBanned && <UserX className="w-4 h-4 text-red-600" />}
                      </div>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.createdAt && (
                        <p className="text-xs text-gray-400">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Joined {formatDate(user.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* User Status Badges */}
                    <div className="flex flex-col space-y-1">
                      {user.isVerified && (
                        <Badge variant="default" className="text-xs">Verified</Badge>
                      )}
                      {user.isAdvancedUser && (
                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Advanced</Badge>
                      )}
                      {user.isBanned && user.banInfo && (
                        <Badge variant="destructive" className="text-xs">
                          Banned ({getRemainingBanTime(user.banInfo)})
                        </Badge>
                      )}
                    </div>
                    
                    {/* Action Button */}
                    {user.isBanned && user.banInfo ? (
                      <Button
                        onClick={() => handleUnbanUser(user)}
                        disabled={banLoading}
                        variant="outline"
                        size="sm"
                      >
                        {banLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => openBanDialog(user)}
                        disabled={banLoading || user.email === 'uzairxdev223@gmail.com'}
                        variant="outline"
                        size="sm"
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredUsers.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-500">
                    {searchTerm ? 'Try adjusting your search criteria.' : 'No users have been registered yet.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserX className="w-5 h-5 mr-2 text-red-600" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              Ban {selectedUser?.username} from accessing Firegram. This action will prevent them from logging in.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="ban-type">Ban Type</Label>
              <Select value={banType} onValueChange={(value: 'temporary' | 'permanent') => setBanType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary">Temporary Ban</SelectItem>
                  <SelectItem value="permanent">Permanent Ban</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {banType === 'temporary' && (
              <div>
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="8760"
                  value={banDuration}
                  onChange={(e) => setBanDuration(Number(e.target.value))}
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="reason">Ban Reason *</Label>
              <Textarea
                id="reason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Provide a clear reason for the ban..."
                className="min-h-[80px]"
              />
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Warning</p>
                <p className="text-red-700">
                  This will immediately prevent the user from accessing their account. 
                  {banType === 'permanent' ? ' This action is reversible only by admin intervention.' : ' The ban will automatically expire after the specified duration.'}
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBanUser}
              disabled={banLoading || !banReason.trim()}
              variant="destructive"
            >
              {banLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserX className="w-4 h-4 mr-2" />
              )}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
