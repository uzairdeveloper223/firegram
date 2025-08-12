"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { SearchResults } from '@/components/search/search-results'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Users, FileText, TrendingUp } from 'lucide-react'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [activeSearch, setActiveSearch] = useState(initialQuery)
  const [searchType, setSearchType] = useState<'users' | 'posts'>('users')

  useEffect(() => {
    if (initialQuery) {
      setActiveSearch(initialQuery)
    }
  }, [initialQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setActiveSearch(searchQuery.trim())
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setActiveSearch('')
  }

  const trendingSearches = [
    'firegram',
    'business',
    'photography',
    'travel',
    'food',
    'technology'
  ]

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Search Header */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-6 h-6 mr-3 text-blue-800" />
              Search Firegram
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for users, posts, hashtags..."
                  className="pl-10"
                />
              </div>
              <Button type="submit" className="firegram-primary">
                Search
              </Button>
              {activeSearch && (
                <Button type="button" variant="outline" onClick={clearSearch}>
                  Clear
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Search Results */}
        {activeSearch ? (
          <div className="space-y-6">
            <Tabs value={searchType} onValueChange={(value: any) => setSearchType(value)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="users" className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="posts" className="flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Posts
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="mt-6">
                <SearchResults query={activeSearch} type="users" />
              </TabsContent>

              <TabsContent value="posts" className="mt-6">
                <SearchResults query={activeSearch} type="posts" />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          /* Discover Section */
          <div className="space-y-6">
            {/* Trending Searches */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                  Trending Searches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((term) => (
                    <Button
                      key={term}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery(term)
                        setActiveSearch(term)
                      }}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      #{term}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Discover Categories */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSearchType('users')
                      setSearchQuery('verified')
                      setActiveSearch('verified')
                    }}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-blue-900">Verified Users</h3>
                      <p className="text-sm text-blue-700">Discover verified creators</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSearchType('users')
                      setSearchQuery('business')
                      setActiveSearch('business')
                    }}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-green-900">Business Profiles</h3>
                      <p className="text-sm text-green-700">Find MysteryMart businesses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search Tips */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Search Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <strong>Username search:</strong> Use @ symbol to search for specific usernames (@john_doe)
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <strong>Hashtag search:</strong> Use # symbol to search for hashtags (#photography)
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <strong>Content search:</strong> Search for specific words in post content
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <strong>User filters:</strong> Search for "verified", "business", or "advanced" to filter users
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
