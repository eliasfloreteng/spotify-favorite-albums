/**
 * Data Processor Module
 * Handles data processing and fuzzy matching for albums
 */

const PROCESSOR = {
  // Configuration
  similarityThreshold: 0.8, // Threshold for fuzzy matching (0-1)

  // Processed data
  albums: [],

  /**
   * Process the liked songs data to find favorite albums
   * @param {Array} likedSongs - Array of liked songs from Spotify API
   * @returns {Array} - Processed album data
   */
  processSongs(likedSongs) {
    if (!likedSongs || likedSongs.length === 0) {
      return []
    }

    // Group songs by album (initial grouping)
    const albumGroups = this.groupSongsByAlbum(likedSongs)

    // Apply fuzzy matching to merge similar albums
    const mergedAlbums = this.mergeAlbums(albumGroups)

    // Sort albums by song count (descending)
    const sortedAlbums = this.sortAlbums(mergedAlbums, "count-desc")

    // Store the processed data
    this.albums = sortedAlbums

    return sortedAlbums
  },

  /**
   * Group songs by album (initial grouping)
   * @param {Array} songs - Array of songs
   * @returns {Object} - Albums grouped by ID
   */
  groupSongsByAlbum(songs) {
    const albums = {}

    songs.forEach((song) => {
      const albumId = song.album.id

      if (!albums[albumId]) {
        albums[albumId] = {
          id: albumId,
          name: song.album.name,
          normalizedName: this.normalizeAlbumName(song.album.name),
          artists: song.album.artists,
          // Use the first artist as the primary artist
          primaryArtistId: song.album.artists[0]?.id,
          primaryArtistName: song.album.artists[0]?.name,
          images: song.album.images,
          songs: [],
          songCount: 0,
        }
      }

      albums[albumId].songs.push({
        id: song.id,
        name: song.name,
        artists: song.artists.map((artist) => artist.name).join(", "),
      })

      albums[albumId].songCount = albums[albumId].songs.length
    })

    return albums
  },

  /**
   * Merge similar albums using fuzzy matching
   * @param {Object} albumGroups - Albums grouped by ID
   * @returns {Array} - Array of merged albums
   */
  mergeAlbums(albumGroups) {
    const albums = Object.values(albumGroups)
    const mergedAlbums = {}
    const processedIds = new Set()

    // For each album
    for (let i = 0; i < albums.length; i++) {
      const album = albums[i]

      // Skip if already processed
      if (processedIds.has(album.id)) {
        continue
      }

      // Mark as processed
      processedIds.add(album.id)

      // Create a new merged album starting with this album
      const mergedAlbum = {
        ...album,
        originalAlbums: [album],
        variants: [album.name],
      }

      // Look for similar albums
      for (let j = 0; j < albums.length; j++) {
        // Skip self or already processed albums
        if (i === j || processedIds.has(albums[j].id)) {
          continue
        }

        const otherAlbum = albums[j]

        // Check if albums are similar
        if (this.areAlbumsSimilar(album, otherAlbum)) {
          // Mark as processed
          processedIds.add(otherAlbum.id)

          // Add songs from the other album
          mergedAlbum.songs = mergedAlbum.songs.concat(otherAlbum.songs)

          // Update song count
          mergedAlbum.songCount = mergedAlbum.songs.length

          // Add to original albums and variants
          mergedAlbum.originalAlbums.push(otherAlbum)
          mergedAlbum.variants.push(otherAlbum.name)

          // Use the album with more songs as the primary representation
          if (otherAlbum.songs.length > album.songs.length) {
            mergedAlbum.name = otherAlbum.name
            mergedAlbum.images = otherAlbum.images
          }
        }
      }

      // Remove duplicates from songs
      mergedAlbum.songs = this.removeDuplicateSongs(mergedAlbum.songs)

      // Update song count after removing duplicates
      mergedAlbum.songCount = mergedAlbum.songs.length

      // Add to merged albums
      mergedAlbums[album.id] = mergedAlbum
    }

    return Object.values(mergedAlbums)
  },

  /**
   * Check if two albums are similar using fuzzy matching
   * @param {Object} album1 - First album
   * @param {Object} album2 - Second album
   * @returns {boolean} - True if albums are similar
   */
  areAlbumsSimilar(album1, album2) {
    // If by the same artist, use a lower threshold
    const sameArtist = album1.primaryArtistId === album2.primaryArtistId

    // If not by the same artist, they're not similar
    if (!sameArtist) {
      return false
    }

    // Calculate similarity between normalized album names
    const similarity = this.calculateStringSimilarity(
      album1.normalizedName,
      album2.normalizedName
    )

    // Use a dynamic threshold based on whether it's the same artist
    const threshold = sameArtist ? this.similarityThreshold : 0.9

    return similarity >= threshold
  },

  /**
   * Calculate string similarity using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Similarity score (0-1)
   */
  calculateStringSimilarity(str1, str2) {
    // If either string is empty, return 0
    if (!str1 || !str2) {
      return 0
    }

    // If strings are identical, return 1
    if (str1 === str2) {
      return 1
    }

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(str1, str2)

    // Calculate similarity as 1 - (distance / max length)
    const maxLength = Math.max(str1.length, str2.length)
    return 1 - distance / maxLength
  },

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const m = str1.length
    const n = str2.length

    // Create a matrix of size (m+1) x (n+1)
    const dp = Array(m + 1)
      .fill()
      .map(() => Array(n + 1).fill(0))

    // Initialize the matrix
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i
    }

    for (let j = 0; j <= n; j++) {
      dp[0][j] = j
    }

    // Fill the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // Deletion
          dp[i][j - 1] + 1, // Insertion
          dp[i - 1][j - 1] + cost // Substitution
        )
      }
    }

    return dp[m][n]
  },

  /**
   * Normalize album name for better matching
   * @param {string} name - Album name
   * @returns {string} - Normalized album name
   */
  normalizeAlbumName(name) {
    if (!name) return ""

    // Convert to lowercase
    let normalized = name.toLowerCase()

    // Remove special editions, deluxe, etc.
    const editionPatterns = [
      /\(deluxe\s*edition\)/g,
      /\(deluxe\)/g,
      /\(expanded\s*edition\)/g,
      /\(expanded\)/g,
      /\(remastered\)/g,
      /\(remaster\)/g,
      /\(anniversary\s*edition\)/g,
      /\(special\s*edition\)/g,
      /\(bonus\s*tracks?\)/g,
      /\(digital\s*edition\)/g,
      /\(standard\s*edition\)/g,
      /\(international\s*version\)/g,
      /\(international\)/g,
      /\(explicit\)/g,
      /\(clean\)/g,
      /\[deluxe\s*edition\]/g,
      /\[deluxe\]/g,
      /\[expanded\s*edition\]/g,
      /\[expanded\]/g,
      /\[remastered\]/g,
      /\[remaster\]/g,
      /\[anniversary\s*edition\]/g,
      /\[special\s*edition\]/g,
      /\[bonus\s*tracks?\]/g,
      /\[digital\s*edition\]/g,
      /\[standard\s*edition\]/g,
      /\[international\s*version\]/g,
      /\[international\]/g,
      /\[explicit\]/g,
      /\[clean\]/g,
      /deluxe\s*edition/g,
      /expanded\s*edition/g,
      /anniversary\s*edition/g,
      /special\s*edition/g,
      /digital\s*edition/g,
      /standard\s*edition/g,
      /international\s*version/g,
    ]

    // Apply all patterns
    editionPatterns.forEach((pattern) => {
      normalized = normalized.replace(pattern, "")
    })

    // Remove punctuation and extra spaces
    normalized = normalized
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " ") // Replace multiple spaces with a single space
      .trim() // Remove leading/trailing spaces

    return normalized
  },

  /**
   * Remove duplicate songs from an array of songs
   * @param {Array} songs - Array of songs
   * @returns {Array} - Array with duplicates removed
   */
  removeDuplicateSongs(songs) {
    const uniqueSongs = {}
    const uniqueNameMap = {}

    songs.forEach((song) => {
      // First check by ID
      if (!uniqueSongs[song.id]) {
        uniqueSongs[song.id] = song

        // Also track by normalized name to catch duplicates with different IDs
        const normalizedName = song.name.toLowerCase().trim()
        uniqueNameMap[normalizedName] = uniqueNameMap[normalizedName] || []
        uniqueNameMap[normalizedName].push(song.id)
      }
    })

    // Second pass to remove duplicates by name
    const result = []
    const processedNames = new Set()

    Object.values(uniqueSongs).forEach((song) => {
      const normalizedName = song.name.toLowerCase().trim()

      // If we've already processed a song with this name, skip it
      if (processedNames.has(normalizedName)) {
        return
      }

      // Mark this name as processed
      processedNames.add(normalizedName)

      // Add the song to the result
      result.push(song)
    })

    return result
  },

  /**
   * Sort albums by different criteria
   * @param {Array} albums - Array of albums
   * @param {string} sortBy - Sort criteria
   * @returns {Array} - Sorted albums
   */
  sortAlbums(albums, sortBy = "count-desc") {
    const sortedAlbums = [...albums]

    switch (sortBy) {
      case "count-desc":
        sortedAlbums.sort((a, b) => b.songCount - a.songCount)
        break
      case "count-asc":
        sortedAlbums.sort((a, b) => a.songCount - b.songCount)
        break
      case "name-asc":
        sortedAlbums.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "name-desc":
        sortedAlbums.sort((a, b) => b.name.localeCompare(a.name))
        break
      case "artist-asc":
        sortedAlbums.sort((a, b) =>
          a.primaryArtistName.localeCompare(b.primaryArtistName)
        )
        break
      case "artist-desc":
        sortedAlbums.sort((a, b) =>
          b.primaryArtistName.localeCompare(a.primaryArtistName)
        )
        break
      default:
        sortedAlbums.sort((a, b) => b.songCount - a.songCount)
    }

    return sortedAlbums
  },

  /**
   * Search albums by name or artist
   * @param {Array} albums - Array of albums
   * @param {string} query - Search query
   * @returns {Array} - Filtered albums
   */
  searchAlbums(albums, query) {
    if (!query || query.trim() === "") {
      return albums
    }

    const normalizedQuery = query.toLowerCase().trim()

    return albums.filter((album) => {
      const albumName = album.name.toLowerCase()
      const artistName = album.primaryArtistName.toLowerCase()

      return (
        albumName.includes(normalizedQuery) ||
        artistName.includes(normalizedQuery)
      )
    })
  },

  /**
   * Get statistics about the processed data
   * @returns {Object} - Statistics
   */
  getStats() {
    return {
      totalAlbums: this.albums.length,
      totalSongs: this.albums.reduce(
        (total, album) => total + album.songCount,
        0
      ),
    }
  },
}
