var express = require('express');
var app = express();
var server = app.listen(process.env.PORT || 3000, listen);

function listen() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://' + host + ':' + port);
}

app.use(express.static('public'));
var io = require('socket.io')(server);

let lobbies = [];

io.sockets.on('connection',
  function (socket) {
    console.log("Client: " + socket.id);
    socket.on('createLobby',
      function(code) {
        console.log("Received: 'createLobby' " + code + " " + socket.id);
        lobbies.push({code: code, host: socket.id, players: [socket.id]});
        socket.join(code);
        console.log(lobbies);
      }
    );
    socket.on('joinLobby',
      function(code, callback) {
        console.log("Received: 'joinLobby' " + code + " " + socket.id);
        for(let lobby of lobbies) {
            if(lobby.code === code) {
                lobby.players.push(socket.id);
                console.log(lobbies);
                socket.join(code);
                io.to(code).emit('playerJoined', socket.id + " has joined the lobby.");
                callback(true);
            }
        }
        callback(false);
      }
    );
    socket.on('generation',
      function(data) {
        let { grid, code } = data;
        console.log("Received: 'generation' " + grid + " " + code);
        io.to(code).emit('updateMaze', grid);
      }
    );
    socket.on('disconnect', function() {
      console.log(`${socket.id} has disconnected`);
      lobbies = lobbies.filter(lobby => lobby.host !== socket.id);
      for(let lobby of lobbies) {
          lobby.players = lobby.players.filter(player => player !== socket.id)
      }
      console.log(lobbies);
    });
  }
);