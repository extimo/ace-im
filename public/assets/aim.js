var iNot = iNotify.init({
	effect: 'flash',
	interval: 1000,
	message:"(new message) Ace IM"
});
iNot.clearTimer();
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
	$scope.share = {
		messages: [{content: 'hi there, you are known as \'' + $scope.share.me + '\' now.', from: 'SYSTEM'}, 
			$scope.help], 
		me: 'someone'
	};
	$scope.help = {
		content: 'tips:send /clear to clear history.\n' + 
			'send /set {name} to apply a new nickname.\nsend /help to show this message again', 
		from: 'SYSTEM'
	};
	socket.emit('getAllMessages');
	socket.on('allMessages', function(messages){
		$scope.share.messages = $scope.share.messages.concat(messages);
	});
	socket.on('messageAdded', function(message){
		$scope.share.messages.push(message);
		iNot.addTimer();
		setInterval("iNot.clearTimer()", 60000);
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
			if(sps[1].toUpperCase() == "SYSTEM"){
				$scope.share.messages.push({content: 'resricted names', from: 'SYSTEM', createAt: new Date()});
				return;
			}
			socket.emit('createMessage', 
				{content: $scope.share.me + ' changes nick to ' + sps[1], from: 'SYSTEM', createAt: new Date()});
			$scope.share.me = sps[1];
			$scope.newMessage = '';	
			return;
		}
		
		var msg = {content: $scope.newMessage, createAt: new Date(), from: $scope.share.me};
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
