import React from "react";

function SortBy({ setCombinedData, combinedData }) {
  const handleSortChange = (e) => {
    const selectedOption = e.target.value;

    const sortedData = combinedData.items.slice().sort((a, b) => {
      switch (selectedOption) {
        case "acousticness":
          return a.acousticness - b.acousticness;
        case "album":
          return a.album.name.localeCompare(b.album.name);
        case "artists":
          return a.artists[0].name.localeCompare(b.artists[0].name);
        case "artist_followers":
          return b.artists[0].followers.total - a.artists[0].followers.total;
        case "artist_popularity":
          return b.artists[0].popularity - a.artists[0].popularity;
        case "danceability":
          return a.danceability - b.danceability;
        case "duration_ms":
          return a.duration_ms - b.duration_ms;
        case "energy":
          return a.energy - b.energy;
        case "instrumentalness":
          return a.instrumentalness - b.instrumentalness;
        case "key":
          return a.key - b.key;
        case "liveness":
          return a.liveness - b.liveness;
        case "loudness":
          return a.loudness - b.loudness;
        case "mode":
          return a.mode - b.mode;
        case "name":
          return a.name.localeCompare(b.name);
        case "song_popularity":
          return b.popularity - a.popularity;
        case "speechiness":
          return a.speechiness - b.speechiness;
        case "tempo":
          return a.tempo - b.tempo;
        case "time_signature":
          return a.time_signature - b.time_signature;
        case "valence":
          return a.valence - b.valence;
        default:
          return 0;
      }
    });
    setCombinedData({ ...combinedData, items: sortedData });
  };
  return (
    <div className="sort-dropdown">
      <label htmlFor="sort">Sort By:</label>
      <select id="sort" onChange={handleSortChange}>
        <option value="acousticness">Acousticness</option>
        <option value="album">Album</option>
        <option value="artists">Artists</option>
        <option value="artist_followers">Artist Followers</option>
        <option value="artist_popularity">Artist Popularity</option>
        <option value="danceability">Danceability</option>
        <option value="duration_ms">Duration (ms)</option>
        <option value="energy">Energy</option>
        <option value="instrumentalness">Instrumentalness</option>
        <option value="key">Key</option>
        <option value="liveness">Liveness</option>
        <option value="loudness">Loudness</option>
        <option value="mode">Mode</option>
        <option value="name">Name</option>
        <option value="song_popularity">Song Popularity</option>
        <option value="speechiness">Speechiness</option>
        <option value="tempo">Tempo</option>
        <option value="time_signature">Time Signature</option>
        <option value="valence">Valence</option>
      </select>
    </div>
  );
}

export default SortBy;
