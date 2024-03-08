import React from "react";

function Playlist(props) {
  //console.log("PLAYLIST.JS: ", props.playlist);
  const handleClick = () => {
    //console.log(props.playlist);
    props.cancelFetches();
    props.setSelectedPlaylist(props.playlist);
    props.setSelectedPlaylist({
      id: props.playlist.id,
      coverImg: props.playlist.images[0].url,
      title: props.playlist.name,
      owner: props.playlist.owner.display_name,
      publicity: props.playlist.public,
      description: props.playlist.description,
      snapshot_id: props.playlist.snapshot_id,
    });
  };
  return (
    <div className="container playlist" onClick={handleClick}>
      <div className="imageAndTitle">
        <img
          src={props.playlist.images[0].url}
          className="coverImg playlist"
          alt=""
        />

        <div className="now-playing__side">
          <div className="containerHeader">{props.playlist.name}</div>

          <div className="containerSubheader">
            {props.playlist.owner.display_name}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Playlist;
