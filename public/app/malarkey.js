var malarkey = function (elem, opts) {

  // allow `malarkey` to be called without the `new` keyword
  if (!(this instanceof malarkey)) {
    return new malarkey(elem, opts || {});
  }

  // default `opts`
  var typeSpeed = opts.speed || opts.typeSpeed || 50;
  var deleteSpeed = opts.speed || opts.deleteSpeed || 50;
  var pauseDelay = opts.delay || opts.pauseDelay || 2000;
  var postfix = opts.postfix || '';
  var getter = opts.getter || function (elem) {
    return elem.innerHTML;
  };
  var setter = opts.setter || function (elem, val) {
    elem.innerHTML = val;
  };

  // initialise the function queue
  var queue = segue({ repeat: opts.loop || false });

  // internal functions that are added into `queue` via their respective
  // public methods
  var _scrape = function (done, str, speed, step, maxTime, incr) {
    var len = str.length;
    var _s = function (now, tar) {
      var chars = "abcdefghijklmnopqrstuvwxyz";
      var _i = chars.indexOf.bind(chars);
      
      if (_i(now) > _i(tar) && _i(now) - _i(tar) > step) {
        return chars[_i(now) - step];
      }
      else if (_i(now) < _i(tar) && _i(tar) - _i(now) > step) {
        return chars[_i(now) + step];
      }
      return tar;
    }
    var _scrapeChar = function (i, n, done) {
      setTimeout(function () {
        n += 1;
        var scrape = getter(elem);
        var now = scrape[i];
        var tar = str[i];
        if (now === tar || n > maxTime) {
          return done();
        }
        scrape = scrape.substring(0, i) + (n == maxTime ? tar : _s(now, tar)) + scrape.substring(i + 1, len);
        setter(elem, scrape);
        _scrapeChar(i, n, done);
      }, speed);
    }
    if (len === 0 || len !== getter(elem).length) {
      return done();
    }
    if (incr < 0) {
      (function t(i) {
        _scrapeChar(i, 0, function () {
          i += 1;
          if (i < len) {
            t(i);
          } else {
            done();
          }
        });
      })(0);
    }
    else {
      var doneCount = 0;
      (function t(i) {
        setTimeout(function () {
          _scrapeChar(i, 0, function () {
            doneCount += 1;
            if (doneCount == len) {
              done();
            }
          })
          i += 1;
          if (i < len) {
            t(i);
          }
        }, incr * speed);
      })(0);
    }
  };
  var _type = function (done, str, speed) {
    var len = str.length;
    if (len === 0) {
      return done();
    }
    (function t(i) {
      setTimeout(function () {
        setter(elem, getter(elem) + str[i]);
        i += 1;
        if (i < len) {
          t(i);
        } else {
          done();
        }
      }, speed);
    })(0);
  };
  var _delete = function (done, x, speed) {
    var curr = getter(elem);
    var count = curr.length; // default to deleting entire contents of `elem`
    if (x != null) {
      if (typeof x === 'string') {
        // delete the string `x` if and only if `elem` ends with `x`
        if (endsWith(curr, x + postfix)) {
          count = x.length + postfix.length;
        } else {
          count = 0;
        }
      } else {
        // delete the last `x` characters from `elem`
        if (x > -1) {
          count = Math.min(x, count);
        }
      }
    }
    if (count === 0) {
      return done();
    }
    (function d(count) {
      setTimeout(function () {
        var curr = getter(elem);
        if (count) {
          // drop last char
          setter(elem, curr.substring(0, curr.length - 1));
          d(count - 1);
        } else {
          done();
        }
      }, speed);
    })(count);
  };
  var _messy = function () {
    var messy = "qwertyuioplkjhgfdsazxcvbnm@#$%?";
    return messy[parseInt(Math.random() * messy.length)];
  }
  var _dump = function(fn, times){
    if(times == 0){
      return [];
    }
    return _dump(fn, times - 1).concat(fn());
  };
  var _deleteMessy = function (done, x, speed) {
    var curr = getter(elem);
    var count = curr.length; // default to deleting entire contents of `elem`
    if (x != null) {
      if (typeof x === 'string') {
        // delete the string `x` if and only if `elem` ends with `x`
        if (endsWith(curr, x + postfix)) {
          count = x.length + postfix.length;
        } else {
          count = 0;
        }
      } else {
        // delete the last `x` characters from `elem`
        if (x > -1) {
          count = Math.min(x, count);
        }
      }
    }
    if (count === 0) {
      return done();
    }
    (function d(count) {
      setTimeout(function () {
        var curr = getter(elem);
        if (count) {
          // drop last char
          var s = _dump(_messy, curr.length - 1).join('');
          setter(elem, s);
          d(count - 1);
        } else {
          done();
        }
      }, speed);
    })(count);
  };
  var _clear = function (done) {
    setter(elem, '');
    done();
  };
  var _pause = function (done, delay) {
    setTimeout(done, delay);
  };
  var _call = function (done, fn) {
    fn.call(null, done, elem);
  };

  // expose public api
  this.type = function (str, speed) {
    queue(_type, str + postfix, speed || typeSpeed);
    return this;
  };
  this.scrape = function (str, incr, step, maxTime, speed) {
    queue(_scrape, str + postfix, speed || typeSpeed, step || 1, maxTime || 26, incr);
    return this;
  };
  this.delete = function (x, speed) {
    queue(_delete, x, speed || deleteSpeed);
    return this;
  };
  this.messy = function (x, speed) {
    queue(_deleteMessy, x, speed || deleteSpeed);
    return this;
  };
  this.clear = function () {
    queue(_clear);
    return this;
  };
  this.pause = function (delay) {
    queue(_pause, delay || pauseDelay);
    return this;
  };
  this.call = function (fn) {
    queue(_call, fn);
    return this;
  };

};

var endsWith = function (str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

var segue = function (cb, opts) {
  'use strict';
  var slice = [].slice;

  // both `cb` and `opts` are optional
  if (typeof cb !== 'function') {
    opts = cb;
    cb = function () { };
  }

  // only repeat if `opts.repeat` is `true`
  var repeat = opts && opts.repeat === true;

  var fns = []; // store the enqueued functions
  var args = []; // store the arguments for the enqueued functions
  var i = 0; // index of the currently running function
  var running = false; // true if a function running
  var prevErr = false; // truthy if an error has occurred

  var next = function (err) {
    // cache the array length
    var len = fns.length;

    // wraparound if repeating
    if (repeat) {
      i = i % len;
    }

    // call the `cb` on error, or if there are no more functions to run
    if (err || i === len) {
      running = false;
      prevErr = err;
      return cb(err);
    }

    // call the current `fn`, passing it the arguments in `args`
    fns[i].apply(null, [].concat(next, args[i++]));
  };

  return function segue(fn) {
    // an error has already occurred; call the `cb` with the `prevErr`
    if (prevErr) {
      return cb(prevErr);
    }

    // store `fn` and its arguments
    fns.push(fn);
    args.push(slice.call(arguments, 1));

    // call the next function in the queue if no functions are currently running
    if (!running) {
      running = true;
      // call the next function only after all other functions have been enqueued
      setTimeout(function () {
        next();
      }, 0);
    }
    return segue;
  };
};