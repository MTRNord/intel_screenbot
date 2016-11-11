var system = require('system')
var args = require('system').args;
var page = require('webpage').create();
var fs = require('fs');
if (args.length === 1) {
    console.log('Try to pass some args when invoking this script!');
} else {
  if (args.length === 5){
      var SACSID  = args[1];
      var CSRF  = args[2];
      var IntelURL  = args[3];
      var filepath  = args[4];
      var search  = 'nix';
  }else{
    if (args.length === 6){
      var SACSID  = args[1];
      var CSRF  = args[2];
      var IntelURL  = args[3];
      var filepath  = args[4];
      var search  = args[5];
      console.log(search)
      system.stdout.writeLine(filepath);
    }
  }
}

addCookies(SACSID,CSRF)
afterCookieLogin(IntelURL, search)

function waitFor ($config) {
    $config._start = $config._start || new Date();

    if ($config.timeout && new Date - $config._start > $config.timeout) {
        if ($config.error) $config.error();
        if ($config.debug) console.log('timedout ' + (new Date - $config._start) + 'ms');
        return;
    }

    if ($config.check()) {
        if ($config.debug) console.log('success ' + (new Date - $config._start) + 'ms');
        return $config.success();
    }

    setTimeout(waitFor, $config.interval || 0, $config);
}

function addCookies(sacsid, csrf) {
  phantom.addCookie({
    name: 'SACSID',
    value: sacsid,
    domain: 'www.ingress.com',
    path: '/',
    httponly: true,
    secure: true
  });
  phantom.addCookie({
    name: 'csrftoken',
    value: csrf,
    domain: 'www.ingress.com',
    path: '/'
  });
}


/**
 * Does all stuff needed after cookie authentication
 * @since 3.1.0
 */
function afterCookieLogin(IntelURL, search) {
  page.open(IntelURL, function(status) {
    if (status !== 'success') {quit('unable to connect to remote server')}

    if(!isSignedIn()) {
      if(fs.exists('.iced_cookies')) {
        fs.remove('.iced_cookies');
      }
    }
    setTimeout(function() {
        waitFor({
            timeout: 60000,
            check: function () {
                return page.evaluate(function() {
                    if (document.querySelector('#percent_text').textContent == "90") {
                        if (!document.getElementById("loading_msg").style.display){
                            return true;
                        }else{
                            return false;
                        }
                    }else{
                        return false;
                    }
                });
            },
            success: function () {
                page.evaluate(function() {
                    document.querySelector("#filters_container").style.display= 'none';
                });
                hideDebris();
                prepare('1920', '1080', search);
                main();
            },
            error: function () {
                system.stdout.writeLine('map did not finish loading in time...');
                page.evaluate(function() {
                    document.querySelector("#filters_container").style.display= 'none';
                });
                hideDebris();
                prepare('1920', '1080', search);
                main();
            } // optional
        });
    }, "5000");
  });
}

/**
 * Checks if user is signed in by looking for the "Sign in" button
 * @returns {boolean}
 * @since 3.2.0
 */
function isSignedIn() {
  return page.evaluate(function() {
    return document.getElementsByTagName('a')[0].innerText.trim() !== 'Sign in';
  });
}

function storeCookies() {
  var cookies = page.cookies;
  fs.write('.iced_cookies', '', 'w');
  for(var i in cookies) {
    fs.write('.iced_cookies', cookies[i].name + '=' + cookies[i].value +'\n', 'a');
  }
}

function s(file) {
  page.render(file);
  phantom.exit(0);
}

function hideDebris() {
    system.stdout.writeLine('hideDebris...');
    page.evaluate(function() {
      if (document.querySelector('#comm'))             {document.querySelector('#comm').style.display = 'none';}
      if (document.querySelector('#player_stats'))     {document.querySelector('#player_stats').style.display = 'none';}
      if (document.querySelector('#game_stats'))       {document.querySelector('#game_stats').style.display = 'none';}
      if (document.querySelector('#geotools'))         {document.querySelector('#geotools').style.display = 'none';}
      if (document.querySelector('#header'))           {document.querySelector('#header').style.display = 'none';}
      if (document.querySelector('#snapcontrol'))      {document.querySelector('#snapcontrol').style.display = 'none';}
      if (document.querySelectorAll('.img_snap')[0])   {document.querySelectorAll('.img_snap')[0].style.display = 'none';}
      if (document.querySelector('#display_msg_text')) {document.querySelector('#display_msg_text').style.display = 'none';}
    });
    page.evaluate(function() {
      var hide = document.querySelectorAll('.gmnoprint');
      for (var index = 0; index < hide.length; ++index) {
        hide[index].style.display = 'none';
      }
    });
}

