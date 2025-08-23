"use client"

import { useState } from 'react'
import { AlertTriangle, Image as ImageIcon, Video as VideoIcon } from 'lucide-react'

interface MediaWithFallbackProps {
  src: string
  alt: string
  type: 'image' | 'video'
  className?: string
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>
  imageProps?: React.ImgHTMLAttributes<HTMLImageElement>
}

export function MediaWithFallback({ 
  src, 
  alt, 
  type, 
  className = '', 
  videoProps = {},
  imageProps = {}
}: MediaWithFallbackProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  if (hasError) {
    return (
      <div className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-8 ${className}`}>
        <AlertTriangle className="w-8 h-8 text-gray-400 mb-2" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 mb-1">
            Content not available
          </p>
          <p className="text-xs text-gray-500">
            This {type} was removed or failed to upload correctly
          </p>
        </div>
        {type === 'image' ? (
          <ImageIcon className="w-4 h-4 text-gray-400 mt-2" />
        ) : (
          <VideoIcon className="w-4 h-4 text-gray-400 mt-2" />
        )}
      </div>
    )
  }

  if (type === 'image') {
    return (
      <div className="relative">
        {isLoading && (
          <div className={`absolute inset-0 bg-gray-200 animate-pulse rounded-lg ${className}`} />
        )}
        <img
          src={src}
          alt={alt}
          className={className}
          onError={handleError}
          onLoad={handleLoad}
          style={{ display: isLoading ? 'none' : 'block' }}
          {...imageProps}
        />
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center ${className}`}>
          <VideoIcon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <video
        src={src}
        className={className}
        onError={handleError}
        onLoadedData={handleLoad}
        style={{ display: isLoading ? 'none' : 'block' }}
        {...videoProps}
      />
    </div>
  )
}