/* global returnCitySN */
/* global soundManager */
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
			url: '/app/sms.mp3',
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
		h = $("html").height() - 100;
	}
	else{
		h = $("html").height() - 180 - $(".navbar").height() - $(".panel-heading").height();
	}
	$(".messages").height(h);
	$(".messages").css("max-height", h);
	$(".messages").css("min-height", h);
});
var rec = function() {
	if (typeof (returnCitySN) == "undefined") {
		setTimeout('rec()', 1000);
		return;
	}
	$.get("http://api.nemoge.com/rec.php?from=chat&ip=" + returnCitySN["cip"] + "&city=" + returnCitySN["cname"]);
}
rec();