/**
 * Prepare map for screenshooting. Make screenshots same width and height with map_canvas
 * If IITC, also set width and height
 * @param {boolean} iitcz
 * @param {number} widthz
 * @param {number} heightz
 */
function prepare(widthz, heightz, search) {
    system.stdout.writeLine('prepare...');
    if (search == "nix") {
        var selector = "#map_canvas";
        setElementBounds(selector);
    }else{
        page.evaluate(function(search) {
            if (document.querySelector('#geocode')){
                document.getElementById("address").value=search;
                document.querySelector("input[value=Search]").click();
            }
        }, search);
        var selector = "#map_canvas";
        setElementBounds(selector);
    }
}

/**
 * Sets element bounds
 * @param selector
 */
function setElementBounds(selector) {
  page.clipRect = page.evaluate(function(selector) {
    var clipRect = document.querySelector(selector).getBoundingClientRect();
    return {
      top:    clipRect.top,
      left:   clipRect.left,
      width:  clipRect.width,
      height: clipRect.height
    };
  }, selector);
}

/**
 * Checks if human presence not detected and makes a human present
 * @since 2.3.0
 */
function humanPresence() {
  var outside = page.evaluate(function() {
    return !!(document.getElementById('butterbar') && (document.getElementById('butterbar').style.display !== 'none'));
  });
  if (outside) {
    var rekt = page.evaluate(function() {
      return document.getElementById('butterbar').getBoundingClientRect();
    });
    page.sendEvent('click', rekt.left + rekt.width / 2, rekt.top + rekt.height / 2);
  }
}

function getDateTime(format) {
  var now     = new Date();
  var year    = now.getFullYear();
  var month   = now.getMonth()+1;
  var day     = now.getDate();
  var hour    = now.getHours();
  var minute  = now.getMinutes();
  var second  = now.getSeconds();
  var timeZone = '';
  if(month.toString().length === 1) {
    month = '0' + month;
  }
  if(day.toString().length === 1) {
    day = '0' + day;
  }
  if(hour.toString().length === 1) {
    hour = '0' + hour;
  }
  if(minute.toString().length === 1) {
    minute = '0' + minute;
  }
  if(second.toString().length === 1) {
    second = '0' + second;
  }
  var dateTime;
  if (format === 1) {
    dateTime = year + '-' + month + '-' + day + '--' + hour + '-' + minute + '-' + second;
  } else {
    dateTime = day + '.' + month + '.' + year + ' ' + hour + ':' + minute + ':' + second + timeZone;
  }
  return dateTime;
}

function addTimestamp(time) {
    page.evaluate(function(dateTime) {
      var water = document.createElement('p');
      water.id='watermark-ice';
      water.innerHTML = dateTime;
      water.style.position = 'absolute';
      water.style.color = 'orange';
      water.style.top = '0';
      water.style.left = '0';
      water.style.fontSize = '40px';
      water.style.opacity = '0.8';
      water.style.marginTop = '0';
      water.style.paddingTop = '0';
      water.style.fontFamily = 'monospace';
      water.style.textShadow = '2px 2px 5px #111717';
      document.querySelector('#map_canvas').appendChild(water);
    }, time);
}

/**
 * Main function.
 */
function main() {
  system.stdout.writeLine('main...');
  if (true){
    page.evaluate(function() {
      if (document.getElementById('watermark-ice')) {
        var oldStamp = document.getElementById('watermark-ice');
        oldStamp.parentNode.removeChild(oldStamp);
      }
    });
  }
  humanPresence();
  window.setTimeout(function() {
    addTimestamp(getDateTime(0));
    file = filepath;
    s(file);
  }, 5000);
}
