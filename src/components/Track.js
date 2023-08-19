import React from 'react';
import {useState, useEffect} from 'react';

function Track(props) {
    const [track, setTrack] = useState(null);
    const [artist, setArtist] = useState(null);
    
    return (
        <div className="main-wrapper3">

                    <>
                        <img src={props.track.album.images[0].url} className="track_cover" alt="" />
                        Name: {props.track.name}
                        Album: {props.track.album.name}
                        Artist: {props.track.artists[0].name}
                        Song Popularity: {props.track.popularity}
                        Artist Popularity: {props.artist.popularity}
                    </>

        </div>
    );
}

export default Track;

