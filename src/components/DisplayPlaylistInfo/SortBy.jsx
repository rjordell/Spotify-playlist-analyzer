import React from "react";
import { useState } from "react";

function SortBy({ setCombinedData, combinedData, original }) {
  const [sortOption, setSortOption] = useState("original");
  const [sortOrder, setSortOrder] = useState("descending");

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
        sortedData = [...original.items];
        break;
    }
    setCombinedData({ ...combinedData, items: sortedData });
  };

  const handleSortChange2 = (e) => {
    const selectedOption = e.target.value;

    let sortedData;

    switch (selectedOption) {
      case "original":
        sortedData = [...original.items];
        break;
      default:
        sortedData = combinedData.items.slice().sort((a, b) => {
          let compareValue = 0;

          switch (selectedOption) {
            case "acousticness":
              compareValue = a.acousticness - b.acousticness;
              break;
            case "album":
              compareValue = a.album.name.localeCompare(b.album.name);
              break;
            case "artists":
              compareValue = a.artists[0].name.localeCompare(b.artists[0].name);
              break;
            case "artist_followers":
              compareValue =
                b.artists[0].followers.total - a.artists[0].followers.total;
              break;
            case "artist_popularity":
              compareValue = b.artists[0].popularity - a.artists[0].popularity;
              break;
            case "danceability":
              compareValue = a.danceability - b.danceability;
              break;
            case "duration_ms":
              compareValue = a.duration_ms - b.duration_ms;
              break;
            case "energy":
              compareValue = a.energy - b.energy;
              break;
            case "instrumentalness":
              compareValue = a.instrumentalness - b.instrumentalness;
              break;
            case "key":
              compareValue = a.key - b.key;
              break;
            case "liveness":
              compareValue = a.liveness - b.liveness;
              break;
            case "loudness":
              compareValue = a.loudness - b.loudness;
              break;
            case "mode":
              compareValue = a.mode - b.mode;
              break;
            case "name":
              compareValue = a.name.localeCompare(b.name);
              break;
            case "song_popularity":
              compareValue = b.popularity - a.popularity;
              break;
            case "speechiness":
              compareValue = a.speechiness - b.speechiness;
              break;
            case "tempo":
              compareValue = a.tempo - b.tempo;
              break;
            case "time_signature":
              compareValue = a.time_signature - b.time_signature;
              break;
            case "valence":
              compareValue = a.valence - b.valence;
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

  const handleSortChange3 = (e) => {
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
      <select id="sortType" onChange={handleSortChange3} value={sortOption}>
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
