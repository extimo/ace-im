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
	
	socket.on('getAllMessages', function(){
		socket.emit('allMessages', messages[room]);
	});
	socket.on('ping', function(){
		socket.emit('pong', sig);
	});
	socket.on('createMessage', function(msg){
		sig = new Date().getTime();
		messages[room].push(msg);
		if(messages[room].length > 500){
			messages[room] = messages[room].slice(300);
		}
		socket.in(room).broadcast.emit('messageAdded', msg);
	});
	socket.on('userOnline', function(data){
		sig = new Date().getTime();
		user = data.user;
		room = data.room;
		var msg = {content: user + ' now online.', createAt: new Date(), from: 'SYSTEM'};
		if(!messages[room]){
			messages[room] = [];
		}
		socket.join(room);
		socket.emit('allMessages', messages[room]);
		socket.in(room).broadcast.emit('messageAdded', msg);
	});
	socket.on('disconnect', function(){
		sig = new Date().getTime();
		var msg = {content: user + ' now offline.', createAt: new Date(), from: 'SYSTEM'};
		socket.in(room).broadcast.emit('messageAdded', msg);
	});
	socket.on('changeName', function(newName){
		sig = new Date().getTime();
		var msg = {content: user + ' changes nick to ' + newName, from: 'SYSTEM', createAt: new Date()};
		socket.in(room).broadcast.emit('messageAdded', msg);
		user = newName;
	});
});

