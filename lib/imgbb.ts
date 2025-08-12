interface ImgBBResponse {
  data: {
    id: string
    title: string
    url_viewer: string
    url: string
    display_url: string
    width: number
    height: number
    size: number
    time: number
    expiration: number
    image: {
      filename: string
      name: string
      mime: string
      extension: string
      url: string
    }
    thumb: {
      filename: string
      name: string
      mime: string
      extension: string
      url: string
    }
    medium: {
      filename: string
      name: string
      mime: string
      extension: string
      url: string
    }
    delete_url: string
  }
  success: boolean
  status: number
}

export const uploadImageToImgBB = async (imageFile: File): Promise<string> => {
  const apiKey = "a1deed7e7b58edf34021f788161121f4"

  if (!apiKey) {
    throw new Error("ImgBB API key not configured")
  }

  const formData = new FormData()
  formData.append("image", imageFile)
  formData.append("key", apiKey)

  try {
    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to upload image")
    }

    const data: ImgBBResponse = await response.json()

    if (!data.success) {
      throw new Error("ImgBB upload failed")
    }

    return data.data.display_url
  } catch (error) {
    console.error("Error uploading to ImgBB:", error)
    throw new Error("Failed to upload image")
  }
}

export const uploadBase64ToImgBB = async (base64String: string): Promise<string> => {
  const apiKey = "a1deed7e7b58edf34021f788161121f4"

  if (!apiKey) {
    throw new Error("ImgBB API key not configured")
  }

  // Remove data:image/jpeg;base64, prefix if present
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, "")

  const formData = new FormData()
  formData.append("image", base64Data)
  formData.append("key", apiKey)

  try {
    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to upload image")
    }

    const data: ImgBBResponse = await response.json()

    if (!data.success) {
      throw new Error("ImgBB upload failed")
    }

    return data.data.display_url
  } catch (error) {
    console.error("Error uploading to ImgBB:", error)
    throw new Error("Failed to upload image")
  }
}

export const uploadToImgBB = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const url = await uploadImageToImgBB(file)
    return { success: true, url }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
