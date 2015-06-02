soundManager.setup({
	url: '/renders/soundmaster/swf',
	flashVersion: 9,
	useHighPerformance: true,
	wmode: 'transparent',
	debugMode: true,
	onready: function() {
		soundManager.createSound({
			id: 'sms',
			autoLoad: true,
			url: '/assets/sms.mp3',
			multiShot: true
		});
		soundManager.getSoundById('sms').load();
	},
	ontimeout: function() {
		alert('can not init soundmaster');
	}
});
var reminder = {
	_step: 0,
	_title: document.title,
	_timer: null,
	_active: false,
	sound: function(){	
		soundManager.play('sms');
	},
	begin:function(){
		if(!reminder._active){
			reminder._active = true;
			reminder.show();
		}
	},
	show:function(){
		reminder._timer = setTimeout(function() {
			reminder.show();
			reminder._step++;
			if (reminder._step == 3) { reminder._step = 1 };
			if (reminder._step == 1) { document.title = reminder._title };
			if (reminder._step == 2) { document.title = "(new)" + reminder._title };
		}, 800);
	},
	clear: function(){
		if(reminder._active){
			reminder._active = false;
			clearTimeout(reminder._timer);
			setTimeout(function() {
				document.title = reminder._title;
			}, 800);
		}
	}
};
var in_view = true;
$("body").mouseenter(function(){
	in_view = true;
	reminder.clear();
});
$("body").mouseleave(function(){
	in_view = false;
});
$(window).resize(function(){
	var h = 0;
	if($("html").width() < 992){
		h = parseInt($("html").height()) - 100;
	}
	else{
		h = parseInt($("html").height()) - 180 - parseInt($(".navbar").height()) - parseInt($(".panel-heading").height());
	}
	$(".messages").height(h);
	$(".messages").css("max-height", h);
	$(".messages").css("min-height", h);
});
$(window).resize();
var room = location.search == "" ? '0' : location.search.substring(1);

angular.module('AIMApp', ['angularMoment']);

angular.module('AIMApp').factory('socket', function($rootScope){
	var socket = io.connect('/');
		
	setInterval(function(){
		socket.emit('ping');
	}, 1000 * 60);
	
	return {
		on: function(eventName, callback){
			socket.on(eventName, function(){
				var args = arguments;
				$rootScope.$apply(function(){
					callback.apply(socket, args);
				});
			});
		},
		emit: function(eventName, data, callback){
			socket.emit(eventName, data, function(){
				var args = arguments;
				$rootScope.$apply(function(){
					if(callback){
						callback.apply(socket, args);
					}
				});
			});
		}
	}
});

angular.module('AIMApp').controller('RoomCtrl', function($scope, socket){
	$scope.share = {};
	$scope.share.me = {};
	$scope.share.me.nick = $.cookie('aim_nickname_room' + room) ? $.cookie('aim_nickname_room' + room) : 'someone';
	$scope.help = {
		content: 'hello, ' + $scope.share.me.nick + '! here\'s some tips:\nsend /clear to clear history.\n' + 
			'send /set {name} to apply a new nickname.\nsend /help to show reminder message again', 
		from: {nick: 'SYSTEM', id: 'SYSTEM'}
	};
	$scope.share.messages = [$scope.help];
	$scope.sig = null;
	$scope.share.all = {nick: "all", id: room};
	$scope.share.target = $scope.share.all;
	$scope.share.users = [$scope.share.me];
	
	socket.emit('join', {room: room, user: $scope.share.me.nick});
	
	socket.on('userId', function(id){
		$scope.share.me.id = id;
	});
	socket.on('allMessages', function(messages){
		$scope.share.messages = [$scope.help].concat(messages);
	});
	socket.on('messageAdded', function(message){
		$scope.share.messages.push(message);
		if(message.from.id != $scope.share.me.id && message.from.id != "SYSTEM" && !in_view){
			reminder.begin();
		}
		if(message.from.id != $scope.share.me.id){
			reminder.sound();
		}
	});
	socket.on('allUsers', function(users){
		$scope.share.users = users;
	});
	
	$scope.sendTo = function(user){
		if(user.id != $scope.share.me.id){
			$scope.share.target = user;
		}
	};
});

angular.module('AIMApp').controller('MessageCreatorCtrl', function($scope, socket){
	$scope.newMessage = '';
	$scope.createMessage = function(){
		if($scope.newMessage == ''){
			return;
		}
		if($scope.newMessage == '/clear'){
			$scope.share.messages = [];
			$scope.newMessage = '';	
			return;
		}
		if($scope.newMessage == '/help'){
			$scope.share.messages.push($scope.help);
			$scope.newMessage = '';	
			return;
		}
		if($scope.newMessage.indexOf('/set') == 0){
			var sps = $scope.newMessage.split(" ", 2);
			var newName = sps[1];
			$scope.newMessage = '';	
			if(newName.toUpperCase() == "SYSTEM"){
				$scope.share.messages.push({
					content: 'resricted name: ' + newName, 
					from: {nick: 'SYSTEM', id: 'SYSTEM'}, 
					createAt: new Date()
				});
				return;
			}
			socket.emit('changeName', newName);
			$scope.share.me = newName;
			$.cookie('aim_nickname_room' + room, newName, { expires: 1000 });
			return;
		}
		
		var msg = {
			content: $scope.newMessage, 
			createAt: new Date(), 
			from: $scope.share.me, 
			to: $scope.share.target
		};
		$scope.share.messages.push(msg);
		socket.emit('createMessage', msg);
		$scope.newMessage = '';
	};
});

angular.module('AIMApp').directive('autoScrollToBottom', function(){
	return {
		link: function(scope, element, attrs){
			scope.$watch(
				function(){
					return element.children().length;
				},
				function(){
					element.animate({
						scrollTop: element.prop('scrollHeight')
					}, 1000);
				}
			);
		}
	};
});

angular.module('AIMApp').directive('ctrlEnterBreakLine', function(){
	return function(scope, element, attrs){
		var ctrlDown = false;
		element.bind('keydown', function(evt){
			if(evt.which == 17){
				ctrlDown = true;
				setTimeout(function(){
					ctrlDown = false;
				}, 300);
			}
			if(evt.which == 13){
				if(ctrlDown){
					element.val(element.val() + '\n');
				}
				else{
					scope.$apply(function(){
						scope.$eval(attrs.ctrlEnterBreakLine);
					});
					evt.preventDefault();
				}
			}
		});
	};
});

angular.module('AIMApp').directive('convertEmoji', function() {
	return {
		restrict: 'AE',
		template: '',
		link: function(scope, elem, attrs) {
			elem.html(emoji.replace_colons(scope.message.content));
		}
	};
});