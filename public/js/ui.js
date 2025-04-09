/**
 * UI Module
 * Handles UI rendering and interactions
 */

const UI = {
  // DOM elements
  elements: {
    loginSection: document.getElementById("login-section"),
    loadingSection: document.getElementById("loading-section"),
    resultsSection: document.getElementById("results-section"),
    errorSection: document.getElementById("error-section"),
    loadingText: document.getElementById("loading-text"),
    loadingProgress: document.getElementById("loading-progress"),
    albumsContainer: document.getElementById("albums-container"),
    searchInput: document.getElementById("search-input"),
    sortSelect: document.getElementById("sort-select"),
    totalAlbums: document.getElementById("total-albums"),
    totalSongs: document.getElementById("total-songs"),
  },

  // Current state
  currentAlbums: [],

  /**
   * Initialize the UI module
   */
  init() {
    // Set up event listeners
    this.setupEventListeners()
  },

  /**
   * Set up event listeners for UI interactions
   */
  setupEventListeners() {
    // Search input
    this.elements.searchInput.addEventListener(
      "input",
      this.handleSearch.bind(this)
    )

    // Sort select
    this.elements.sortSelect.addEventListener(
      "change",
      this.handleSort.bind(this)
    )
  },

  /**
   * Show the login section
   */
  showLoginSection() {
    this.elements.loginSection.classList.remove("hidden")
    this.elements.loadingSection.classList.add("hidden")
    this.elements.resultsSection.classList.add("hidden")
    this.elements.errorSection.classList.add("hidden")
  },

  /**
   * Show the loading section
   */
  showLoadingSection() {
    this.elements.loginSection.classList.add("hidden")
    this.elements.loadingSection.classList.remove("hidden")
    this.elements.resultsSection.classList.add("hidden")
    this.elements.errorSection.classList.add("hidden")
  },

  /**
   * Show the results section
   */
  showResultsSection() {
    this.elements.loginSection.classList.add("hidden")
    this.elements.loadingSection.classList.add("hidden")
    this.elements.resultsSection.classList.remove("hidden")
    this.elements.errorSection.classList.add("hidden")
  },

  /**
   * Update the loading progress
   * @param {number} current - Current number of songs loaded
   * @param {number} total - Total number of songs to load
   */
  updateLoadingProgress(current, total) {
    const percentage = Math.round((current / total) * 100)
    this.elements.loadingProgress.textContent = `${current} of ${total} songs (${percentage}%)`
  },

  /**
   * Render the albums in the UI
   * @param {Array} albums - Array of albums to render
   */
  renderAlbums(albums) {
    // Store the current albums
    this.currentAlbums = albums

    // Clear the container
    this.elements.albumsContainer.innerHTML = ""

    // If no albums, show a message
    if (albums.length === 0) {
      this.elements.albumsContainer.innerHTML =
        '<p class="no-results">No albums found</p>'
      return
    }

    // Render each album
    albums.forEach((album) => {
      this.elements.albumsContainer.appendChild(this.createAlbumCard(album))
    })

    // Update stats
    const stats = PROCESSOR.getStats()
    this.elements.totalAlbums.textContent = stats.totalAlbums
    this.elements.totalSongs.textContent = stats.totalSongs
  },

  /**
   * Create an album card element
   * @param {Object} album - Album data
   * @returns {HTMLElement} - Album card element
   */
  createAlbumCard(album) {
    const card = document.createElement("div")
    card.className = "album-card"
    card.dataset.albumId = album.id

    // Get the album cover image (use the first image, or a placeholder)
    const coverUrl =
      album.images && album.images.length > 0
        ? album.images[0].url
        : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23333"/><text x="50%" y="50%" font-size="50" text-anchor="middle" fill="%23fff" font-family="Arial">No Image</text></svg>'

    // Create the HTML for the card
    card.innerHTML = `
      <img class="album-cover" src="${coverUrl}" alt="${album.name}">
      <div class="album-info">
        <h3 class="album-title" title="${album.name}">${album.name}</h3>
        <p class="album-artist" title="${album.primaryArtistName}">${
      album.primaryArtistName
    }</p>
        <div class="album-stats">
          <span class="song-count">${album.songCount} song${
      album.songCount !== 1 ? "s" : ""
    }</span>
          <button class="toggle-songs">Show songs</button>
        </div>
        <div class="album-songs-list">
          <ul>
            ${album.songs.map((song) => `<li>${song.name}</li>`).join("")}
          </ul>
        </div>
      </div>
    `

    // Add event listener for toggling songs list
    const toggleButton = card.querySelector(".toggle-songs")
    toggleButton.addEventListener("click", () => {
      const isExpanded = card.classList.toggle("expanded")
      toggleButton.textContent = isExpanded ? "Hide songs" : "Show songs"
    })

    return card
  },

  /**
   * Handle search input
   * @param {Event} event - Input event
   */
  handleSearch(event) {
    const query = event.target.value
    const filteredAlbums = PROCESSOR.searchAlbums(PROCESSOR.albums, query)
    this.renderAlbums(filteredAlbums)
  },

  /**
   * Handle sort selection
   * @param {Event} event - Change event
   */
  handleSort(event) {
    const sortBy = event.target.value
    const sortedAlbums = PROCESSOR.sortAlbums(this.currentAlbums, sortBy)
    this.renderAlbums(sortedAlbums)
  },
}

// Initialize the UI module when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => UI.init())
