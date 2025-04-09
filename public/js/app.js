/**
 * Main Application Module
 * Coordinates between other modules and handles the application flow
 */

const APP = {
  /**
   * Initialize the application
   */
  init() {
    // Check if we need to prompt for client ID
    this.checkClientId()

    // Set up event listeners
    this.setupEventListeners()

    // Show the appropriate section based on authentication status
    if (AUTH.isAuthenticated()) {
      this.startDataFetch()
    } else {
      UI.showLoginSection()
    }
  },

  /**
   * Check if we need to prompt for client ID
   */
  checkClientId() {
    // Check if client ID is already set
    if (AUTH.clientId) {
      return
    }

    // Check if client ID is stored in localStorage
    const storedClientId = localStorage.getItem("spotify_client_id")
    if (storedClientId) {
      AUTH.clientId = storedClientId
      return
    }

    // Prompt for client ID
    const clientId = prompt(
      "Please enter your Spotify Client ID. You can create one at https://developer.spotify.com/dashboard/",
      ""
    )

    if (clientId) {
      AUTH.clientId = clientId
      localStorage.setItem("spotify_client_id", clientId)
    }
  },

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for authentication events
    document.addEventListener("spotify-authenticated", () => {
      this.startDataFetch()
    })
  },

  /**
   * Start fetching data from Spotify
   */
  async startDataFetch() {
    try {
      // Show loading section
      UI.showLoadingSection()

      // Update loading text
      UI.elements.loadingText.textContent = "Fetching your liked songs..."

      // Fetch liked songs with progress updates
      const likedSongs = await API.getLikedSongs((current, total) => {
        UI.updateLoadingProgress(current, total)
      })

      // Update loading text
      UI.elements.loadingText.textContent = "Processing data..."

      // Process the data
      const albums = PROCESSOR.processSongs(likedSongs)

      // Render the results
      UI.renderAlbums(albums)

      // Show the results section
      UI.showResultsSection()
    } catch (error) {
      console.error("Error fetching data:", error)
      AUTH.showError(`Error fetching data: ${error.message}`)
    }
  },

  /**
   * Reset the application
   */
  reset() {
    // Clear cached data
    API.clearCache()

    // Clear localStorage
    localStorage.removeItem("spotify_token_data")

    // Reload the page
    window.location.reload()
  },
}

// Initialize the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => APP.init())
