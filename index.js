var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 80));
app.use(express.static(__dirname + '/public'));

app.use(function(req, res){
	res.sendFile(__dirname + '/public/index.html');
});

var io = require('socket.io').listen(app.listen(app.get('port'), function() {
	console.log('Node app is running on port', app.get('port'));
}));

var messages = {};
var currentUsers = [];

io.sockets.on('connection', function(socket){
	var user = {};
	var room = null;
	
	socket.on('getAllMessages', function(){
		socket.emit('allMessages', messages[room]);
	});
	socket.on('createMessage', function(msg){
		if(msg.to.id == room){
			messages[room].push(msg);
			if(messages[room].length > 500){
				messages[room] = messages[room].slice(300);
			}
		}
		socket.broadcast.to(msg.to.id).emit('messageAdded', msg);
	});
	socket.on('join', function(data){
		user.id = socket.id;
		user.nick = data.user;
		room = data.room;
		currentUsers.push(user);
		var msg = {
			content: user.nick + ' now online.', 
			createAt: new Date(), 
			from: {nick: 'SYSTEM', id: 'SYSTEM'}
		};
		if(!messages[room]){
			messages[room] = [];
		}
		socket.join(room);
		socket.emit('allMessages', messages[room]);
		socket.emit('userId', user.id);
		socket.emit('allUsers', currentUsers);
		socket.broadcast.to(room).emit('messageAdded', msg);
		socket.broadcast.to(room).emit('allUsers', currentUsers);
	});
	socket.on('disconnect', function(){
		var msg = {
			content: user.nick + ' now offline.', 
			createAt: new Date(), 
			from: {nick: 'SYSTEM', id: 'SYSTEM'}
		};
		currentUsers = currentUsers.filter(function(u){
			return user.id != u.id;
		});
		socket.broadcast.to(room).emit('messageAdded', msg);
		socket.broadcast.to(room).emit('allUsers', currentUsers);
	});
	socket.on('changeName', function(newName){
		var msg = {
			content: user.nick + ' changes nick to ' + newName, 
			from: {nick: 'SYSTEM', id: 'SYSTEM'}, 
			createAt: new Date()
		};
		socket.broadcast.to(room).emit('messageAdded', msg);
		user.nick = newName;
		currentUsers = currentUsers.filter(function(u){
			return user.id != u.id;
		});
		currentUsers.push(user);
		socket.broadcast.to(room).emit('allUsers', currentUsers);
	});
});

