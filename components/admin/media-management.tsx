"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Folder,
  Image,
  Video,
  FileText,
  Trash2,
  Download,
  Eye,
  ArrowLeft,
  RefreshCw,
  Search,
  Calendar,
  HardDrive
} from 'lucide-react'

interface CloudinaryResource {
  public_id: string
  format: string
  resource_type: string
  type: string
  created_at: string
  bytes: number
  width?: number
  height?: number
  duration?: number
  secure_url: string
  folder?: string
}

interface CloudinaryFolder {
  name: string
  path: string
}

export function MediaManagement() {
  const { toast } = useToast()
  const [resources, setResources] = useState<CloudinaryResource[]>([])
  const [folders, setFolders] = useState<CloudinaryFolder[]>([])
  const [currentFolder, setCurrentFolder] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [resourceType, setResourceType] = useState<'image' | 'video' | 'raw'>('image')
  const [selectedResource, setSelectedResource] = useState<CloudinaryResource | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  useEffect(() => {
    fetchResources()
  }, [currentFolder, resourceType])

  const fetchResources = async (cursor?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        folder: currentFolder,
        type: resourceType,
        max_results: '30',
        ...(cursor && { next_cursor: cursor })
      })

      const response = await fetch(`/api/admin/cloudinary-resources?${params}`)
      const data = await response.json()

      if (data.success) {
        if (cursor) {
          setResources(prev => [...prev, ...data.resources])
        } else {
          setResources(data.resources)
          setFolders(data.folders || [])
        }
        setNextCursor(data.next_cursor)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch resources",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch resources",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteResource = async (publicId: string, resourceType: string) => {
    try {
      const params = new URLSearchParams({
        public_id: publicId,
        resource_type: resourceType
      })

      const response = await fetch(`/api/admin/cloudinary-resources?${params}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()

      if (data.success) {
        setResources(prev => prev.filter(r => r.public_id !== publicId))
        toast({
          title: "Success",
          description: "Resource deleted successfully"
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete resource",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete resource",
        variant: "destructive"
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getResourceIcon = (resource: CloudinaryResource) => {
    if (resource.resource_type === 'image') {
      return <Image className="w-4 h-4" />
    } else if (resource.resource_type === 'video') {
      return <Video className="w-4 h-4" />
    } else {
      return <FileText className="w-4 h-4" />
    }
  }

  const filteredResources = resources.filter(resource =>
    resource.public_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const navigateToFolder = (folderPath: string) => {
    setCurrentFolder(folderPath)
    setSearchQuery('')
  }

  const goBack = () => {
    const parentFolder = currentFolder.split('/').slice(0, -1).join('/')
    setCurrentFolder(parentFolder)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HardDrive className="w-5 h-5 mr-2" />
            Cloudinary Media Browser
          </CardTitle>
          <CardDescription>
            Browse, manage, and delete media files stored in Cloudinary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Navigation */}
            <div className="flex items-center space-x-2">
              {currentFolder && (
                <Button variant="outline" size="sm" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <div className="text-sm text-gray-600">
                /{currentFolder || 'root'}
              </div>
            </div>

            {/* Resource Type Filter */}
            <div className="flex space-x-2">
              {(['image', 'video', 'raw'] as const).map((type) => (
                <Button
                  key={type}
                  variant={resourceType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setResourceType(type)}
                >
                  {type === 'image' && <Image className="w-4 h-4 mr-1" />}
                  {type === 'video' && <Video className="w-4 h-4 mr-1" />}
                  {type === 'raw' && <FileText className="w-4 h-4 mr-1" />}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Refresh */}
            <Button variant="outline" size="sm" onClick={() => fetchResources()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Folders */}
      {folders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Folders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {folders.map((folder) => (
                <Button
                  key={folder.path}
                  variant="outline"
                  className="h-auto p-3 flex flex-col items-center justify-center"
                  onClick={() => navigateToFolder(folder.path)}
                >
                  <Folder className="w-8 h-8 mb-2 text-blue-600" />
                  <span className="text-xs text-center truncate w-full">
                    {folder.name}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Media Files ({filteredResources.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <HardDrive className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No media files found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredResources.map((resource) => (
                  <div key={resource.public_id} className="group relative">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {resource.resource_type === 'image' ? (
                        <img
                          src={resource.secure_url}
                          alt={resource.public_id}
                          className="w-full h-full object-cover"
                        />
                      ) : resource.resource_type === 'video' ? (
                        <div className="w-full h-full bg-black flex items-center justify-center relative">
                          <video
                            src={resource.secure_url}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Video className="w-8 h-8 text-white opacity-80" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedResource(resource)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Resource Details</DialogTitle>
                              <DialogDescription>
                                {selectedResource?.public_id}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedResource && (
                              <div className="space-y-4">
                                <div className="flex justify-center">
                                  {selectedResource.resource_type === 'image' ? (
                                    <img
                                      src={selectedResource.secure_url}
                                      alt={selectedResource.public_id}
                                      className="max-w-full max-h-96 object-contain"
                                    />
                                  ) : selectedResource.resource_type === 'video' ? (
                                    <video
                                      src={selectedResource.secure_url}
                                      controls
                                      className="max-w-full max-h-96"
                                    />
                                  ) : (
                                    <div className="p-8 bg-gray-100 rounded-lg">
                                      <FileText className="w-16 h-16 mx-auto text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <strong>Public ID:</strong> {selectedResource.public_id}
                                  </div>
                                  <div>
                                    <strong>Format:</strong> {selectedResource.format}
                                  </div>
                                  <div>
                                    <strong>Size:</strong> {formatFileSize(selectedResource.bytes)}
                                  </div>
                                  <div>
                                    <strong>Type:</strong> {selectedResource.resource_type}
                                  </div>
                                  {selectedResource.width && (
                                    <div>
                                      <strong>Dimensions:</strong> {selectedResource.width} × {selectedResource.height}
                                    </div>
                                  )}
                                  {selectedResource.duration && (
                                    <div>
                                      <strong>Duration:</strong> {formatDuration(selectedResource.duration)}
                                    </div>
                                  )}
                                  <div>
                                    <strong>Created:</strong> {new Date(selectedResource.created_at).toLocaleDateString()}
                                  </div>
                                  <div className="col-span-2">
                                    <strong>URL:</strong>
                                    <div className="mt-1 p-2 bg-gray-100 rounded text-xs break-all">
                                      {selectedResource.secure_url}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(resource.secure_url, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this resource? This action cannot be undone.
                                <br />
                                <strong>{resource.public_id}</strong>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteResource(resource.public_id, resource.resource_type)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Resource Info */}
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center text-xs text-gray-600">
                        {getResourceIcon(resource)}
                        <span className="ml-1 truncate">
                          {resource.public_id.split('/').pop()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatFileSize(resource.bytes)}</span>
                        {resource.duration && (
                          <Badge variant="secondary" className="text-xs">
                            {formatDuration(resource.duration)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {nextCursor && (
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchResources(nextCursor)}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}