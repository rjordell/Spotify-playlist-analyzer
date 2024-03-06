import React from "react";

function Shuffle({ playlistId, setCombinedData }) {
    const groupByArtists = async () => {
        try {
          const response = await fetch(
            `/auth/playlist/shuffleTracks/${playlistId}`,
          );
          const data = await response.json();
          if (data.error) {
          } else {
            console.log("SHUFFLE.JS: shuffled playlist ", data)
            setCombinedData(data.tracks);
            //console.log("SHUFFLE.JS: data from groupByArtists genresCount ", data[0].genresCount)
          }
        } catch (error) {
            console.error("Error retrieving grouped data:", error);
        }
      };

  return (
    <>
      <button onClick={groupByArtists}>Get Groups!</button>
    </>
  );
}

export default Shuffle;
