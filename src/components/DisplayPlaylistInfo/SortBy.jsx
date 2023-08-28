import React from "react";

function SortBy({ setCombinedData, combinedData, original }) {
  const handleSortChange = (e) => {
    const selectedOption = e.target.value;

    let sortedData;

    switch (selectedOption) {
      case "original":
        sortedData = [...original.items];
        break;
      case "acousticness":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.acousticness - b.acousticness;
        });
        break;
      case "album":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.album.name.localeCompare(b.album.name);
        });
        break;
      case "artists":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.artists[0].name.localeCompare(b.artists[0].name);
        });
        break;
      case "artist_followers":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return b.artists[0].followers.total - a.artists[0].followers.total;
        });
        break;
      case "artist_popularity":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return b.artists[0].popularity - a.artists[0].popularity;
        });
        break;
      case "danceability":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.danceability - b.danceability;
        });
        break;
      case "duration_ms":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.duration_ms - b.duration_ms;
        });
        break;
      case "energy":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.energy - b.energy;
        });
        break;
      case "instrumentalness":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.instrumentalness - b.instrumentalness;
        });
        break;
      case "key":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.key - b.key;
        });
        break;
      case "liveness":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.liveness - b.liveness;
        });
        break;
      case "loudness":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.loudness - b.loudness;
        });
        break;
      case "mode":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.mode - b.mode;
        });
        break;
      case "name":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
        break;
      case "song_popularity":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return b.popularity - a.popularity;
        });
        break;
      case "speechiness":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.speechiness - b.speechiness;
        });
        break;
      case "tempo":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.tempo - b.tempo;
        });
        break;
      case "time_signature":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.time_signature - b.time_signature;
        });
        break;
      case "valence":
        sortedData = combinedData.items.slice().sort((a, b) => {
          return a.valence - b.valence;
        });
        break;
      default:
        sortedData = [...original.items]; // Default to original order
        break;
    }
    setCombinedData({ ...combinedData, items: sortedData });
  };
  return (
    <div className="sort-dropdown">
      <select id="sort" onChange={handleSortChange}>
        <option value="original">Original Order</option>
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
