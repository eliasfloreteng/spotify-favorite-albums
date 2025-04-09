# Spotify Favorite Albums

A web application that analyzes your Spotify liked songs and identifies your favorite albums based on which albums have the most liked songs. The app uses fuzzy matching to handle different album variations (like deluxe editions).

## Features

- Connect to your Spotify account
- Analyze your liked/saved songs
- Group songs by album with fuzzy matching for different album versions
- Sort albums by number of liked songs
- Search albums by name or artist
- View songs from each album
- Responsive design for desktop and mobile

## Setup

1. **Create a Spotify Developer Application**:

   - Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Log in with your Spotify account
   - Click "Create an App"
   - Fill in the app name and description
   - Set the Redirect URI to exactly `http://127.0.0.1:3000/` (including the trailing slash)
   - Copy your Client ID (you'll need it when you run the app)

2. **Run the Application**:
   - Start a local HTTP server in the project directory:
     ```
     python -m http.server 3000
     ```
   - Open `http://127.0.0.1:3000` in your web browser
   - When prompted, enter your Spotify Client ID
   - Authorize the application to access your Spotify data
   - Wait for the app to fetch and process your liked songs

## How It Works

1. **Authentication**: The app uses the Authorization Code Flow with PKCE to authenticate with Spotify, which doesn't require a server but is more secure than the deprecated Implicit Grant Flow.

2. **Data Fetching**: The app fetches all your liked songs from Spotify, handling pagination efficiently to support users with thousands of songs.

3. **Fuzzy Matching**: The app uses a string similarity algorithm to group different versions of the same album (e.g., "Album Name" and "Album Name (Deluxe Edition)").

4. **Results Display**: Albums are displayed in a grid, sorted by the number of liked songs. You can click on an album to see the list of your liked songs from that album.

## Technical Details

- **Pure JavaScript**: No frameworks or build tools required
- **Responsive Design**: Works on desktop and mobile devices
- **Local Storage**: Saves your Client ID and authentication token for convenience
- **Efficient Data Processing**: Optimized for handling large libraries with thousands of songs

## Privacy

This app runs entirely in your browser and doesn't send your data anywhere. Your Spotify credentials and liked songs data never leave your device.

## License

MIT
