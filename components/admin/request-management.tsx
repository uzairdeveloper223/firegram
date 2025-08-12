"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  VerificationRequest, 
  AdvancedUserRequest, 
  UnbanRequest,
  processVerificationRequest,
  processAdvancedUserRequest,
  processUnbanRequest
} from '@/lib/admin'
import { ref, get } from 'firebase/database'
import { database } from '@/lib/firebase'
import { 
  Shield, 
  Star,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Loader2,
  Calendar,
  User
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth/auth-provider'

export function RequestManagement() {
  const [verificationRequests, setVerificationRequests] = useState<(VerificationRequest & { id: string })[]>([])
  const [advancedRequests, setAdvancedRequests] = useState<(AdvancedUserRequest & { id: string })[]>([])
  const [unbanRequests, setUnbanRequests] = useState<(UnbanRequest & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [requestType, setRequestType] = useState<'verification' | 'advanced' | 'unban'>('verification')
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    loadAllRequests()
  }, [])

  const loadAllRequests = async () => {
    setLoading(true)
    try {
      const [verificationSnapshot, advancedSnapshot, unbanSnapshot] = await Promise.all([
        get(ref(database, 'verificationRequests')),
        get(ref(database, 'advancedUserRequests')),
        get(ref(database, 'unbanRequests'))
      ])

      // Load verification requests
      if (verificationSnapshot.exists()) {
        const requests = Object.entries(verificationSnapshot.val()).map(([id, data]) => ({
          id,
          ...(data as VerificationRequest)
        })).sort((a, b) => b.submittedAt - a.submittedAt)
        setVerificationRequests(requests)
      }

      // Load advanced user requests
      if (advancedSnapshot.exists()) {
        const requests = Object.entries(advancedSnapshot.val()).map(([id, data]) => ({
          id,
          ...(data as AdvancedUserRequest)
        })).sort((a, b) => b.submittedAt - a.submittedAt)
        setAdvancedRequests(requests)
      }

      // Load unban requests
      if (unbanSnapshot.exists()) {
        const requests = Object.entries(unbanSnapshot.val()).map(([id, data]) => ({
          id,
          ...(data as UnbanRequest)
        })).sort((a, b) => b.submittedAt - a.submittedAt)
        setUnbanRequests(requests)
      }
    } catch (error) {
      console.error('Error loading requests:', error)
      toast({
        title: "Error",
        description: "Failed to load requests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (request: any, type: 'verification' | 'advanced' | 'unban') => {
    setSelectedRequest(request)
    setRequestType(type)
    setAdminNotes('')
    setDialogOpen(true)
  }

  const handleProcessRequest = async (action: 'approved' | 'rejected') => {
    if (!selectedRequest || !user) return

    setProcessing(true)
    try {
      switch (requestType) {
        case 'verification':
          await processVerificationRequest(
            selectedRequest.id,
            action,
            user.uid,
            adminNotes.trim() || undefined
          )
          break
        case 'advanced':
          await processAdvancedUserRequest(
            selectedRequest.id,
            action,
            user.uid,
            adminNotes.trim() || undefined
          )
          break
        case 'unban':
          await processUnbanRequest(
            selectedRequest.id,
            action,
            user.uid
          )
          break
      }

      toast({
        title: `Request ${action}`,
        description: `The ${requestType} request has been ${action} successfully.`,
      })

      setDialogOpen(false)
      setSelectedRequest(null)
      loadAllRequests()
    } catch (error) {
      console.error('Error processing request:', error)
      toast({
        title: "Error",
        description: "Failed to process request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const RequestCard = ({ request, type, icon: Icon, title }: any) => (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-gray-900">{request.fullName}</h3>
              {getStatusBadge(request.status)}
            </div>
            <p className="text-sm text-gray-600">@{request.username}</p>
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{request.reason}</p>
            <div className="flex items-center text-xs text-gray-400 mt-2">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDate(request.submittedAt)}
            </div>
            {request.reviewedAt && (
              <div className="flex items-center text-xs text-gray-400 mt-1">
                <User className="w-3 h-3 mr-1" />
                Reviewed {formatDate(request.reviewedAt)}
                {request.notes && (
                  <span className="ml-2 italic">"{request.notes}"</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {request.status === 'pending' && (
          <Button
            onClick={() => openDialog(request, type)}
            variant="outline"
            size="sm"
          >
            Review
          </Button>
        )}
      </div>
    </div>
  )

  const pendingVerificationCount = verificationRequests.filter(r => r.status === 'pending').length
  const pendingAdvancedCount = advancedRequests.filter(r => r.status === 'pending').length
  const pendingUnbanCount = unbanRequests.filter(r => r.status === 'pending').length

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Request Management
          </CardTitle>
          <CardDescription>
            Review and process user requests for verification, advanced status, and unban appeals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Verification</span>
              </div>
              <Badge variant={pendingVerificationCount > 0 ? "default" : "secondary"}>
                {pendingVerificationCount}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-900">Advanced User</span>
              </div>
              <Badge variant={pendingAdvancedCount > 0 ? "default" : "secondary"}>
                {pendingAdvancedCount}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">Unban Appeals</span>
              </div>
              <Badge variant={pendingUnbanCount > 0 ? "default" : "secondary"}>
                {pendingUnbanCount}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Tabs */}
      <Tabs defaultValue="verification" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="verification" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Verification ({verificationRequests.length})</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <Star className="w-4 h-4" />
            <span>Advanced ({advancedRequests.length})</span>
          </TabsTrigger>
          <TabsTrigger value="unban" className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4" />
            <span>Unban ({unbanRequests.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="verification">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Verification Requests</CardTitle>
              <CardDescription>
                Users requesting blue checkmark verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {verificationRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No verification requests</h3>
                  <p className="text-gray-500">No users have requested verification yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verificationRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      type="verification"
                      icon={Shield}
                      title="Verification"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Advanced User Requests</CardTitle>
              <CardDescription>
                Users requesting advanced/premium status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {advancedRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No advanced user requests</h3>
                  <p className="text-gray-500">No users have requested advanced status yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {advancedRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      type="advanced"
                      icon={Star}
                      title="Advanced User"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unban">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Unban Requests</CardTitle>
              <CardDescription>
                Banned users requesting account restoration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unbanRequests.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No unban requests</h3>
                  <p className="text-gray-500">No users have requested to be unbanned yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {unbanRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      type="unban"
                      icon={UserCheck}
                      title="Unban Appeal"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {requestType === 'verification' && <Shield className="w-5 h-5 mr-2 text-blue-600" />}
              {requestType === 'advanced' && <Star className="w-5 h-5 mr-2 text-yellow-600" />}
              {requestType === 'unban' && <UserCheck className="w-5 h-5 mr-2 text-red-600" />}
              Review {requestType === 'verification' ? 'Verification' : requestType === 'advanced' ? 'Advanced User' : 'Unban'} Request
            </DialogTitle>
            <DialogDescription>
              Review and decide on this {requestType} request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">User:</span>
                  <span>{selectedRequest.fullName} (@{selectedRequest.username})</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Submitted:</span>
                  <span>{formatDate(selectedRequest.submittedAt)}</span>
                </div>
                <div>
                  <span className="font-medium">Reason:</span>
                  <p className="mt-1 text-sm bg-white p-2 rounded border">
                    {selectedRequest.reason}
                  </p>
                </div>
              </div>
              
              {(requestType === 'verification' || requestType === 'advanced') && (
                <div>
                  <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
                  <Textarea
                    id="admin-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add any notes or feedback for this decision..."
                    className="min-h-[80px]"
                  />
                </div>
              )}
              
              <div className="flex items-start space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Review Carefully</p>
                  <p className="text-amber-700">
                    {requestType === 'verification' && 'Verification gives users a blue checkmark badge and enhanced credibility.'}
                    {requestType === 'advanced' && 'Advanced status provides premium features including post boosting and enhanced analytics.'}
                    {requestType === 'unban' && 'Approving this request will immediately restore the user\'s access to their account.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleProcessRequest('rejected')}
              disabled={processing}
              variant="destructive"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Reject
            </Button>
            <Button
              onClick={() => handleProcessRequest('approved')}
              disabled={processing}
              variant="default"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
