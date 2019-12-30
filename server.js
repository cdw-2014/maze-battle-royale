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

io.sockets.on('connection', function(socket) {
	console.log('Client: ' + socket.id);
	socket.on('createLobby', function(data) {
		let { code, name } = data;
		if (name.length == 0) {
			name = 'Player1';
		}
		console.log("Received: 'createLobby' " + code + ' ' + socket.id);
		lobbies.push({
			code    : code,
			host    : socket.id,
			players : [
				{ name: name, id: socket.id }
			]
		});
		socket.join(code);
	});
	socket.on('joinLobby', function(data, callback) {
		let { code, name } = data;
		console.log("Received: 'joinLobby' " + code + ' ' + socket.id);
		for (let lobby of lobbies) {
			if (lobby.code === code) {
				let nameExists = false;
				if (name.length == 0) {
					name = 'Player' + String(lobby.players.length + 1);
				}
				for (let player of lobby.players) {
					if (player.name === name) {
						nameExists = true;
					}
				}
				if (!nameExists) {
					lobby.players.push({ name: name, id: socket.id });
					socket.join(code);
					io.to(code).emit('playerJoined', socket.id + ' has joined the lobby.');
					callback(true);
				} else {
					callback(false, 'A player with the same name is already in this lobby!');
				}
			}
		}
		callback(false, 'Invalid Lobby Code!');
	});
	socket.on('generation', function(data) {
		let { grid, code } = data;
		console.log("Received: 'generation' " + code);
		io.to(code).emit('updateMaze', grid);
	});
	socket.on('finishedMaze', function(code, callback) {
		// FIND CORRECT LOBBY
		for (let lobby of lobbies) {
			if (lobby.code === code) {
				// CREATE RANKING ORDER THAT RESETS AFTER EACH MAZE
				if (!lobby.hasOwnProperty('mazeRank')) {
					lobby.mazeRank = [];
				}
				// PUSH PLAYERS TO MAZE RANKING AS THEY FINISH
				lobby.mazeRank.push(socket.id);
				// CREATE LEADERBOARD (ONLY FOR FIRST MAZE) AND INITIATE SCORES TO ZERO
				if (!lobby.hasOwnProperty('leaderboard')) {
					lobby.leaderboard = [];
					for (let player of lobby.players) {
						lobby.leaderboard.push({ name: player.name, score: 0 });
					}
				}
				// FIND PLAYER NAME FROM SOCKET ID
				for (let player of lobby.players) {
					if (player.id === socket.id) {
						for (let leader of lobby.leaderboard) {
							if (leader.name === player.name) {
								// INCREMENT SCORE FOR PLAYER
								leader.score += 20 * (lobby.players.length / lobby.mazeRank.length);
							}
						}
					}
				}
				lobby.leaderboard = lobby.leaderboard.sort((a, b) => b.score - a.score);
				let isFinished = lobby.mazeRank.length >= lobby.players.length;
				if (isFinished) {
					delete lobby.mazeRank;
				}
				io.to(code).emit('updateLeaderboard', { newLeaderboard: lobby.leaderboard, isFinished });
				callback(true);
			}
		}
		callback(false);
	});
	socket.on('disconnect', function() {
		console.log(`${socket.id} has disconnected`);
		lobbies = lobbies.filter((lobby) => lobby.host !== socket.id);
		for (let lobby of lobbies) {
			lobby.players = lobby.players.filter((player) => player !== socket.id);
		}
	});
});
