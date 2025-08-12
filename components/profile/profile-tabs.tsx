"use client"

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileGrid } from './profile-grid'
import { FollowList } from './follow-list'
import { FiregramUser } from '@/lib/types'

interface ProfileTabsProps {
  user: FiregramUser
  isOwnProfile: boolean
}

export function ProfileTabs({ user, isOwnProfile }: ProfileTabsProps) {
  return (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="posts">Posts</TabsTrigger>
        <TabsTrigger value="followers">Followers</TabsTrigger>
        <TabsTrigger value="following">Following</TabsTrigger>
      </TabsList>
      
      <TabsContent value="posts" className="mt-6">
        <ProfileGrid user={user} isOwnProfile={isOwnProfile} />
      </TabsContent>
      
      <TabsContent value="followers" className="mt-6">
        <FollowList 
          userId={user.uid} 
          type="followers" 
          isOwnProfile={isOwnProfile}
        />
      </TabsContent>
      
      <TabsContent value="following" className="mt-6">
        <FollowList 
          userId={user.uid} 
          type="following" 
          isOwnProfile={isOwnProfile}
        />
      </TabsContent>
    </Tabs>
  )
}
