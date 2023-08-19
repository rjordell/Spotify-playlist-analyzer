const express = require('express')
const request = require('request');
const dotenv = require('dotenv') 

const port = 5000

global.access_token = ''

dotenv.config({path:'test.env'})

var spotify_client_id = process.env.SPOTIFY_CLIENT_ID
var spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET

var spotify_redirect_uri = 'http://localhost:3000/auth/callback'

var generateRandomString = function (length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var splitArrayIntoChunks = function (arr, chunkSize) {
   const chunks = [];
   for (let i = 0; i < arr.length; i += chunkSize) {
       chunks.push(arr.slice(i, i + chunkSize));
   }
   return chunks;
}

var app = express();

app.get('/auth/login', (req, res) => {

  var scope = "streaming user-read-email user-read-private"
  var state = generateRandomString(16);

  var auth_query_parameters = new URLSearchParams({
    response_type: "code",
    client_id: spotify_client_id,
    scope: scope,
    redirect_uri: spotify_redirect_uri,
    state: state
  })

  res.redirect('https://accounts.spotify.com/authorize/?' + auth_query_parameters.toString());
})

app.get('/auth/getPlaylistinfo/:id', (req, res) => {

  const playlistId = req.params.id;

  request.get(
    `https://api.spotify.com/v1/playlists/${playlistId}`,
    {
       headers: {
          Authorization: `Bearer ${access_token}`,
       },
    },
    (error, response, body) => {
       if (!error && response.statusCode === 200 ) {
          const playlistInfo = JSON.parse(body);
          res.json(playlistInfo);
       } else {
          res.status(response.statusCode).json({ error: "Invalid playlist id" });
       }
    }
  );
})

app.get('/auth/getAllPlaylistTracks/:id', (req, res) => {
   const playlistId = req.params.id;

   let allTracks = [];
   let data = null;
   

   const fetchTracks = (url) => {
       request.get(
           url,
           {
               headers: {
                   Authorization: `Bearer ${access_token}`,
               },
           },
           (error, response, body) => {
               if (!error && response.statusCode === 200) {
                   const TrackItems = JSON.parse(body)
                   allTracks = allTracks.concat(TrackItems.items);
                   if (TrackItems.next) {
                     fetchTracks(TrackItems.next);
                   } else {
                     data.tracks.items = allTracks
                     res.json(data);
                   }
               } else {
                   res.status(response.statusCode).json({ error: "Invalid playlist id" });
               }
           }
       );
   };

   request.get(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
         headers: {
            Authorization: `Bearer ${access_token}`,
         },
      },
      (error, response, body) => {
         if (!error && response.statusCode === 200 ) {
             data = JSON.parse(body);
            if (data.tracks.next) {
               allTracks = allTracks.concat(data.tracks.items);
               fetchTracks(data.tracks.next);
            } else {
               res.json(data);
            }
         } else {
            res.status(response.statusCode).json({ error: "Invalid playlist id" });
         }
      }
   );
});


app.get('/auth/getMultipleTracksAudioFeatures/:ids', async (req, res) => {
   const trackIds = req.params.ids.split(','); 
   const chunkedIds = splitArrayIntoChunks(trackIds, 100); 

   const trackInfoPromises = [];

   for (const chunk of chunkedIds) {
       const trackIdsString = chunk.join(',');
       const promise = new Promise((resolve, reject) => {
           request.get(
               `https://api.spotify.com/v1/audio-features?ids=${trackIdsString}`,
               {
                   headers: {
                       Authorization: `Bearer ${access_token}`,
                   },
               },
               (error, response, body) => {
                   if (!error && response.statusCode === 200) {
                       const trackInfo = JSON.parse(body);
                       //console.log("track info: ")
                       //console.log(trackInfo)
                       resolve(trackInfo);
                   } else {
                       reject(error);
                   }
               }
           );
       });
       trackInfoPromises.push(promise);
   }

   try {
       const trackInfoResults = await Promise.all(trackInfoPromises);
       //console.log("track info results: ")
       //console.log(trackInfoResults)
       const combinedTrackInfo = trackInfoResults.reduce(
           (accumulator, current) => accumulator.concat(current.audio_features),
           []
       );
       res.json({ tracks: combinedTrackInfo });
       //console.log("combined track info: ")
       //console.log(combinedTrackInfo)
   } catch (error) {
       res.status(500).json({ error: 'Error fetching track information' });
   }
});

app.get('/auth/getMultipleArtists/:ids', async (req, res) => {
   const artistIds = req.params.ids.split(','); 
   const chunkedIds = splitArrayIntoChunks(artistIds, 50); 

   const artistInfoPromises = [];

   for (const chunk of chunkedIds) {
       const artistIdsString = chunk.join(',');
       const promise = new Promise((resolve, reject) => {
           request.get(
               `https://api.spotify.com/v1/artists?ids=${artistIdsString}`,
               {
                   headers: {
                       Authorization: `Bearer ${access_token}`,
                   },
               },
               (error, response, body) => {
                   if (!error && response.statusCode === 200) {
                       const artistInfo = JSON.parse(body);
                       //console.log("artist info: ")
                       //console.log(artistInfo)
                       resolve(artistInfo);
                   } else {
                       reject(error);
                   }
               }
           );
       });
       artistInfoPromises.push(promise);
   }

   try {
       const artistInfoResults = await Promise.all(artistInfoPromises);
       //console.log("artist info results: ")
       //console.log(artistInfoResults)
       const combinedArtistInfo = artistInfoResults.reduce(
           (accumulator, current) => accumulator.concat(current.artists),
           []
       );
       res.json({ artists: combinedArtistInfo });
       //console.log("combined artist info: ")
       //console.log(combinedArtistInfo)
   } catch (error) {
       res.status(500).json({ error: 'Error fetching artist information' });
   }
});


app.get('/auth/getTrackinfo/:id', (req, res) => {

  const trackId = req.params.id;

  request.get(
    `https://api.spotify.com/v1/tracks/${trackId}`,
    {
       headers: {
          Authorization: `Bearer ${access_token}`,
       },
    },
    (error, response, body) => {
       if (!error && response.statusCode === 200 ) {
          const trackInfo = JSON.parse(body);
          res.json(trackInfo);
       } else {
          res.status(response.statusCode).json({ error: "Invalid track id" });
       }
    }
 );
})

app.get('/auth/getArtistInfo/:id', (req, res) => {

  const artistId = req.params.id;

  request.get(
    `https://api.spotify.com/v1/artists/${artistId}`,
    {
       headers: {
          Authorization: `Bearer ${access_token}`,
       },
    },
    (error, response, body) => {
       if (!error && response.statusCode === 200 ) {
          const artistInfo = JSON.parse(body);
          res.json(artistInfo);
       } else {
          res.status(response.statusCode).json({ error: "Invalid artist id" });
       }
    }
 );
})

app.get('/auth/callback', (req, res) => {

  var code = req.query.code;

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: spotify_redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + (Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64')),
      'Content-Type' : 'application/x-www-form-urlencoded'
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      access_token = body.access_token;
      res.redirect('/')
    }
  });

})

app.get('/auth/token', (req, res) => {
  res.json({ access_token: access_token})
})

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})
