"use client"

import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Image as ImageIcon, Video as VideoIcon, Clock, FileX } from 'lucide-react'

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
  const [isTimeout, setIsTimeout] = useState(false)
  const [is404, setIs404] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Check for 404 errors on the resource
  useEffect(() => {
    const checkResource = async () => {
      try {
        const response = await fetch(src, { method: 'HEAD' });
        if (response.status === 404) {
          setIs404(true);
          setHasError(true);
          setIsLoading(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        }
      } catch (error) {
        // Network error or CORS issue - we'll let the regular error handling take care of it
      }
    };
    
    checkResource();
  }, [src]);

  useEffect(() => {
    // Set a 5-second timeout for loading
    timeoutRef.current = setTimeout(() => {
      if (isLoading) {
        setIsTimeout(true)
        setHasError(true)
        setIsLoading(false)
      }
    }, 5000)

    return () => {
      // Clear timeout on unmount or if media loads/errors
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isLoading])

  const handleError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // We're already checking for 404 via fetch in the useEffect
    // so we don't need to check it again here
    
    setHasError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsLoading(false)
  }

  if (hasError) {
    return (
      <div className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-8 ${className}`}>
        {is404 ? (
          <FileX className="w-8 h-8 text-red-500 mb-2" />
        ) : isTimeout ? (
          <Clock className="w-8 h-8 text-amber-500 mb-2" />
        ) : (
          <AlertTriangle className="w-8 h-8 text-gray-400 mb-2" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 mb-1">
            {is404 ? "Content not found" : isTimeout ? "Loading timeout" : "Content not available"}
          </p>
          <p className="text-xs text-gray-500">
            {is404
              ? `This ${type} was removed or not uploaded correctly`
              : isTimeout
                ? `This ${type} took too long to load (>5s)`
                : `This ${type} failed to load`
            }
          </p>
        </div>
        {type === 'image' ? (
          <ImageIcon className="w-4 h-4 text-gray-400 mt-2" />
        ) : (
          <VideoIcon className="w-4 h-4 text-gray-400 mt-2" />
        )}
        {(isTimeout && !is404) && (
          <button
            onClick={() => {
              setIsTimeout(false);
              setHasError(false);
              setIsLoading(true);
            }}
            className="mt-3 text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded"
          >
            Try Again
          </button>
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