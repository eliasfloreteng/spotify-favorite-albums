/**
 * Artists UI Module
 * Handles UI rendering and interactions for artists page
 */
const UIARTISTS = {
  elements: {
    loginSection: document.getElementById("login-section"),
    loadingSection: document.getElementById("loading-section"),
    resultsSection: document.getElementById("results-section"),
    errorSection: document.getElementById("error-section"),
    loadingText: document.getElementById("loading-text"),
    loadingProgress: document.getElementById("loading-progress"),
    artistsContainer: document.getElementById("artists-container"),
    searchInput: document.getElementById("search-input"),
    sortSelect: document.getElementById("sort-select"),
    totalArtists: document.getElementById("total-artists"),
    totalSongs: document.getElementById("total-songs"),
  },
  currentArtists: [],

  /**
   * Initialize the UI module
   */
  init() {
    this.setupEventListeners();
  },

  /**
   * Set up event listeners for UI interactions
   */
  setupEventListeners() {
    this.elements.searchInput.addEventListener(
      "input",
      this.handleSearch.bind(this)
    );
    this.elements.sortSelect.addEventListener(
      "change",
      this.handleSort.bind(this)
    );
  },

  /**
   * Show the login section
   */
  showLoginSection() {
    this.elements.loginSection.classList.remove("hidden");
    this.elements.loadingSection.classList.add("hidden");
    this.elements.resultsSection.classList.add("hidden");
    this.elements.errorSection.classList.add("hidden");
  },

  /**
   * Show the loading section
   */
  showLoadingSection() {
    this.elements.loginSection.classList.add("hidden");
    this.elements.loadingSection.classList.remove("hidden");
    this.elements.resultsSection.classList.add("hidden");
    this.elements.errorSection.classList.add("hidden");
  },

  /**
   * Show the results section
   */
  showResultsSection() {
    this.elements.loginSection.classList.add("hidden");
    this.elements.loadingSection.classList.add("hidden");
    this.elements.resultsSection.classList.remove("hidden");
    this.elements.errorSection.classList.add("hidden");
  },

  /**
   * Update the loading progress text
   * @param {number} current - Current number of songs loaded
   * @param {number} total - Total number of songs
   */
  updateLoadingProgress(current, total) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    this.elements.loadingProgress.textContent =
      `${current} of ${total} songs (${percentage}%)`;
  },

  /**
   * Render the artists in the UI
   * @param {Array} artists - Array of artist data
   */
  renderArtists(artists) {
    this.currentArtists = artists;
    this.elements.artistsContainer.innerHTML = "";
    if (artists.length === 0) {
      this.elements.artistsContainer.innerHTML =
        '<p class="no-results">No artists found</p>';
      return;
    }
    artists.forEach((artist) => {
      this.elements.artistsContainer.appendChild(
        this.createArtistCard(artist)
      );
    });
    const stats = PROCESSOR.getArtistStats();
    this.elements.totalArtists.textContent = stats.totalArtists;
    this.elements.totalSongs.textContent = stats.totalSongs;
  },

  /**
   * Create an artist card element
   * @param {Object} artist - Artist data
   * @returns {HTMLElement} - Artist card element
   */
  createArtistCard(artist) {
    const card = document.createElement("div");
    card.className = "artist-card";
    card.dataset.artistId = artist.id;
    card.innerHTML = `
      <div class="artist-info">
        <h3 class="artist-name" title="${artist.name}">${artist.name}</h3>
        <div class="artist-stats">
          <span class="song-count">${artist.songCount} song${
      artist.songCount !== 1 ? "s" : ""
    }</span>
          <span class="album-count">${artist.albumCount} album${
      artist.albumCount !== 1 ? "s" : ""
    }</span>
        </div>
      </div>
    `;
    return card;
  },

  /**
   * Handle search input
   * @param {Event} event - Input event
   */
  handleSearch(event) {
    const query = event.target.value;
    const filtered = PROCESSOR.searchArtists(PROCESSOR.artists, query);
    this.renderArtists(filtered);
  },

  /**
   * Handle sort selection
   * @param {Event} event - Change event
   */
  handleSort(event) {
    const sortBy = event.target.value;
    const sorted = PROCESSOR.sortArtists(
      this.currentArtists,
      sortBy
    );
    this.renderArtists(sorted);
  },
};

// Initialize the Artists UI module when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => UIARTISTS.init());