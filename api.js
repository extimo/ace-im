var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var $ = require('./db').helper;
var http = require('http');
var bcrypt = require('bcrypt');

var socketSecret = "(CY9awb4vy5809ar0srbts90uqc23BY*RYB@)";
var appSecret = "()_%V&)*(EUca0w8tuV@$w51)ba7v(JUW%3w";

var loginUser = function(user){
	var profile = {
		name: user.name,
		id: user._id || user.id,
		ns: user.ns
	};
	var socketToken = jwt.sign(profile, socketSecret, { expiresIn: 60 });
	var appToken = jwt.sign(profile, appSecret, { expiresIn: "30d" });
	profile.socketToken = socketToken;
	profile.appToken = appToken;
	profile.pref = user.pref;
	return profile;
}

router.post('/login', function (req, res) {
	$(function (db, done) {
		if(!db) return res.json(null);
		var users = db.collection('users');
		var arr = req.body.name.split("@");
		var name = arr[0];
		var ns = arr[1] || "main";

		users.find({ name: name, ns: ns }).toArray(function (err, docs) {
			if(err || docs.length != 1){
				res.json(null);
				return done();
			}
			var user = docs[0];
			bcrypt.compare(req.body.pass, user.pass, function(err, correct) {
				if(err || !correct){
					res.json(null);
				}
				else{
					res.json(loginUser(user));
				}
				done();
			});
		});
	});
});

router.post('/autoLogin', function (req, res) {
	try{
		res.json(loginUser(jwt.verify(req.body.token || '', appSecret)));
	}
	catch(e){
		res.json(null);
	}
});

router.post('/checkExist', function (req, res) {
	$(function (db, done) {
		if(!db) return res.json();
		var users = db.collection('users');
		var arr = req.body.username.split("@");
		var name = arr[0];
		var ns = arr[1] || "main";
		
		users.find({name: name, ns: ns}).toArray(function(err, docs){
			res.json({exist: err !== null || docs.length > 0});
			done();
		});
	});
});

router.post('/validate', function (req, res) {
	http.get('http://api.nemoge.com/aceim/activate.php?key=' + req.body.code, function(r){
		r.pipe(res);
	}).on('error', function(){
		res.end();
	})
});

router.post('/register', function (req, res) {
	$(function (db, done) {
		if(!db) return res.json(null);
		var users = db.collection('users');
		var arr = req.body.name.split("@");
		var name = arr[0];
		
		bcrypt.hash(req.body.pass, 8, function(err, hash) {
			if(err){
				res.json(null);
				return done();
			}
			users.insert({
				name: name,
				pass: hash,
				ns: req.body.ns
			}, function(err, result){
				if(err || result.ops.length != 1){
					res.json(null);
				}
				else{
					res.json(loginUser(result.ops[0]));
				}
				done();
			});
		});
	});
});

router.post('/savePref', function (req, res) {
	$(function (db, done) {
		if(!db) return;
		db.collection('users').updateOne({ name: req.body.user.name, ns: req.body.user.ns }, {$set: {pref: req.body.pref}}, done);
	});
	res.end();
});


module.exports = router;