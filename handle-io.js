var socketioJwt = require('socketio-jwt');
var $ = require('./db').helper;
var messages = {};
var currentUsers = {};

var appSecret = "(CY9awb4vy5809ar0srbts90uqc23BY*RYB@)";

var saveMessage = function(room){
	if(messages[room].length === 0) return;
	$(function(db, done){
		if(!db) return;
		db.collection('messages_' + room).insertMany(messages[room], done);
	});
	messages[room] = [];
}

var fetchMessage = function(room, skip, len, cb){
	$(function(db, done){
		if(!db) return cb([]);
		db.collection('messages_' + room).find({}).skip(skip).limit(len).toArray(function(err, docs){
			if(err){
				cb([]);
			}
			else{
				cb(docs);
			}
			done();
		});
	});
}

var getCount = function(room, cb){
	$(function(db, done){
		if(!db) return cb(-1);
		var messages = db.collection('messages_' + room);
		messages.stats(function (err, stats) {
			if(err || !stats) cb(0);
			else cb(stats.count);
			done();
		});
	});
}

var handleSave = null;
		
function handle(io) {
	io.use(socketioJwt.authorize({
		secret: appSecret,
		handshake: true
	}));
	
	io.sockets.on('connection', function (socket) {
		var user = {
			name: socket.decoded_token.name,
			id: socket.decoded_token.id,
			sock: socket.id
		};
		var room = socket.decoded_token.ns;
		var pos = 0;
		getCount(room, function(p){
			pos = p;
		});
	
		socket.join(room);
		messages[room] = messages[room] || [];
		currentUsers[room] = currentUsers[room] || {};
		currentUsers[room][user.id] = user;
		socket.emit('allUsers', currentUsers[room]);
		socket.broadcast.to(room).emit('allUsers', currentUsers[room]);
		socket.broadcast.to(room).emit('messageAdded', {
			content: user.name + ' now online.',
			createAt: new Date(),
			from: { name: 'SYSTEM'}
		});
	
		if(!handleSave){
			handleSave = setInterval(saveMessage.bind(null, room), 60000);
		}

		socket.on('fetchMessages', function (range) {
			if(range.begin > pos) return socket.emit('appendMessages', []);
			fetchMessage(room, pos - range.begin, range.len, function(data){
				socket.emit('appendMessages', data.filter(function(msg){
					return !msg.to || msg.to.id == user.id || msg.from.id == user.id;
				}));
			});
		});
		
		socket.on('createMessage', function (msg) {
			msg.createAt = new Date();
			var ts = msg.ts;
			delete msg.ts;
			messages[room].push(msg);
			if (!msg.to) {
				socket.broadcast.to(room).emit('messageAdded', msg);
			}
			else{
				socket.broadcast.to(msg.to.sock).emit('messageAdded', msg);
			}
			socket.emit('messageCreated', ts, msg);
		});
		
		socket.on('disconnect', function () {
			var msg = {
				content: user.name + ' now offline.',
				createAt: new Date(),
				from: { name: 'SYSTEM'}
			};
			delete currentUsers[room][user.id];
			socket.broadcast.to(room).emit('allUsers', currentUsers[room]);
			socket.broadcast.to(room).emit('messageAdded', msg);
			if (Object.keys(currentUsers[room]).length === 0) {
				saveMessage(room);
				clearInterval(handleSave);
				handleSave = null;
			}
		});
	});
}

module.exports = handle;