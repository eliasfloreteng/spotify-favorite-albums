/**
 * Spotify API Module
 * Handles all Spotify API calls
 */

const API = {
  // Base URL for Spotify API
  baseUrl: "https://api.spotify.com/v1",

  // Cached data
  likedSongs: [],

  /**
   * Make a request to the Spotify API
   * @param {string} endpoint - The API endpoint to call
   * @param {Object} options - Additional fetch options
   * @returns {Promise<Object>} - The API response
   */
  async request(endpoint, options = {}) {
    const token = await AUTH.getAccessToken()

    if (!token) {
      throw new Error("No access token available")
    }

    const url = this.baseUrl + endpoint

    const fetchOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...options,
    }

    try {
      const response = await fetch(url, fetchOptions)

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          AUTH.showError("Your session has expired. Please log in again.")
          return null
        }

        const errorData = await response.json()
        throw new Error(
          errorData.error?.message || `API error: ${response.status}`
        )
      }

      return await response.json()
    } catch (error) {
      console.error("API request failed:", error)
      throw error
    }
  },

  /**
   * Get the current user's profile
   * @returns {Promise<Object>} - The user profile
   */
  async getCurrentUser() {
    return await this.request("/me")
  },

  /**
   * Get the user's liked songs with efficient pagination
   * @param {Function} progressCallback - Callback for progress updates
   * @returns {Promise<Array>} - Array of liked songs
   */
  async getLikedSongs(progressCallback) {
    // If we already have the data cached, return it
    if (this.likedSongs.length > 0) {
      return this.likedSongs
    }

    const limit = 50 // Maximum allowed by Spotify API
    let offset = 0
    let total = null
    let allSongs = []

    // First request to get total count
    const firstBatch = await this.request(
      `/me/tracks?limit=${limit}&offset=${offset}`
    )

    if (!firstBatch) return []

    total = firstBatch.total
    allSongs = allSongs.concat(firstBatch.items)

    // Update progress
    if (progressCallback) {
      progressCallback(allSongs.length, total)
    }

    // If there are more songs to fetch
    if (total > limit) {
      // Calculate how many more requests we need
      const remainingRequests = Math.ceil((total - limit) / limit)

      // Create an array of promises for parallel requests
      // We'll use batching to avoid overwhelming the API
      const batchSize = 3 // Number of parallel requests

      for (let i = 0; i < remainingRequests; i += batchSize) {
        const batchPromises = []

        // Create a batch of promises
        for (let j = 0; j < batchSize && i + j < remainingRequests; j++) {
          const currentOffset = limit + (i + j) * limit
          batchPromises.push(
            this.request(`/me/tracks?limit=${limit}&offset=${currentOffset}`)
          )
        }

        // Wait for the current batch to complete
        const batchResults = await Promise.all(batchPromises)

        // Process the results
        for (const result of batchResults) {
          if (result && result.items) {
            allSongs = allSongs.concat(result.items)

            // Update progress
            if (progressCallback) {
              progressCallback(allSongs.length, total)
            }
          }
        }
      }
    }

    // Process the songs to extract relevant information
    this.likedSongs = allSongs.map((item) => ({
      id: item.track.id,
      name: item.track.name,
      artists: item.track.artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
      })),
      album: {
        id: item.track.album.id,
        name: item.track.album.name,
        images: item.track.album.images,
        artists: item.track.album.artists.map((artist) => ({
          id: artist.id,
          name: artist.name,
        })),
        release_date: item.track.album.release_date,
      },
      added_at: item.added_at,
    }))

    return this.likedSongs
  },

  /**
   * Clear cached data
   */
  clearCache() {
    this.likedSongs = []
  },
}
