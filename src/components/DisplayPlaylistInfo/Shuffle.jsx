import React from "react";

function Shuffle({ playlistId }) {
    const groupByArtists = async () => {
        try {
          const response = await fetch(
            `/auth/playlist/groupByArtists/${playlistId}`,
          );
          const data = await response.json();
          if (data.error) {
          } else {
            console.log("SHUFFLE.JS: data from groupByArtists ", data)
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
