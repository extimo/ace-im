/* global in_view */
/* global reminder */
/* global emoji */
/* global io */

angular.module('AIMApp', ['angularMoment', 'monospaced.mousewheel'])
.factory('socket', function($rootScope, $timeout){
	var socket = null;
	
	return {
		on: function(eventName, callback){
			if(!socket){
				return callback();
			}
			socket.on(eventName, function(){
				var args = arguments;
				$timeout(function(){
					callback.apply(socket, args);
				});
			});
		},
		emit: function(eventName, data, callback){
			callback = callback || function(){};
			if(!socket){
				return callback();
			}
			socket.emit(eventName, data, function(){
				var args = arguments;
				$timeout(function(){
					callback.apply(socket, args);
				});
			});
		},
		create: function(token, callback){
			socket = io('/', {
				query: 'token=' + token,
				multiplex: false,
				reconnection: false
			});
			socket.on("error", function(error) {
				if (error.type == "UnauthorizedError" || error.code == "invalid_token") {
					$timeout(function(){
						$rootScope.user = null;
					});
					console.log('sock err');
				}
			});
			socket.on('disconnect', function(){
				$timeout(function () {
					$rootScope.user = null;
				});
				console.log('disconnected');
			})
		},
		close: function(){
			socket.io.disconnect();
			socket = null;
		}
	}
})
.controller('RoomCtrl', function($scope, $timeout, socket){
	$scope.help = 'hello, ' + $scope.user.name + '! here\'s some tips:\nsend /clear to clear history.\n' + 
			'send /logoff to logoff current user.\nsend /switch to switch to anthor user.\nsend /pref set your preferences.';
	$scope.base = {
		me: {
			name: $scope.user.name,
			id: $scope.user.id
		},
		fetchLen: 5,
		canFetch: true,
		fetching: true,
		firstFetch: true,
		end: 0,
		messages: [],
		users: []
	};
	$scope.themes = {
		default:{
			message: 'bubble',
			myMessage: 'bubble-right text-right pull-right',
			otherMessage: 'bubble-left text-left',
			systemMessage: 'bubble-system text-left',
			privateMessage: 'bubble private',
			username: 'label label-default',
			showPrivateHint: true,
			showMessageHeading: true
		},
		minimalism:{
			message: 'bubble minimalism',
			myMessage: 'bubble-right text-right pull-right',
			otherMessage: 'bubble-left text-left',
			systemMessage: 'bubble-system text-left',
			privateMessage: 'bubble minimalism private'
		},
		text:{
			message: 'text-rect',
			privateMessage: 'text-rect private',
			myMessage: 'text-me',
			systemMessage: 'text-system',
			username: 'bold',
			showMessageHeading: true,
			unifiedMessageHeading: true
		}
	};
	$scope.pref = {
		theme: 'default'
	}
	
	$scope.onMousewheel = function(delta, top){
		if(!$scope.base.canFetch || $scope.base.fetching) return;
		if(delta > 0 && top === 0){
			$scope.wheelCount = $scope.wheelCount || 0;
			$scope.wheelCount++;
			if($scope.wheelCount == 10){
				$scope.wheelCount = 0;
				$scope.fetchMore();
			}
		}
		else{
			$scope.wheelCount = 0;
		}
	};
	
	$scope.fetchMore = function(){
		$scope.base.fetching = true;
		socket.emit('fetchMessages', {
			begin: $scope.base.end,
			len: $scope.base.fetchLen
		});
	}
	
	// initial fetch(5 records)
	$scope.fetchMore();
	$scope.base.fetchLen = 20;
	
	socket.on('appendMessages', function(messages){
		$scope.base.messages = messages.concat($scope.base.messages || []);
		$scope.base.fetching = false;
		$scope.base.end += messages.length;
		if(messages.length == 0){
			$scope.base.fetchEnd = true;
			$scope.base.canFetch = false;
			$timeout(function(){
				$scope.base.fetchEnd = false;
			}, 3000);
		}
		if($scope.base.firstFetch){
			$scope.base.firstFetch = false;
			$timeout(function(){
				$scope.$broadcast('scrollToBottom');
			}, 100);
		}
	});
	socket.on('allUsers', function(users){
		$scope.base.users = users;
	});
	socket.on('messageAdded', function(message){
		$scope.base.messages.push(message);
		if(message.from.id != $scope.base.me.id && message.from.name != "SYSTEM" && !in_view){
			reminder.begin();
		}
		if(message.from.id != $scope.base.me.id){
			reminder.sound();
		}
		$timeout(function(){
			$scope.$broadcast('scrollToBottom');
		}, 100);
	});
	socket.on('messageCreated', function(ts, message){
		$scope.base.messages = $scope.base.messages.map(function(msg){
			if(msg.ts == ts){
				return message;
			}
			return msg;
		})
	});
	
	$scope.sendTo = function(user){
		if(user.id != $scope.base.me.id){
			$scope.base.target = user;
		}
	};
})
.controller('MessageCreatorCtrl', function($scope, $timeout, socket){
	$scope.newMessage = '';
	$scope.createMessage = function(){
		if($scope.newMessage == ''){
			return;
		}
		if($scope.newMessage == '/clear'){
			$scope.base.messages = [];
			$scope.newMessage = '';	
			return;
		}
		if($scope.newMessage == '/help'){
			$scope.base.messages.push($scope.help);
			$scope.newMessage = '';	
			return;
		}
		if($scope.newMessage == '/logoff'){
			$scope.logoff();
			return;
		}
		if($scope.newMessage == '/switch'){
			$scope.switch();
			return;
		}
		if($scope.newMessage == '/pref'){
			$('#mdlPreferences').modal('show');
			$scope.newMessage = '';	
			return;
		}
		var msg = {
			content: $scope.newMessage,
			from: $scope.base.me, 
			to: $scope.base.target,
			ts: (new Date()).valueOf()
		};
		socket.emit('createMessage', msg);
		$scope.base.messages.push(msg);
		$scope.newMessage = '';
		$timeout(function(){
			$scope.$broadcast('scrollToBottom');
		}, 100);
	};
})
.directive('autoScrollToBottom', function(){
	return {
		link: function(scope, element, attrs){
			// scope.$watch(
			// 	function(){
			// 		return $(".scroll-to-me").length;
			// 	},
			// 	function(){
			// 		if($(".scroll-to-me").get(0)){
			// 			$(".scroll-to-me").get(0).scrollIntoView();
			// 			$(".scroll-to-me").remove();
			// 		}
			// 	}
			// );
			scope.$on('scrollToBottom', function(){
				element.stop();
				element.animate({
					scrollTop: element.prop('scrollHeight')
				}, 1000);
			});
		}
	};
})
.directive('ctrlEnterBreakLine', function(){
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
})
.directive('convertEmoji', function() {
	return {
		restrict: 'AE',
		template: '',
		link: function(scope, elem, attrs) {
			elem.html(emoji.replace_colons(scope.message.content));
		}
	};
})
.directive('messageList', function() {
	return {
		restrict: 'E',
		templateUrl: 'messageList.html'
	};
})
.directive('messageCreator', function() {
	return {
		restrict: 'E',
		templateUrl: 'messageCreator.html'
	};
})
.directive("onresize", function () {
	return {
		restrict: 'A',
		scope: {
			onresize: '&'
		},
		link: function (scope, elem, attr) {
			var $e = $(elem);
			$e.resize(function () {
				scope.onresize({
					width: $e.width(),
					height: $e.height()
				});
			});
		}
	};
})
.run(function($rootScope, socket){
	$rootScope.$on('userLogined', function($event, user){
		$rootScope.user = user;
		socket.create(user.token);
		delete user.token;
		$.cookie('aim_user_' + user.name + '@' + user.ns, JSON.stringify(user), { expires: 30 });
	});
	
	$rootScope.switch = function(){
		$.cookie('aim_switching', 'true');
		socket.close();
	};
	
	$rootScope.logoff = function(){
		$.removeCookie('aim_user_' + $rootScope.user.name + '@' + $rootScope.user.ns);
		socket.close();
	}
});