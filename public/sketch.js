var cols, rows;
var w = 30;
var grid = [];
var available = [];
var current;
var cursorX = 0;
var cursorY = 0;
var selected;
var sets = [];
var wallsRemoved = 0;
var showControls = true;
var host = false;
var gameCode = '';
var inGame = false;
var isGenerated = false;
var isMazeComplete = false;
var displayName = '';
var leaderboard = [];

var socket;
let waitingP;
let leaderboardP;
var io = require('socket.io-client');

function setup() {
	socket = io();
	socket.on('playerJoined', function(player) {
		console.log(player);
	});
	socket.on('updateMaze', function(newGrid) {
		grid = [];
		cursorX = 0;
		cursorY = 0;
		sets = [];
		isGenerated = false;
		isMazeComplete = false;
		isFinished = false;
		wallsRemoved = 0;
		for (let cell of newGrid) {
			grid.push(new Cell(cell.i, cell.j, cell.walls));
		}
		if (waitingP !== undefined) {
			waitingP.remove();
		}
		inGame = true;
		isGenerated = true;
	});
	socket.on('updateLeaderboard', function(data) {
		let { newLeaderboard, isFinished } = data;
		leaderboard = newLeaderboard;
		if (leaderboardP !== undefined) {
			leaderboardP.remove();
		}
		leaderboardP = createP(leaderboardToString());
		if (host && isFinished) {
			reset();
		}
	});
	createCanvas(600, 600);
	cols = floor(width / w);
	rows = floor(height / w);
	let enterName = createInput().attribute('placeholder', 'Enter Display Name');
	enterName.position(50, 50);
	let createLobbyButton = createButton('Create Lobby');
	createLobbyButton.position(50, 100);
	let lobbyInput = createInput().attribute('placeholder', 'Enter Code');
	lobbyInput.position(50, 175);
	let joinButton = createButton('Join');
	joinButton.position(50, 200);
	let joinError;

	joinButton.mousePressed(() => {
		displayName = enterName.value();
		socket.emit('joinLobby', { code: lobbyInput.value(), name: displayName }, function(joined, err) {
			console.log(err);
			if (joined) {
				gameCode = lobbyInput.value();
				createLobbyButton.remove();
				lobbyInput.remove();
				joinButton.remove();
				enterName.remove();
				waitingP = createElement('h1', 'Waiting for host to start game...');
				waitingP.position(50, 50);
			}
		});
	});

	createLobbyButton.mousePressed(() => {
		displayName = enterName.value();
		createLobbyButton.remove();
		lobbyInput.remove();
		joinButton.remove();
		enterName.remove();
		createLobby();
	});
}

function createLobby() {
	host = true;
	let code =
		char(random(65, 91)) +
		char(random(65, 91)) +
		char(random(65, 91)) +
		char(random(65, 91)) +
		char(random(65, 91)) +
		char(random(65, 91));
	let lobbyCode = createP(`Lobby Code: ${code}`);
	lobbyCode.position(50, 50);
	let startGameButton = createButton('Start Game');
	startGameButton.position(50, 125);
	socket.emit('createLobby', { code: code, name: displayName });
	gameCode = code;
	startGameButton.mousePressed(() => {
		lobbyCode.remove();
		startGameButton.remove();
		inGame = true;
		reset();
	});
}

function reset() {
	grid = [];
	cursorX = 0;
	cursorY = 0;
	sets = [];
	isGenerated = false;
	isMazeComplete = false;
	isFinished = false;
	wallsRemoved = 0;
	for (var j = 0; j < rows; j++) {
		for (var i = 0; i < cols; i++) {
			var cell = new Cell(i, j);
			grid.push(cell);
			sets.push([
				cell.id
			]);
		}
	}
	available = grid;
	current = grid[int(random(0, rows * cols))];
	draw();
}

function finishedMaze(tries = 0) {
	if (tries > 0) return;
	socket.emit('finishedMaze', gameCode, function(registered) {
		registered ? (isMazeComplete = true) : finishedMaze(tries + 1);
	});
}

