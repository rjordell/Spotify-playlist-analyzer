import React from 'react';
import {useState, useEffect} from 'react';

function Track(props) {
    const [track, setTrack] = useState(null);
    const [artist, setArtist] = useState(null);
    const getArtistInfo = async (id) => {
        const response = await fetch('/auth/getArtistInfo/' + id);
        const data = await response.json();
        setArtist(data);
        console.log(data);
    }

    const getTrackInfo = async (id) => {
        try {
            const response = await fetch('/auth/getTrackInfo/' + id);
            const data = await response.json();
            if (data.error) {
                setTrack(null);
            } else {
                setTrack(data);
                getArtistInfo(data.artists[0].id);
            }
            console.log(data);
        } catch (error) {
            console.error('Error retrieving track info:', error);
            setTrack(null);
            setArtist(null);
        }
    }
    
    useEffect(() => {
        getTrackInfo(props.id);
    }, [props.id]);

    return (
        <>
                {
                track !== null ? (
                    <>
                        <img src={track.album.images[0].url} className="track_cover" alt="" />
                        Name: {track.name}
                        <br />
                        Album: {track.album.name}
                        <br />
                        Artist: {track.artists[0].name}
                        <br />
                        Song Popularity: {track.popularity}
                        <br />
                        {artist !== null ? (
                            <>
                                Artist Popularity: {artist.popularity}
                            </>
                        ) : null}
                    </>
                ) : (
                    <>Input a valid track id!</>
                )
                
                }
        </>
    );
}

export default Track;

