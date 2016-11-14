var system = require('system');
var args = system.args;
var page = require('webpage').create();
var fs = require('fs');
if (args.length === 1) {
    console.log('Try to pass some args when invoking this script!');
} else {
  if (args.length === 6){
      var SACSID  = args[1];
      var CSRF  = args[2];
      var IntelURL  = args[3];
      var filepath  = args[4];
      var plugins  = args[5];
      var search  = 'nix';
  }else{
    if (args.length === 7){
      var SACSID  = args[1];
      var CSRF  = args[2];
      var IntelURL  = args[3];
      var filepath  = args[4];
      var search  = args[5];
      var plugins  = args[6];
    }
  }
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

function loadIitcPlugin(src) {
  page.evaluate(function(src) {
    var script = document.createElement('script');
    script.type='text/javascript';
    script.src=src;
    document.head.insertBefore(script, document.head.lastChild);
  }, src);
}

function loadLocalIitcPlugin(src) {
    page.injectJs(src)
}

addCookies(SACSID, CSRF);
afterCookieLogin(IntelURL, search);

function afterCookieLogin(IntelURL, search) {
  page.viewportSize = { width: '1920', height: '1080' };
  page.open(IntelURL, function(status) {
    if (status !== 'success') {quit('unable to connect to remote server')}
    page.injectJs('https://code.jquery.com/jquery-3.1.1.min.js');
    setTimeout(function() {
        page.evaluate(function() {
            localStorage['ingress.intelmap.layergroupdisplayed'] = JSON.stringify({
              "Unclaimed Portals":Boolean(1 === 1),
              "Level 1 Portals":Boolean(1 === 1),
              "Level 2 Portals":Boolean((1 <= 2) && (8 >= 2)),
              "Level 3 Portals":Boolean((1 <= 3) && (8 >= 3)),
              "Level 4 Portals":Boolean((1 <= 4) && (8 >= 4)),
              "Level 5 Portals":Boolean((1 <= 5) && (8 >= 5)),
              "Level 6 Portals":Boolean((1 <= 6) && (8 >= 6)),
              "Level 7 Portals":Boolean((1 <= 7) && (8 >= 7)),
              "Level 8 Portals":Boolean(8 === 8),
              "DEBUG Data Tiles":false,
              "Artifacts":true,
              "Ornaments":true
            });
            var script = document.createElement('script');
            script.type='text/javascript';
            script.src='https://secure.jonatkins.com/iitc/release/total-conversion-build.user.js';
            document.head.insertBefore(script, document.head.lastChild);
        });
        loadIitcPlugin('http://iitc.jonatkins.com/release/plugins/canvas-render.user.js');
        for(var i in plugins){
            var plugin = plugins[i];
            if(plugin.match(^[a-zA-Z]+://)){
                loadIitcPlugin(plugin);
            }else{
               loadLocalIitcPlugin(plugin);
            }
        }
        setTimeout(function() {
            if (search != "nix") {
                page.evaluate(function(search) {
                    if (document.querySelector('#search')){
                      window.setTimeout(function() {
                        document.getElementById("search").value=search;
                        var e = jQuery.Event("keypress");
                        e.which = 13;
                        e.keyCode = 13;
                        $("#search").trigger(e);
                      }, 2000);
                      setInterval(function() {
                        if ($('.searchquery').length > 0) {
                            window.setTimeout(function() {$('.searchquery > :nth-child(2)').children()[0].click();}, 1000);
                            clearInterval(checkExist);
                        }
                      }, 100);             
                    }
                }, search);
            }
            waitFor({
                timeout: 120000,
                check: function () {
                    return page.evaluate(function() {
                        if (document.querySelector('.map').textContent.indexOf('done') != -1) {
                            return true;
                        }else{
                            return false;
                        }
                    });
                },
                success: function () {
                    hideDebris();
                    prepare('1920', '1080');
                    main();
                },
                error: function () {
                    hideDebris();
                    prepare('1920', '1080');
                    main();
                }
            });
        }, "5000");
    }, "5000");
  });
}

function s(file) {
  page.render(file);
  phantom.exit(0);
}

function hideDebris() {
  window.setTimeout(function() {
    page.evaluate(function() {
      if (document.querySelector('#chat'))                      {document.querySelector('#chat').style.display = 'none';}
      if (document.querySelector('#chatcontrols'))              {document.querySelector('#chatcontrols').style.display = 'none';}
      if (document.querySelector('#chatinput'))                 {document.querySelector('#chatinput').style.display = 'none';}
      if (document.querySelector('#updatestatus'))              {document.querySelector('#updatestatus').style.display = 'none';}
      if (document.querySelector('#sidebartoggle'))             {document.querySelector('#sidebartoggle').style.display = 'none';}
      if (document.querySelector('#scrollwrapper'))             {document.querySelector('#scrollwrapper').style.display = 'none';}
      if (document.querySelector('.leaflet-control-container')) {document.querySelector('.leaflet-control-container').style.display = 'none';}
    });
  }, 2000);
}

function prepare(widthz, heightz) {
        window.setTimeout(function() {
          page.evaluate(function(w, h) {
            $("span:contains(' Google Roads')").prev().click();
            var water = document.createElement('p');
            water.id='viewport-ice';
            water.style.position = 'absolute';
            water.style.top = '0';
            water.style.marginTop = '0';
            water.style.paddingTop = '0';
            water.style.left = '0';
            water.style.width = w + 'px';
            water.style.height = h + 'px';
            document.querySelectorAll('body')[0].appendChild(water);
          }, widthz, heightz);
          var selector = "#viewport-ice";
          setElementBounds(selector);
        }, 4000);
}


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
    water.style.color = '#3A539B';
    water.style.top = '0';
    water.style.zIndex = '4404';
    water.style.marginTop = '0';
    water.style.paddingTop = '0';
    water.style.left = '0';
    water.style.fontSize = '40px';
    water.style.opacity = '0.8';
    water.style.fontFamily = 'monospace';
    water.style.textShadow = 'rgb(3, 3, 3) 7px 5px 9px';
    document.querySelectorAll('body')[0].appendChild(water);
  }, time);
}

/**
 * Main function.
 */
function main() {
  page.evaluate(function() {
    if (document.getElementById('watermark-ice')) {
      var oldStamp = document.getElementById('watermark-ice');
      oldStamp.parentNode.removeChild(oldStamp);
    }
  });
  window.setTimeout(function() {
    addTimestamp(getDateTime(0));
    file = filepath;
    s(file);
  }, 3000);
}
