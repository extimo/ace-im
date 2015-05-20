var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 3000));
app.use(express.static(__dirname + '/public'));

app.use(function(req, res){
	res.sendFile('./public/index.html');
});

var io = require('socket.io').listen(app.listen(app.get('port'), function() {
	console.log('Node app is running on port', app.get('port'));
}));

var messages = [[]];

io.sockets.on('connection', function(socket){	
	socket.on('getAllMessages', function(i){
		room = parseInt(i);
		socket.emit('allMessages', messages[room]);
	});
	socket.on('createMessage', function(i, message){
		room = parseInt(i);
		messages[room].push(message);
		if(messages[room].length > 500){
			messages[room] = messages[room].slice(300);
		}
		io.sockets.emit('messageAdded', room, message);
	});
});

