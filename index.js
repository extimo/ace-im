var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 3000));
app.use(express.static(__dirname + '/public'));

app.use(function(req, res){
	res.sendFile(__dirname + '/public/index.html');
});

var io = require('socket.io').listen(app.listen(app.get('port'), function() {
	console.log('Node app is running on port', app.get('port'));
}));

var messages = {};

io.sockets.on('connection', function(socket){
	var user = null;
	var room = null;
	var sig = new Date().getTime();
	socket.on('getAllMessages', function(room){
		if(!messages[room]){
			messages[room] = [];
		}
		socket.emit('allMessages', messages[room]);
	});
	socket.on('ping', function(){
		socket.emit('pong', sig);
	});
	socket.on('createMessage', function(data){
		sig = new Date().getTime();
		messages[data.room].push(data.message);
		if(messages[data.room].length > 500){
			messages[data.room] = messages[data.room].slice(300);
		}
		io.sockets.emit('messageAdded', data);
	});
	socket.on('userOnline', function(data){
		sig = new Date().getTime();
		user = data.user;
		room = data.room;
		var msg = {content: user + ' now online.', createAt: new Date(), from: 'SYSTEM'};
		if(!messages[room]){
			messages[room] = [];
		}
		socket.emit('allMessages', messages[room]);
		io.sockets.emit('messageAdded', {room: room, message: msg});
	});
	socket.on('disconnect', function(){
		sig = new Date().getTime();
		var msg = {content: user + ' now offline.', createAt: new Date(), from: 'SYSTEM'};
		io.sockets.emit('messageAdded', {room: room, message: msg});
	});
});

