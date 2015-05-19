var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 3000));
app.use(express.static(__dirname + '/public'));

app.use(function(req, res){
	res.sendFile('index.html');
});

var io = require('socket.io').listen(app.listen(app.get('port'), function() {
	console.log('Node app is running on port', app.get('port'));
}));

var messages = [];

io.sockets.on('connection', function(socket){	
	socket.on('getAllMessages', function(){
		socket.emit('allMessages', messages);
	});
	socket.on('createMessage', function(message){
		messages.push(message);
		if(messages.length > 500){
			messages = messages.slice(300);
		}
		io.sockets.emit('messageAdded', message);
	});
});

