import React from "react";
import { useState } from "react";

function SortBy({ setCombinedData, combinedData, original }) {
  const [sortOption, setSortOption] = useState("original");
  const [sortOrder, setSortOrder] = useState("descending");

  const handleSortChange = (e) => {
    const selectedOption = e.target.value;
    setSortOption(selectedOption);
    setSortOrder("ascending");
  };

  const toggleSortOrder = () => {
    setSortOrder((prevOrder) =>
      prevOrder === "ascending" ? "descending" : "ascending"
    );
  };

  const sortData = () => {
    let sortedData;
    toggleSortOrder();
    switch (sortOption) {
      case "original":
        sortedData = [...original.items];
        break;
      default:
        sortedData = combinedData.items.slice().sort((a, b) => {
          let compareValue = 0;

          switch (sortOption) {
            case "acousticness":
              compareValue = a.track.acousticness - b.track.acousticness;
              break;
            case "album":
              compareValue = a.track.album.name.localeCompare(
                b.track.album.name
              );
              break;
            case "artists":
              compareValue = a.track.artists[0].name.localeCompare(
                b.track.artists[0].name
              );
              break;
            case "artist_followers":
              compareValue =
                b.track.artists[0].followers.total -
                a.track.artists[0].followers.total;
              break;
            case "artist_popularity":
              compareValue =
                b.track.artists[0].popularity - a.track.artists[0].popularity;
              break;
            case "danceability":
              compareValue = a.track.danceability - b.track.danceability;
              break;
            case "duration_ms":
              compareValue = a.track.duration_ms - b.track.duration_ms;
              break;
            case "energy":
              compareValue = a.track.energy - b.track.energy;
              break;
            case "instrumentalness":
              compareValue =
                a.track.instrumentalness - b.track.instrumentalness;
              break;
            case "key":
              compareValue = a.track.key - b.track.key;
              break;
            case "liveness":
              compareValue = a.track.liveness - b.track.liveness;
              break;
            case "loudness":
              compareValue = a.track.loudness - b.track.loudness;
              break;
            case "mode":
              compareValue = a.track.mode - b.track.mode;
              break;
            case "name":
              compareValue = a.track.name.localeCompare(b.track.name);
              break;
            case "song_popularity":
              compareValue = b.track.popularity - a.track.popularity;
              break;
            case "speechiness":
              compareValue = a.track.speechiness - b.track.speechiness;
              break;
            case "tempo":
              compareValue = a.track.tempo - b.track.tempo;
              break;
            case "time_signature":
              compareValue = a.track.time_signature - b.track.time_signature;
              break;
            case "valence":
              compareValue = a.track.valence - b.track.valence;
              break;
            default:
              break;
          }
          if (sortOrder === "descending") {
            compareValue *= -1;
          }
          return compareValue;
        });
        break;
    }
    setCombinedData({ ...combinedData, items: sortedData });
  };

  return (
    <div className="sort-dropdown">
      Sort data by:
      <select id="sortType" onChange={handleSortChange} value={sortOption}>
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
      <button onClick={sortData}>Sort!</button>
      {sortOrder === "ascending" ? "Ascending" : "Descending"}
    </div>
  );
}

export default SortBy;
