/* global malarkey */
function recur_typer(selector, arr, opts) {
  var el = document.querySelector(selector);
  if (!el) return;
  opts = opts || {};
  var pause = opts.pause || 800;
  opts = $.extend({
    typeSpeed: 100,
    deleteSpeed: 50,
    loop: true
  }, opts);

  var typist = malarkey(el, opts);

  typist.delete();
  arr.forEach(function (str) {
    typist.type(str).pause(pause).delete();
  });
}

function recur_scraper(selector, arr, opts) {
  var el = document.querySelector(selector);
  if (!el) return;
  opts = opts || {};
  var pause = opts.pause || 1000;
  opts = $.extend({
    typeSpeed: 100,
    deleteSpeed: 100,
    loop: true
  }, opts);

  var typist = malarkey(el, opts);

  typist.delete();
  arr.forEach(function (pair) {
    typist.type(pair.org, 10).scrape(pair.str, 0).pause(pause).messy();
  });
}

function recurFader(selector, arr, duration, pause) {
  var i = 0, len = arr.length, $ele = $(selector);
  duration = duration || 3000;
  pause = pause || 1000;

  (function f() {
    if (i == len) {
      i = 0;
    }

    $ele.fadeOut(duration, function () {
      $ele.text(arr[i]);
      i += 1;
      $ele.fadeIn(duration, function () {
        setTimeout(function () {
          f();
        }, pause);
      })
    })
  })();
}