function draw() {
	if (inGame && !isMazeComplete) {
		background(0);
		for (var i = 0; i < grid.length; i++) {
			grid[i].show();
		}
		if (isGenerated) {
			selected = grid.filter((cell) => cell.i === cursorX && cell.j === cursorY)[0];
			selected.highlight();
			grid[grid.length - 1].highlight(true);
			if (grid[grid.length - 1].id === selected.id) {
				finishedMaze();
			}
		} else {
			if (wallsRemoved < cols * rows - 1) {
				if (!current.isFinished) {
					// CHOOSE RANDOM NEIGHBOR
					var neighbor = current.randomNeighbor();
					var mergedSet, removedSet, removedIndex;
					if (neighbor) {
						// FIND THE SETS THAT CURRENT AND NEIGHBOR ARE IN
						for (var i = 0; i < sets.length; i++) {
							if (sets[i].includes(current.id)) {
								mergedSet = sets[i];
							} else if (sets[i].includes(neighbor.id)) {
								removedSet = sets[i];
								removedIndex = i;
							}
						}
						// ADD NEIGHBOR TO CURRENT SET (UNION THE CELLS) AND DELETE NEIGHBOR'S SET
						if (removedSet !== undefined) {
							for (var i = 0; i < removedSet.length; i++) {
								mergedSet.push(removedSet[i]);
							}
							sets.splice(removedIndex, 1);
							// REMOVE WALLS FROM BETWEEN CURRENT AND NEIGHBOR
							removeWalls(current, neighbor);
						}
					} else if (sets.length > 1) {
						current.isFinished = true;
						available = available.filter((cell) => cell.id !== current.id);
					}
				}
				// GET NEW CURRENT (RANDOM)
				current = available[int(random(0, available.length))];
				draw();
			} else {
				socket.emit('generation', { grid: grid, code: gameCode });
				isGenerated = true;
			}
		}
	}
}

// cell.i == x coord
//cell.j == y coord
function keyPressed() {
	if (key == 'R' || key == 'r') {
		cursorX = 0;
		cursorY = 0;
	} else if ((key == 'W' || key == 'w') && cursorY > 0) {
		if (!selected.walls[0]) {
			cursorY--;
		}
	} else if ((key == 'A' || key == 'a') && cursorX > 0) {
		if (!selected.walls[3]) {
			cursorX--;
		}
	} else if ((key == 'S' || key == 's') && cursorY < rows - 1) {
		if (!selected.walls[2]) {
			cursorY++;
		}
	} else if ((key == 'D' || key == 'd') && cursorX < cols - 1) {
		if (!selected.walls[1]) {
			cursorX++;
		}
	}
	selected = grid.filter((cell) => cell.i === cursorX && cell.j === cursorY)[0];
	selected.highlight();
}

function mouseMoved() {
	let mousePositionX = floor(mouseX / w);
	let mousePositionY = floor(mouseY / w);
	let differenceX = mousePositionX - cursorX;
	let differenceY = mousePositionY - cursorY;
	if (mousePositionX >= 0 && mousePositionX < width / w && mousePositionY >= 0 && mousePositionY < height / w) {
		if (differenceX === 1 && differenceY === 0 && !selected.walls[1]) {
			cursorX = mousePositionX;
			cursorY = mousePositionY;
		} else if (differenceX === -1 && differenceY === 0 && !selected.walls[3]) {
			cursorX = mousePositionX;
			cursorY = mousePositionY;
		} else if (differenceX === 0 && differenceY === 1 && !selected.walls[2]) {
			cursorX = mousePositionX;
			cursorY = mousePositionY;
		} else if (differenceX === 0 && differenceY === -1 && !selected.walls[0]) {
			cursorX = mousePositionX;
			cursorY = mousePositionY;
		}
	}
	selected = grid[index(mousePositionX, mousePositionY)];
	selected.highlight();
}

function index(i, j) {
	if (i < 0 || j < 0 || i > cols - 1 || j > rows - 1) {
		return -1;
	}
	return i + j * cols;
}

function leaderboardToString() {
	let string = '';
	for (let leader of leaderboard) {
		string += leader.name + ': ' + leader.score + '\n';
	}
	return string;
}

function removeWalls(a, b) {
	var x = a.i - b.i;
	if (x === 1) {
		a.walls[3] = false;
		b.walls[1] = false;
	} else if (x === -1) {
		a.walls[1] = false;
		b.walls[3] = false;
	}
	var y = a.j - b.j;
	if (y === 1) {
		a.walls[0] = false;
		b.walls[2] = false;
	} else if (y === -1) {
		a.walls[2] = false;
		b.walls[0] = false;
	}
	wallsRemoved++;
}
