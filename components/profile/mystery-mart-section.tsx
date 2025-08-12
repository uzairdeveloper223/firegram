"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FiregramUser } from '@/lib/types'
import { MysteryMartVerification, getMysteryMartSellerUrl } from '@/lib/mysterymart'
import { 
  ExternalLink, 
  Store, 
  Star, 
  TrendingUp, 
  Package, 
  Clock,
  Award,
  DollarSign
} from 'lucide-react'

interface MysteryMartSectionProps {
  user: FiregramUser
  isOwnProfile: boolean
}

export function MysteryMartSection({ user, isOwnProfile }: MysteryMartSectionProps) {
  const [mysteryMartData, setMysteryMartData] = useState<MysteryMartVerification | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user.mysteryMartData) {
      setMysteryMartData(user.mysteryMartData)
      setLoading(false)
    }
  }, [user.mysteryMartData])

  if (loading) {
    return (
      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="bg-gray-200 h-6 rounded w-48 mb-4"></div>
            <div className="space-y-2">
              <div className="bg-gray-200 h-4 rounded"></div>
              <div className="bg-gray-200 h-4 rounded w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!mysteryMartData || !mysteryMartData.verified) {
    return null
  }

  const sellerUrl = mysteryMartData.username ? getMysteryMartSellerUrl(mysteryMartData.username) : null

  return (
    <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-green-800">
          <Store className="w-5 h-5" />
          <span>MysteryMart Business Profile</span>
          <Badge className="bg-green-600 text-white">
            <Award className="w-3 h-3 mr-1" />
            Verified Business
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Business Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-900">Business Name</h4>
              <p className="text-gray-700">{mysteryMartData.businessName || 'N/A'}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">Business Type</h4>
              <p className="text-gray-700">{mysteryMartData.businessType || 'General Store'}</p>
            </div>
            
            {mysteryMartData.location && (
              <div>
                <h4 className="font-medium text-gray-900">Location</h4>
                <p className="text-gray-700">{mysteryMartData.location}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {mysteryMartData.loyaltyTier && (
              <div>
                <h4 className="font-medium text-gray-900">Loyalty Tier</h4>
                <Badge variant="outline" className="border-green-600 text-green-600">
                  {mysteryMartData.loyaltyTier}
                </Badge>
              </div>
            )}
            
            <div>
              <h4 className="font-medium text-gray-900">Seller Status</h4>
              <div className="flex items-center space-x-2">
                {mysteryMartData.isApprovedSeller ? (
                  <Badge className="bg-green-600 text-white">
                    <Award className="w-3 h-3 mr-1" />
                    Approved Seller
                  </Badge>
                ) : (
                  <Badge variant="outline">Pending Approval</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Business Stats */}
        {mysteryMartData.stats && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Business Performance</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mysteryMartData.rating && (
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <Star className="w-4 h-4 text-yellow-500 mr-1" />
                      <span className="font-bold text-lg">{mysteryMartData.rating.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>
                )}
                
                {mysteryMartData.stats.fulfillmentRate && (
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <Package className="w-4 h-4 text-blue-500 mr-1" />
                      <span className="font-bold text-lg">{mysteryMartData.stats.fulfillmentRate}%</span>
                    </div>
                    <p className="text-xs text-gray-500">Fulfillment</p>
                  </div>
                )}
                
                {mysteryMartData.stats.responseTime && (
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <Clock className="w-4 h-4 text-green-500 mr-1" />
                      <span className="font-bold text-lg">{mysteryMartData.stats.responseTime}h</span>
                    </div>
                    <p className="text-xs text-gray-500">Response Time</p>
                  </div>
                )}
                
                {mysteryMartData.totalSales && (
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                      <span className="font-bold text-lg">{mysteryMartData.totalSales}</span>
                    </div>
                    <p className="text-xs text-gray-500">Total Sales</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Business Description */}
        {mysteryMartData.bio && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-gray-900 mb-2">About This Business</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{mysteryMartData.bio}</p>
            </div>
          </>
        )}

        {/* Social Links */}
        {mysteryMartData.socialLinks && Object.keys(mysteryMartData.socialLinks).length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Connect With This Business</h4>
              <div className="flex flex-wrap gap-2">
                {mysteryMartData.socialLinks.website && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={mysteryMartData.socialLinks.website} target="_blank">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Website
                    </Link>
                  </Button>
                )}
                
                {mysteryMartData.socialLinks.instagram && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={mysteryMartData.socialLinks.instagram} target="_blank">
                      Instagram
                    </Link>
                  </Button>
                )}
                
                {mysteryMartData.socialLinks.twitter && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={mysteryMartData.socialLinks.twitter} target="_blank">
                      Twitter
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <Separator />
        <div className="flex flex-wrap gap-3">
          {sellerUrl && (
            <Button asChild className="firegram-success">
              <Link href={sellerUrl} target="_blank">
                <Store className="w-4 h-4 mr-2" />
                Visit MysteryMart Store
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          )}
          
          {isOwnProfile && (
            <Button asChild variant="outline">
              <Link href="https://mystery-mart-app.vercel.app/dashboard" target="_blank">
                <ExternalLink className="w-4 h-4 mr-2" />
                Manage Business
              </Link>
            </Button>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Business Partnership:</strong> This user is a verified business partner through MysteryMart. 
            All business transactions are handled through the MysteryMart platform.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
