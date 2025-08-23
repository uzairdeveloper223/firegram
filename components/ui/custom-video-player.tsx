"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Settings,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileX
} from 'lucide-react'

interface CustomVideoPlayerProps {
  src: string
  className?: string
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  playsInline?: boolean
  poster?: string
}

export function CustomVideoPlayer({
  src,
  className = "",
  autoPlay = true,
  loop = true,
  muted = false, // Default to unmuted
  playsInline = true,
  poster
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isMuted, setIsMuted] = useState(muted)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isTimeout, setIsTimeout] = useState(false)
  const [is404, setIs404] = useState(false)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const loadTimeoutRef = useRef<NodeJS.Timeout>()

  // Check for 404 errors on the video source
  useEffect(() => {
    const checkResource = async () => {
      try {
        const response = await fetch(src, { method: 'HEAD' });
        if (response.status === 404) {
          setIs404(true);
          setHasError(true);
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
          }
        }
      } catch (error) {
        // Network error or CORS issue - regular error handling will take care of it
      }
    };
    
    checkResource();
  }, [src]);

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      // Clear timeout when video loads successfully
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handleVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    const handleError = () => {
      setHasError(true)
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('error', handleError)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    // Set 5-second timeout for video loading
    loadTimeoutRef.current = setTimeout(() => {
      if (duration === 0) { // Still not loaded
        setIsTimeout(true)
        setHasError(true)
      }
    }, 5000)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('error', handleError)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
    }
  }, [duration])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
  }

  const handleVolumeChange = (newVolume: number[]) => {
    const video = videoRef.current
    if (!video) return

    const volumeValue = newVolume[0]
    video.volume = volumeValue
    video.muted = volumeValue === 0
  }

  const handleSeek = (newTime: number[]) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = newTime[0]
  }

  const toggleFullscreen = async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (!document.fullscreenElement) {
        await video.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  const restart = () => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = 0
    video.play()
  }

  const showControlsTemporarily = () => {
    setShowControls(true)
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Function to retry loading the video
  const retryLoading = () => {
    setHasError(false);
    setIsTimeout(false);
    const video = videoRef.current;
    if (video) {
      video.load(); // Reload the video
      
      // Set new timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      loadTimeoutRef.current = setTimeout(() => {
        if (duration === 0) { // Still not loaded
          setIsTimeout(true);
          setHasError(true);
        }
      }, 5000);
    }
  };

  if (hasError) {
    return (
      <div className={`relative bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-8 ${className}`}>
        {is404 ? (
          <FileX className="w-10 h-10 text-red-500 mb-3" />
        ) : isTimeout ? (
          <Clock className="w-10 h-10 text-amber-500 mb-3" />
        ) : (
          <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {is404 ? "Video Not Found" : isTimeout ? "Video Loading Timeout" : "Video Error"}
          </p>
          <p className="text-xs text-gray-500 mb-4">
            {is404
              ? "This video was removed or not uploaded correctly"
              : isTimeout
                ? "This video took too long to load (>5s)"
                : "There was a problem loading this video"
            }
          </p>
          {!is404 && (
            <Button
              onClick={retryLoading}
              variant="outline"
              size="sm"
              className="mx-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative group bg-black rounded-lg overflow-hidden ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onMouseMove={showControlsTemporarily}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        poster={poster}
        onClick={togglePlay}
      />

      {/* Custom Controls Overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Center Play/Pause Button */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="lg"
              onClick={togglePlay}
              className="bg-black/50 hover:bg-black/70 text-white rounded-full w-16 h-16"
            >
              <Play className="w-8 h-8 ml-1" />
            </Button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Progress Bar */}
          <div className="mb-3">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>

              {/* Restart */}
              <Button
                variant="ghost"
                size="sm"
                onClick={restart}
                className="text-white hover:bg-white/20"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>

              {/* Volume Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                
                <div className="w-20">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Time Display */}
              <span className="text-white text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {duration === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}