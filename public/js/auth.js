/**
 * Spotify Authentication Module
 * Handles Spotify authentication using the Authorization Code Flow with PKCE
 */

const AUTH = {
  // Configuration
  clientId: "f2205c93492a43b9b6fb67b91bcb942b", // To be filled by the user
  redirectUri: window.location.origin + window.location.pathname,
  scopes: ["user-library-read"],
  tokenEndpoint: "https://accounts.spotify.com/api/token",

  // State
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  codeVerifier: null,

  /**
   * Initialize the authentication module
   */
  init() {
    // Check if we're returning from Spotify auth with a code
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get("code")

    if (code) {
      this.handleRedirect(code)
    }

    // Check if we have a stored token that's still valid
    this.loadTokenFromStorage()

    // Set up event listeners
    document
      .getElementById("login-button")
      .addEventListener("click", () => this.login())
    document
      .getElementById("retry-button")
      .addEventListener("click", () => window.location.reload())
  },

  /**
   * Generate a random string of a specified length
   */
  generateRandomString(length) {
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let text = ""

    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }

    return text
  },

  /**
   * Generate a code verifier for PKCE
   */
  generateCodeVerifier() {
    return this.generateRandomString(64)
  },

  /**
   * Generate a code challenge from the code verifier
   * @param {string} codeVerifier - The code verifier
   * @returns {Promise<string>} - The code challenge
   */
  async generateCodeChallenge(codeVerifier) {
    // Convert the code verifier to a Uint8Array
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)

    // Hash the code verifier using SHA-256
    const digest = await crypto.subtle.digest("SHA-256", data)

    // Convert the hash to base64url encoding
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
  },

  /**
   * Initiate the login process
   */
  async login() {
    // Generate a random state value to protect against CSRF
    const state = this.generateRandomString(16)
    localStorage.setItem("spotify_auth_state", state)

    // Generate code verifier and challenge for PKCE
    this.codeVerifier = this.generateCodeVerifier()
    localStorage.setItem("spotify_code_verifier", this.codeVerifier)
    const codeChallenge = await this.generateCodeChallenge(this.codeVerifier)

    // Build the authorization URL
    const authUrl = new URL("https://accounts.spotify.com/authorize")
    authUrl.searchParams.append("client_id", this.clientId)
    authUrl.searchParams.append("response_type", "code")
    authUrl.searchParams.append("redirect_uri", this.redirectUri)
    authUrl.searchParams.append("state", state)
    authUrl.searchParams.append("scope", this.scopes.join(" "))
    authUrl.searchParams.append("code_challenge_method", "S256")
    authUrl.searchParams.append("code_challenge", codeChallenge)
    authUrl.searchParams.append("show_dialog", "false")

    // Redirect to Spotify authorization page
    window.location.href = authUrl.toString()
  },

  /**
   * Handle the redirect from Spotify
   * @param {string} code - The authorization code
   */
  async handleRedirect(code) {
    const urlParams = new URLSearchParams(window.location.search)
    const state = urlParams.get("state")
    const storedState = localStorage.getItem("spotify_auth_state")
    const error = urlParams.get("error")

    if (error) {
      this.showError(`Authentication error: ${error}`)
      return
    }

    if (state !== storedState) {
      this.showError("State mismatch error. Please try again.")
      return
    }

    // Clear the state from storage
    localStorage.removeItem("spotify_auth_state")

    // Get the code verifier from storage
    const codeVerifier = localStorage.getItem("spotify_code_verifier")
    if (!codeVerifier) {
      this.showError("Code verifier not found. Please try again.")
      return
    }
    localStorage.removeItem("spotify_code_verifier")

    try {
      // Exchange the code for tokens
      await this.exchangeCodeForTokens(code, codeVerifier)

      // Clear the query parameters from the URL
      window.history.replaceState({}, document.title, window.location.pathname)

      // Notify the app that we're authenticated
      document.dispatchEvent(new CustomEvent("spotify-authenticated"))
    } catch (error) {
      this.showError(`Error exchanging code for tokens: ${error.message}`)
    }
  },

  /**
   * Exchange the authorization code for access and refresh tokens
   * @param {string} code - The authorization code
   * @param {string} codeVerifier - The code verifier
   */
  async exchangeCodeForTokens(code, codeVerifier) {
    const body = new URLSearchParams({
      client_id: this.clientId,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
    })

    const response = await fetch(this.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(
        errorData.error_description ||
          `Token exchange failed: ${response.status}`
      )
    }

    const data = await response.json()

    // Store the tokens
    this.accessToken = data.access_token
    this.refreshToken = data.refresh_token

    // Calculate when the token expires (in milliseconds)
    const expiresIn = data.expires_in
    this.expiresAt = Date.now() + expiresIn * 1000

    // Save the tokens to localStorage
    this.saveTokenToStorage()

    return data
  },

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error("No refresh token available")
    }

    const body = new URLSearchParams({
      client_id: this.clientId,
      grant_type: "refresh_token",
      refresh_token: this.refreshToken,
    })

    try {
      const response = await fetch(this.tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error_description ||
            `Token refresh failed: ${response.status}`
        )
      }

      const data = await response.json()

      // Update the tokens
      this.accessToken = data.access_token

      // Refresh token might be returned, update if it is
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token
      }

      // Calculate when the token expires (in milliseconds)
      const expiresIn = data.expires_in
      this.expiresAt = Date.now() + expiresIn * 1000

      // Save the updated tokens to localStorage
      this.saveTokenToStorage()

      return data
    } catch (error) {
      console.error("Error refreshing token:", error)
      // If refresh fails, we need to re-authenticate
      this.accessToken = null
      this.refreshToken = null
      this.expiresAt = null
      this.saveTokenToStorage()
      throw error
    }
  },

  /**
   * Load the token from localStorage if it exists and is still valid
   */
  loadTokenFromStorage() {
    const tokenData = JSON.parse(
      localStorage.getItem("spotify_token_data") || "{}"
    )

    if (tokenData.accessToken && tokenData.expiresAt) {
      this.accessToken = tokenData.accessToken
      this.refreshToken = tokenData.refreshToken
      this.expiresAt = tokenData.expiresAt

      // Check if the token is still valid (with a 60-second buffer)
      if (tokenData.expiresAt > Date.now() + 60000) {
        // Notify the app that we're authenticated
        document.dispatchEvent(new CustomEvent("spotify-authenticated"))
        return true
      } else if (this.refreshToken) {
        // Token is expired but we have a refresh token
        // We'll refresh the token when getAccessToken is called
        return false
      }
    }

    return false
  },

  /**
   * Save the token to localStorage
   */
  saveTokenToStorage() {
    const tokenData = {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
    }

    localStorage.setItem("spotify_token_data", JSON.stringify(tokenData))
  },

  /**
   * Check if the user is authenticated
   */
  isAuthenticated() {
    return (
      this.accessToken !== null &&
      (this.expiresAt > Date.now() || this.refreshToken !== null)
    )
  },

  /**
   * Get the access token, refreshing if necessary
   */
  async getAccessToken() {
    // If we have a valid token, return it
    if (this.accessToken && this.expiresAt > Date.now()) {
      return this.accessToken
    }

    // If we have a refresh token, try to refresh
    if (this.refreshToken) {
      try {
        await this.refreshAccessToken()
        return this.accessToken
      } catch (error) {
        console.error("Failed to refresh token:", error)
        return null
      }
    }

    // No valid token and no refresh token
    return null
  },

  /**
   * Show an error message
   */
  showError(message) {
    document.getElementById("error-details").textContent = message
    document.getElementById("login-section").classList.add("hidden")
    document.getElementById("loading-section").classList.add("hidden")
    document.getElementById("results-section").classList.add("hidden")
    document.getElementById("error-section").classList.remove("hidden")
  },
}

// Initialize the authentication module when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => AUTH.init())
