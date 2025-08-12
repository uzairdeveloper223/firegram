"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { registerUser, signInUser } from '@/lib/auth'
import { validateUsername } from '@/lib/types'
import { checkUsernameAvailability } from '@/lib/auth'
import { uploadToImgBB } from '@/lib/imgbb'

export function AuthForm() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('signin')
  
  // Form states
  const [signInForm, setSignInForm] = useState({ email: '', password: '' })
  const [signUpForm, setSignUpForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    username: '',
    profilePicture: ''
  })

  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean
    available: boolean | null
    error: string | null
  }>({ checking: false, available: null, error: null })

  // Check username as user types
  const handleUsernameChange = async (username: string) => {
    setSignUpForm(prev => ({ ...prev, username }))
    
    if (username.length < 3) {
      setUsernameStatus({ checking: false, available: null, error: null })
      return
    }

    const validation = validateUsername(username)
    if (!validation.valid) {
      setUsernameStatus({ checking: false, available: false, error: validation.error || 'Invalid username' })
      return
    }

    setUsernameStatus({ checking: true, available: null, error: null })
    
    try {
      const isAvailable = await checkUsernameAvailability(username)
      setUsernameStatus({ 
        checking: false, 
        available: isAvailable, 
        error: isAvailable ? null : 'Username is already taken' 
      })
    } catch (error) {
      setUsernameStatus({ checking: false, available: false, error: 'Error checking username' })
    }
  }

  const handleProfilePictureUpload = async (file: File) => {
    try {
      setLoading(true)
      const result = await uploadToImgBB(file)
      if (result.success && result.url) {
        setSignUpForm(prev => ({ ...prev, profilePicture: result.url }))
        toast({ title: "Profile picture uploaded successfully" })
      } else {
        toast({ title: "Failed to upload image", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error uploading image", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // ...existing code...

const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)

  try {
    const result = await signInUser(signInForm.email, signInForm.password)
    if (result.success) {
      toast({ title: "Welcome back to Firegram!" })
      window.location.reload()
    } else {
      // Expanded Firebase Auth error handling
      switch (result.error) {
        case "Firebase: Error (auth/user-not-found).":
          toast({ title: "No user found with this email.", variant: "destructive" })
          break
        case "Firebase: Error (auth/wrong-password).":
          toast({ title: "Incorrect password.", variant: "destructive" })
          break
        case "Firebase: Error (auth/invalid-credential).":
          toast({ title: "Invalid credentials provided.", variant: "destructive" })
          break
        case "Firebase: Error (auth/invalid-email).":
          toast({ title: "Invalid email address.", variant: "destructive" })
          break
        case "Firebase: Error (auth/user-disabled).":
          toast({ title: "This account has been disabled.", variant: "destructive" })
          break
        case "Firebase: Error (auth/too-many-requests).":
          toast({ title: "Too many failed attempts. Please try again later.", variant: "destructive" })
          break
        case "Firebase: Error (auth/network-request-failed).":
          toast({ title: "Network error. Please check your connection.", variant: "destructive" })
          break
        case "Firebase: Error (auth/internal-error).":
          toast({ title: "Internal server error. Please try again.", variant: "destructive" })
          break
        case "Firebase: Error (auth/operation-not-allowed).":
          toast({ title: "Sign in is not enabled for this project.", variant: "destructive" })
          break
        default:
          toast({ title: result.error || "Sign in failed", variant: "destructive" })
      }
    }
  } catch (error: any) {
    toast({ title: error.message || "An error occurred", variant: "destructive" })
  } finally {
    setLoading(false)
  }
}

const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)

  if (signUpForm.password !== signUpForm.confirmPassword) {
    toast({ title: "Passwords don't match", variant: "destructive" })
    setLoading(false)
    return
  }

  if (signUpForm.password.length < 6) {
    toast({ title: "Password must be at least 6 characters", variant: "destructive" })
    setLoading(false)
    return
  }

  if (!usernameStatus.available) {
    toast({ title: "Please choose a valid, available username", variant: "destructive" })
    setLoading(false)
    return
  }

  try {
    const result = await registerUser({
      email: signUpForm.email,
      password: signUpForm.password,
      fullName: signUpForm.fullName,
      username: signUpForm.username,
      profilePicture: signUpForm.profilePicture
    })

    if (result.success) {
      toast({ title: "Welcome to Firegram! Your account has been created." })
      window.location.reload()
    } else {
      // Expanded Firebase Auth error handling
      switch (result.error) {
        case "Firebase: Error (auth/email-already-in-use).":
          toast({ title: "Email is already in use.", variant: "destructive" })
          break
        case "Firebase: Error (auth/invalid-email).":
          toast({ title: "Invalid email address.", variant: "destructive" })
          break
        case "Firebase: Error (auth/weak-password).":
          toast({ title: "Password is too weak.", variant: "destructive" })
          break
        case "Firebase: Error (auth/operation-not-allowed).":
          toast({ title: "Sign up is not enabled for this project.", variant: "destructive" })
          break
        case "Firebase: Error (auth/network-request-failed).":
          toast({ title: "Network error. Please check your connection.", variant: "destructive" })
          break
        case "Firebase: Error (auth/internal-error).":
          toast({ title: "Internal server error. Please try again.", variant: "destructive" })
          break
        case "Firebase: Error (auth/missing-email).":
          toast({ title: "Please enter your email address.", variant: "destructive" })
          break
        case "Firebase: Error (auth/missing-password).":
          toast({ title: "Please enter your password.", variant: "destructive" })
          break
        default:
          toast({ title: result.error || "Registration failed", variant: "destructive" })
      }
    }
  } catch (error: any) {
    toast({ title: error.message || "An error occurred", variant: "destructive" })
  } finally {
    setLoading(false)
  }
}


  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-800 mb-2">Firegram</h1>
          <p className="text-gray-600">High-End Social Platform</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Sign in to your Firegram account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={signInForm.email}
                      onChange={(e) => setSignInForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={signInForm.password}
                      onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full firegram-primary" disabled={loading}>
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Join Firegram</CardTitle>
                <CardDescription>Create your premium social account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-fullname">Full Name</Label>
                    <Input
                      id="signup-fullname"
                      value={signUpForm.fullName}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="signup-username">Username</Label>
                    <Input
                      id="signup-username"
                      value={signUpForm.username}
                      onChange={(e) => handleUsernameChange(e.target.value.toLowerCase())}
                      placeholder="lowercase, numbers, periods, underscores only"
                      required
                    />
                    {usernameStatus.checking && (
                      <p className="text-sm text-gray-500 mt-1">Checking availability...</p>
                    )}
                    {usernameStatus.available === true && (
                      <p className="text-sm text-green-600 mt-1">✓ Username available</p>
                    )}
                    {usernameStatus.error && (
                      <p className="text-sm text-red-600 mt-1">{usernameStatus.error}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signUpForm.email}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signUpForm.password}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      value={signUpForm.confirmPassword}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-profile-picture">Profile Picture (Optional)</Label>
                    <Input
                      id="signup-profile-picture"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleProfilePictureUpload(file)
                      }}
                    />
                    {signUpForm.profilePicture && (
                      <img 
                        src={signUpForm.profilePicture} 
                        alt="Profile preview" 
                        className="w-16 h-16 rounded-full object-cover mt-2"
                      />
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full firegram-primary" 
                    disabled={loading || !usernameStatus.available}
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
