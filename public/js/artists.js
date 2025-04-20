/**
 * Artists Page Main Module
 * Coordinates authentication, data fetching, and rendering for artists page
 */
const ARTISTS_APP = {
  /**
   * Initialize the artists page application
   */
  init() {
    // Listen for authentication
    document.addEventListener("spotify-authenticated", () => {
      this.startDataFetch();
    });
    // If already authenticated, fetch data
    if (AUTH.isAuthenticated()) {
      this.startDataFetch();
    } else {
      UIARTISTS.showLoginSection();
    }
  },

  /**
   * Fetch liked songs and process artists data
   */
  async startDataFetch() {
    try {
      UIARTISTS.showLoadingSection();
      UIARTISTS.elements.loadingText.textContent =
        "Fetching your liked songs...";
      const likedSongs = await API.getLikedSongs((current, total) => {
        UIARTISTS.updateLoadingProgress(current, total);
      });
      UIARTISTS.elements.loadingText.textContent = "Processing data...";
      const artists = PROCESSOR.processArtists(likedSongs);
      UIARTISTS.renderArtists(artists);
      UIARTISTS.showResultsSection();
    } catch (error) {
      console.error("Error fetching data:", error);
      AUTH.showError(`Error fetching data: ${error.message}`);
    }
  },
};

// Initialize the artists application when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => ARTISTS_APP.init());