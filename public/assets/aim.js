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
			multiShot: true,
			onfinish:function(){alert('finish')},
			onload:function(){alert('load')},
			onplay:function(){alert('play')},]
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
	var h = parseInt($("html").height()) - 240 - parseInt($(".navbar").height()) - parseInt($(".panel-heading").height());
	$(".messages").height(h);
	$(".messages").css("max-height", h);
	$(".messages").css("min-height", h);
});
$(window).resize();
var room = location.search == "" ? '0' : location.search.substring(1);

angular.module('AIMApp', ['angularMoment']);

angular.module('AIMApp').factory('socket', function($rootScope){
	var socket = io.connect('/');
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
	$scope.share.me = $.cookie('aim_nickname_room' + room) ? $.cookie('aim_nickname_room' + room) : 'someone';
	$scope.help = {
		content: 'hello, ' + $scope.share.me + '! here\'s some tips:\nsend /clear to clear history.\n' + 
			'send /set {name} to apply a new nickname.\nsend /help to show reminder message again', 
		from: 'SYSTEM'
	};
	$scope.share.messages = [$scope.help];
	
	socket.emit('userOnline', {room: room, user: $scope.share.me});
	socket.emit('getAllMessages', room);
		
	socket.on('allMessages', function(messages){
		$scope.share.messages = $scope.share.messages.concat(messages);
	});
	socket.on('messageAdded', function(data){
		if(data.room == room){
			$scope.share.messages.push(data.message);
			if(data.message.from != $scope.share.me &&data.message.from != "SYSTEM" && !in_view){
				reminder.begin();
			}
			if(data.message.from != $scope.share.me){
				reminder.sound();
			}
		}
	});
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
			$scope.newMessage = '';	
			if(sps[1].toUpperCase() == "SYSTEM"){
				$scope.share.messages.push({content: 'resricted name: ' + sps[1], from: 'SYSTEM', createAt: new Date()});
				return;
			}
			socket.emit('createMessage', {room: room, message: 
				{content: $scope.share.me + ' changes nick to ' + sps[1], from: 'SYSTEM', createAt: new Date()}});
			$scope.share.me = sps[1];
			$.cookie('aim_nickname_room' + room, sps[1], { expires: 1000 });
			return;
		}
		
		var msg = {content: $scope.newMessage, createAt: new Date(), from: $scope.share.me};
		socket.emit('createMessage', {room: room, message: msg});
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
				}, 1000);
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
