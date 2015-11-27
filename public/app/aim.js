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
			socket = io.connect('/', {
				query: 'token=' + token
			});
			socket.on("error", function(error) {
				if (error.type == "UnauthorizedError" || error.code == "invalid_token") {
					$rootScope.user = null;
					console.log('sock err');
					console.log(error);
				}
			});
			socket.on('disconnect', function(){
				socket = io.connect('/', {
					query: 'token=' + token
				});
			})
		}
	}
})
.controller('RoomCtrl', function($scope, socket){
	$scope.help = 'hello, ' + $scope.user.name + '! here\'s some tips:\nsend /clear to clear history.\n' + 
			'send /help to show reminder message again';
	$scope.base = {
		me: {
			name: $scope.user.name,
			id: $scope.user.id
		},
		fetching: true,
		firstFetch: true
	};
	$scope.base.users = [$scope.base.me];
	
	$scope.onMousewheel = function(delta, top){
		if(delta > 0 && top === 0){
			$scope.wheelCount = $scope.wheelCount || 0;
			$scope.wheelCount++;
			if($scope.wheelCount == 10 && !$scope.base.fetching){
				$scope.base.fetching = true;
				$scope.wheelCount = 0;
				socket.emit('fetchMessages', {
					begin: $scope.base.end,
					len: 20
				});
			}
		}
		else{
			$scope.wheelCount = 0;
		}
	};
	$scope.onPull = function(){
		$scope.pullCount = $scope.pullCount || 0;
		$scope.pullCount++;
		if($scope.pullCount == 3 && !$scope.base.fetching){
			$scope.base.fetching = true;
			$scope.pullCount = 0;
			socket.emit('fetchMessages', {
				begin: $scope.base.end,
				len: 20
			});
		}
	}
	
	socket.on('appendMessages', function(messages){
		$scope.base.messages = messages.concat($scope.base.messages || []);
		$scope.base.fetching = false;
		$scope.base.end = $scope.base.end || 0;
		$scope.base.end += messages.length;
		if($scope.base.firstFetch){
			$scope.base.firstFetch = false;
			$scope.$broadcast('scrollToBottom');
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
		$scope.$broadcast('scrollToBottom');
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
.controller('MessageCreatorCtrl', function($scope, socket){
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
		
		var msg = {
			content: $scope.newMessage,
			from: $scope.base.me, 
			to: $scope.base.target,
			ts: (new Date()).valueOf()
		};
		socket.emit('createMessage', msg);
		$scope.base.messages.push(msg);
		$scope.newMessage = '';
		$scope.$broadcast('scrollToBottom');
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
.directive('pullAction', function ($timeout, $q) {
	return {
		scope: {
			'pullAction': '&'
		},
		restrict: 'A',
		compile: function compile(tElement, tAttrs) {
			return function postLink(scope, iElement, iAttrs) {
				var scrollElement = iElement.parent();

				iElement.bind('touchmove', function (ev) {
					var top = scrollElement[0].scrollTop;
					if (top < -60) {
						scope.pullAction();
					}
				});

				scope.$on('$destroy', function () {
					iElement.unbind('touchmove');
				});
			};
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
		$rootScope.user = null;
	};
	
	$rootScope.logoff = function(){
		$.removeCookie('aim_user_' + $rootScope.user.name + '@' + $rootScope.user.ns);
		$rootScope.user = null;
	}
});