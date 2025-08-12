export interface MysteryMartStats {
  averageRating?: number
  fulfillmentRate?: number
  responseTime?: number
  returnRate?: number
  totalRevenue?: number
}

export interface MysteryMartSocialLinks {
  instagram?: string
  twitter?: string
  website?: string
}

export interface MysteryMartVerification {
  verified: boolean
  businessName?: string
  businessType?: string
  verifiedAt?: number
  uid?: string
  username?: string
  isApprovedSeller?: boolean
  canSell?: boolean
  loyaltyTier?: string
  rating?: number
  stats?: MysteryMartStats
  profilePicture?: string
  bio?: string
  location?: string
  socialLinks?: MysteryMartSocialLinks
  totalSales?: number
  verificationStatus?: string
}

export const verifyMysteryMartBusiness = async (email: string): Promise<MysteryMartVerification> => {
  try {
    const response = await fetch(`/api/verify-biz?email=${encodeURIComponent(email)}&todo=verify-biz`)

    if (!response.ok) {
      throw new Error("Failed to verify business")
    }

    const data = await response.json()

    return {
      verified: data.verified || false,
      businessName: data.businessName,
      businessType: data.businessType,
      verifiedAt: data.verified ? Date.now() : undefined,
      uid: data.uid,
      username: data.username,
      isApprovedSeller: data.isApprovedSeller,
      canSell: data.canSell,
      loyaltyTier: data.loyaltyTier,
      rating: data.rating,
      stats: data.stats,
      profilePicture: data.profilePicture,
      bio: data.bio,
      location: data.location,
      socialLinks: data.socialLinks,
      totalSales: data.totalSales,
      verificationStatus: data.verificationStatus,
    }
  } catch (error) {
    console.error("Error verifying MysteryMart business:", error)
    return { verified: false }
  }
}

export const checkMysteryMartStatus = async (email: string): Promise<boolean> => {
  try {
    const verification = await verifyMysteryMartBusiness(email)
    return verification.verified
  } catch (error) {
    console.error("Error checking MysteryMart status:", error)
    return false
  }
}

export const getMysteryMartSellerUrl = (username: string): string => {
  const baseUrl = "https://mystery-mart-app.vercel.app"
  return `${baseUrl}/seller/${username}`
}

export const getMysteryMartBusinessProfile = async (email: string): Promise<{ canSell: boolean; sellerUrl?: string; businessData?: MysteryMartVerification }> => {
  try {
    const businessData = await verifyMysteryMartBusiness(email)
    
    if (businessData.verified && businessData.canSell && businessData.username) {
      return {
        canSell: true,
        sellerUrl: getMysteryMartSellerUrl(businessData.username),
        businessData
      }
    }
    
    return { canSell: false }
  } catch (error) {
    console.error("Error getting MysteryMart business profile:", error)
    return { canSell: false }
  }
}