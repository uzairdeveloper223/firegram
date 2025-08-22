import admin from 'firebase-admin'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "firegram-by-uzair",
      clientEmail: "firebase-adminsdk-fbsvc@firegram-by-uzair.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCQLy1Pqv7AoYFg\nufArSeOK0sTpAs517BuO/ol0ZCQT/0p5ibiy9LPvV6ivJ2r7ZinYofNV4QsfH5y/\nnflQpJc8Iva3zwhgJRaMw7z7GVFqwljGwcHoAl2t1PyLtQTLRsS/2Peq+SjjN3Ms\nvXPmIf2a5AJ3Q8YBI4NkgDWmi6x39Xm4bp8jhL5vWu41NsRPYjb6u9XBxVxLCRpw\n2XjVAIjjU80+OQGsZ+xm0Vwyan8bGZYIoduIDJwf57uazTdWemt3X/F7ABoW6O/2\nceQkSg6goeBQAtcNX5uZZMS7/9qlBMqNEOGAZld/xEMIwKkwkPcE6TgFmqqk6xHU\nFfZyqdYzAgMBAAECggEANDiqEB9OKoW0XsyphHw8CiVBhWVrUsGDz7w4G6xDduyx\nVCjB+Srw2sCki1/a+xfrExfBEvsxtIGWG77DNGaQkgrV0ggNsAjuzGf+k/F9EA44\n6i/2I6prtJCeMZmMFXXZv+R8+3NH0FfegrdReWoZONbZX8nvtqzeo3FePSZ8fmui\nkUd94f862/LmIpDCYjRcgL/mm6J80ej8KP44EiPgbt4om3mvTG4Wa6QCy33sjwPu\nxwaPA4MmufCejPJYIboNO6Li1a0X7ZybB3cR/KGjvO5nnfvRJYMiHpFyRG6hA67x\n3SyV9DUXw+UV7Qj7hCPn9yfKT3QAA2j8aFMnp5yskQKBgQDAfV+htpfNPam6Lw+O\nxPrt3e12gMF98vg9Hs7IVmIIBWVK2HlsWXMtghTjyW3qM6V0zp0jeqy4Dc/L0NwB\n/Mf2Qim9lFtKgnNwfQO5RoWlEIqu7x7RYk0if9ywU/W6Tjbul69bVsbiqED7PeQ8\nVwKYVjhiQqUQPql0s6Hy60y5gwKBgQC/wbAjikJ/EIJV9EtRcSiJKJQ/WI7S7ztM\nM7yrY68Z0BfrP6AX4w/ksVc1v1yqVbAhIUjdMf5Xupcm9CwdmzQkuOFMKq1FR9jI\nqqAaVgI6etZJquzzZnGV0XcHwF11MrZaRaZBiLK+7hkvJbBFQajxce+HbquwHbzJ\nZsxVP/PBkQKBgQCsOUCwQtvNcceDYwnrdokA/Jizd34n/5VlskPXcZqijJlVfxwc\n+meYJxQjvpzOeEkomph0HxWcVBdAx+2hBZev2QDZs3x+zPsWgXQseFGpH4TGAgKz\n2t0i6f398hEhEUwK68Kk2Z53O41wfa7Q4hTbUgF+wRxIzZf2Z6aV3zu1mwKBgQC7\nMfAroctsk8dI9eWZKeiyjSS7+k3jaZvvtgoXHodPoa/X/hLhfs6DKQTD+X4S4vfA\nP+gL18Q+DG+GnZN7i4oJ11pJqtff7FWa/8awLwqZ4FTVMcGDk5yK7yNOM+KIiOsv\nkRLOow4sCfAX8Kj10zWEDwAQrF963GzyCCKtjnL9oQKBgEHyyfB/OslrPbU6gl65\nRfMf/3G0oZbLTC5juN7rfGTvERbt7eUP+RwPH1k4MwogEFhTLqWd6twql4b6Mqok\nyBzuuHy/+11TG/3qLyI+xBWKy3INVPVOpyFlkO5QulkQs6i6Cb76ZmxGEPHYFhXh\ns1TcpfGihxWT9skw//xYCoEd\n-----END PRIVATE KEY-----\n"
    }),
    databaseURL: "https://firegram-by-uzair-default-rtdb.firebaseio.com"
  })
}

export default admin