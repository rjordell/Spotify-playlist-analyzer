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
                        <br/>
                        Album: {props.track.album.name}
                        <br/>
                        Artist: {props.track.artists[0].name}
                        <br/>
                        Song Popularity: {props.track.popularity}
                        <br/>
                        Artist Popularity: {props.artist.popularity}
                    </>
                    <div>
                        Danceability: {props.audioFeatures.danceability}
                        <br/>
                        Energy: {props.audioFeatures.energy}
                        <br/>
                        Tempo: {props.audioFeatures.tempo}
                        <br/>
                        Valence: {props.audioFeatures.valence}
                    </div>

        </div>
    );
}

export default Track;

