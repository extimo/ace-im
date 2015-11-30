/* global options */
/* global malarkey */

var genTypist = function(e){
	return malarkey(e, {
		getter: function (e) {
			return e.html();
		},
		setter: function (e, v) {
			e.html(v);
		},
		typeSpeed: 30,
		deleteSpeed: 10
	});
}

angular.module('AIMApp')
.controller('AccountCtrl', function($scope, $timeout, $http, socket){
	var savedUsers;
	try{
		savedUsers = JSON.parse($.cookie('aim_user'));
	}
	catch(e){
		savedUsers = {};
	}
	// autologin the user using appToken saved in cookie
	// 1) not in switching mode and there is only one saved user
	if(!$.cookie('aim_switching') && !options.switch && Object.keys(savedUsers).length == 1){
		$scope.state = { showActionIndicator: true };
		$http.post('/api/autoLogin', {token: savedUsers[Object.keys(savedUsers)[0]]}).success(function(data){
			if(data){
				$scope.$emit('userLogined', data);
			}
			else{
				$scope.state.showWelcome = true;
			}
		}).error(function(){
			$scope.state.showWelcome = true;
		}).finally(function(){
			$scope.state.showActionIndicator = false;
		});
	}
	// 2) user is specified in url hash
	else if(options.user && savedUsers[options.user]){		
		$scope.state = { showActionIndicator: true };
		$http.post('/api/autoLogin', {token: savedUsers[options.user]}).success(function(data){
			if(data){
				$scope.$emit('userLogined', data);
			}
			else{
				$scope.state.showWelcome = true;
			}
		}).error(function(){
			$scope.state.showWelcome = true;
		}).finally(function(){
			$scope.state.showActionIndicator = false;
		});
	}
	// there's no saved user to autologin or there're one more saved user, show welcome message
	else{
		$scope.state = { showWelcome: true };
		$.removeCookie('aim_switching');
	}
	$scope.info = {};
	
	$scope.showUserInput = function(){
		$timeout(function(){
			$scope.state.showInputUsername = true;
		});
	};
	$scope.showACInput = function(){
		$timeout(function(){
			$scope.state.showInputAC = true;
		});
	};
	$scope.showPasswordInput = function(){
		$timeout(function(){
			$scope.state.showInputPassword = true;
		});
	};
	
	$scope.checkExist = function(){
		$scope.state.showInputUsername = false;
		$scope.state.showWelcome = false;
		$scope.state.showActionIndicator = true;
		
		// add default namespace if omitted
		var fullName = $scope.info.name.indexOf('@') > -1 ? $scope.info.name : $scope.info.name + '@main';
		// the user is saved in cookie, try autologin
		if(savedUsers[fullName]){
			return $http.post('/api/autoLogin', {token: savedUsers[fullName]}).success(function(data){
				if(data){
					$scope.$emit('userLogined', data);
				}
				else{
					$scope.state.showHintLogin = true;
				}
			}).error(function(){
				$scope.state.showHintLogin = true;
			}).finally(function(){
				$scope.state.showActionIndicator = false;
			});
		}
		
		// ortherwise, check whether the input username exist
		$http.post('/api/checkExist', {
			username: $scope.info.name
		}).success(function(data){
			if(!data){
				$scope.checkExist();
			}
			else if(data.exist){
				$scope.state.showHintLogin = true;
			}
			else{
				$scope.state.showHintNotExist = true;
			}
		}).error(function(){
			$scope.state.showHintNotExist = true;
		}).finally(function(){
			$scope.state.showActionIndicator = false;
		});
	};
	// validate the activation code
	$scope.validate = function(){
		$scope.state.showInputAC = false;
		$scope.state.showHintInvalid = false;
		$scope.state.showHintNotExist = false;
		$scope.state.showActionIndicator = true;
		$http.post('/api/validate', {
			code: $scope.actCode
		}).success(function(data){
			if(data != ''){
				$scope.info.ns = data;
				$scope.state.showHintRegister = true;
			}
			else{
				$scope.actCode = '';
				$scope.state.showHintInvalid = true;
			}
		}).error(function(){
			$scope.actCode = '';
			$scope.state.showHintInvalid = true;
		}).finally(function(){
			$scope.state.showActionIndicator = false;
		});
	};
	// register new user after valid activation code
	$scope.register = function(){
		$scope.state.showInputPassword = false;
		$scope.state.showHintRegister = false;
		$scope.state.showHintRegisterFailed = false;
		$scope.state.showActionIndicator = true;
		$http.post('/api/register', $scope.info).success(function(data){
			if(!data){
				$scope.state.showHintRegisterFailed = true;
			}
			else{
				$scope.$emit('userLogined', data);
			}
		}).error(function(){
			$scope.state.showHintRegisterFailed = true;
		}).finally(function(){
			$scope.state.showActionIndicator = false;
		});
	};
	// login user with password
	$scope.login = function(){
		$scope.state.showInputPassword = false;
		$scope.state.showHintLogin = false;
		$scope.state.showHintLoginFailed = false;
		$scope.state.showActionIndicator = true;
		$http.post('/api/login', $scope.info).success(function(data){
			if(!data){
				$scope.state.showHintLoginFailed = true;
			}
			else{
				$scope.$emit('userLogined', data);
			}
		}).error(function(){
			$scope.state.showHintLoginFailed = true;
		}).finally(function(){
			$scope.state.showActionIndicator = false;
		});
	};
})
.directive('welcome', function(){
	return {
		restrict: 'A',
		scope:{
			next: '&'
		},
		link: function(scope, element, attrs){
			var typist = genTypist(element);
			typist.type("Hello there!").pause(300).delete().type("To enter the secret world").delete("secret world", 5).type("room")
			.pause(300).type(", tell me your name:").pause(100).call(function(done){
				scope.next();
				element.removeClass('enabled');
				done();
			}).pause(3000).call(function(done){
				element.addClass('enabled');
				done();
			}).clear().type('when finished, press enter').call(function(done){
				element.removeClass('enabled');
			});
		}
	};
})
.directive('hintNotExist', function(){
	return {
		restrict: 'A',
		scope:{
			next: '&'
		},
		link: function(scope, element, attrs){
			var typist = genTypist(element);
			typist.type("em...").pause(100).type("it seems that you are new to here")
			.pause(1500).delete().type("please enter your activation code below:").call(function(done){
				scope.next();
				element.removeClass('enabled');
				done();
			}).pause(30000).clear().call(function(done){
				element.addClass('enabled');
				done();
			}).type("...if you don't have activation code, please contact Nemo")
			.pause(3000).clear().type("...if you don't know who Nemo is, give it up").call(function(done){
				element.removeClass('enabled');
			});
		}
	};
})
.directive('hintInvalid', function(){
	return {
		restrict: 'A',
		scope:{
			next: '&'
		},
		link: function(scope, element, attrs){
			var typist = genTypist(element);
			typist.type("verify failed!").pause(1500).delete().type('please reenter your activation code:')
			.call(function(done){
				scope.next();
				element.removeClass('enabled');
				done();
			}).pause(30000).clear().call(function(done){
				element.addClass('enabled');
				done();
			}).type("...if you don't have activation code, please contact Nemo")
			.pause(3000).clear().type("...if you don't know who Nemo is, give it up").call(function(done){
				element.removeClass('enabled');
			});
		}
	};
})
.directive('hintRegister', function(){
	return {
		restrict: 'A',
		scope:{
			next: '&'
		},
		link: function(scope, element, attrs){
			var typist = genTypist(element);
			typist.type("successfully verified!").pause(1500).delete().type('please enter your password, honored user:')
			.call(function(done){
				scope.next();
				element.removeClass('enabled');
			});
		}
	};
})
.directive('hintRegisterFailed', function(){
	return {
		restrict: 'A',
		scope:{
			next: '&'
		},
		link: function(scope, element, attrs){
			var typist = genTypist(element);
			typist.type("sorry, register operation failed").pause(1500).delete().type('please retry submit')
			.call(function(done){
				scope.next();
				element.removeClass('enabled');
			});
		}
	};
})
.directive('hintLogin', function(){
	return {
		restrict: 'A',
		scope:{
			next: '&'
		},
		link: function(scope, element, attrs){
			var typist = genTypist(element);
			typist.type("Welcome, " + scope.$parent.info.name).pause(1000).delete().type('please enter your password:')
			.call(function(done){
				scope.next();
				element.removeClass('enabled');
				done();
			}).pause(5000).call(function(done){
				element.addClass('enabled');
				done();
			}).delete().type("you will automaticlly logined next time").call(function(done){
				element.removeClass('enabled');
			});
		}
	};
})
.directive('hintLoginFailed', function(){
	return {
		restrict: 'A',
		scope:{
			next: '&'
		},
		link: function(scope, element, attrs){
			var typist = genTypist(element);
			typist.type("login failed!").pause(1500).delete().type('please reenter your password:')
			.call(function(done){
				scope.next();
				element.removeClass('enabled');
			});
		}
	};
})
.directive('focusMe', function() {
	return {
		restrict: 'A',
		link: function(scope, elem, attrs) {
			elem.focus();
		}
	};
})
.directive('typeMe', function() {
	return {
		restrict: 'AE',
		scope:{
			text: '@',
			typeSpeed: '@',
			repeat: '@'
		},
		link: function(scope, elem, attrs) {
			var typist = malarkey(elem, {
				getter: function (e) {
					return e.html();
				},
				setter: function (e, v) {
					e.html(v);
				},
				typeSpeed: parseInt(scope.typeSpeed) || 30,
				repeat: !!scope.repeat
			});
			typist.type(scope.text);
		}
	};
})
.directive('removeMe', function() {
	return {
		link: function(scope, elem, attrs) {
			elem.remove();
		}
	};
});