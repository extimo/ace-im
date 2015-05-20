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
	socket.on('getAllMessages', function(room){
		if(!messages[room]){
			messages[room] = [];
		}
		socket.emit('allMessages', messages[room]);
	});
	socket.on('createMessage', function(data){
		console.log('room: ' + data.room + ' message: ' + data.message);
		if(!messages[data.room]){
			messages[data.room] = [];
		}
		messages[data.room].push(data.message);
		if(messages[data.room].length > 500){
			messages[data.room] = messages[data.room].slice(300);
		}
		io.sockets.emit('messageAdded', data);
	});
});

