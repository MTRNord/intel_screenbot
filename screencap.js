var system = require('system');
var args = system.args;
var page = require('webpage').create();
var fs = require('fs');
var cookiespath = '/tmp/.iced_cookies';
var config = '';
var loginTimeout = '5000';
if (args.length === 1) {
    console.log('Try to pass some args when invoking this script!');
} else {
  var arguments_file  = args[1];
  var arguments = JSON.parse(fs.read(arguments_file));
  if (arguments.hasOwnProperty('plugins')) {
    var plugins = arguments["plugins"]
  }
  if (arguments.hasOwnProperty('zoomlevel')) {
    var zoomlevel = arguments["zoomlevel"]
  }
  var maptype = arguments["maptype"]
  var search = arguments["search"]
  var url = arguments["url"]
  var filepath = arguments['filepath']
  var user = arguments['email']
  var pass = arguments['password']
  var screenshotfunction = arguments['screenshotfunction']
  if(screenshotfunction == "portalinfoText"){
    var portalinfoResponse = arguments['portalinfoResponse']
  }
}

function loadCookies(callback) {
  if(fs.exists(cookiespath)) {
    var stream = fs.open(cookiespath, 'r');

    while(!stream.atEnd()) {
      var line = stream.readLine().split('=');
      if(line[0] === 'SACSID') {
        config.SACSID = line[1];
      } else if(line[0] === 'csrftoken') {
        config.CSRF = line[1];
      } else {
        config.SACSID = '';
        config.CSRF = '';
      }
    }
    stream.close();
  }
  callback();
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

loadCookies(function() {
  if (config.SACSID == undefined || config.SACSID == '') {
    firePlainLogin(user, pass, url);
  } else {
    addCookies(config.SACSID, config.CSRF);
    afterLogin(url, search, "cookie");
  }
});

function waitFor ($config) {
    $config._start = $config._start || new Date();
    if ($config.timeout && new Date - $config._start > $config.timeout) {
        if ($config.error) $config.error();
        return;
    }
    if ($config.check()) {
        return $config.success();
    }
    setTimeout(waitFor, $config.interval || 0, $config);
}


function isSignedIn() {
  return page.evaluate(function() {
    return document.getElementsByTagName('a')[0].innerText.trim() !== 'Sign in';
  });
}

function storeCookies() {
  var cookies = page.cookies;
  fs.write(cookiespath, '', 'w');
  for(var i in cookies) {
    fs.write(cookiespath, cookies[i].name + '=' + cookies[i].value +'\n', 'a');
  }
}

function firePlainLogin(user, pass, url) {
  page.open('https://www.ingress.com/intel', function (status) {
    page.evaluate(function () {
      localStorage.clear()
    });
    if (status !== 'success') {console.log("Login ERROR"); phantom.exit(0);}
    var link = 'https://www.google.com/accounts/ServiceLogin?service=ah&passive=true&continue=https://appengine.google.com/_ah/conflogin%3Fcontinue%3Dhttps://www.ingress.com/intel&ltmpl='
    page.open(link, function () {
      login(user, pass, url);
    });
  });
}

function login(l, p, url) {
    if (document.querySelector('#timeoutError')){
        firePlainLogin(l, p)
    }
    waitFor({
        timeout: loginTimeout*2,
        check: function () {
            return page.evaluate(function() {
                if (document.querySelector('#gaia_loginform')) {
                    return true;
                }else{
                    return false;
                }
            });
        },
        success: function () {
            page.evaluate(function (l) {
                document.getElementById('Email').value = l;
            }, l);
            page.evaluate(function () {
                document.querySelector("#next").click();
            });
            window.setTimeout(function () {
                page.evaluate(function (p) {
                    document.getElementById('Passwd').value = p;
                }, p);
                if(document.querySelector("#next")){
                    page.evaluate(function () {
                        document.querySelector("#next").click();
                    });
                }else{
                    page.evaluate(function () {
                        document.querySelector("#signIn").click();
                    });
                }
                window.setTimeout(function () {
                    if (page.url.substring(0,40) === 'https://accounts.google.com/ServiceLogin') {
                        console.log("login failed: wrong email and/or password")
                        phantom.exit(0);
                    }

                    if (page.url.substring(0,40) === 'https://appengine.google.com/_ah/loginfo') {
                        page.evaluate(function () {
                            document.getElementById('persist_checkbox').checked = true;
                            document.getElementsByTagName('form').submit();
                        });
                    }

                    if (page.url.substring(0,44) === 'https://accounts.google.com/signin/challenge') {
                        twostep = system.stdin.readLine();
                    }
                    window.setTimeout(afterLogin(url, search, "plain"), loginTimeout);
                }, loginTimeout)
            }, loginTimeout / 10);
        },
        error: function () {
            phantom.exit(0);
        }
    });
}

function map(search){
  setTimeout(function() {
    if (search != 'nix') {
      searchfunc(search);
    }
    waitFor({
      timeout: 240000,
      check: function () {
        return page.evaluate(function(zoomlevel) {
          if (document.querySelector('.map').textContent.indexOf('done') != -1) {
            return true;
          }else{
            console.log('generateFakeOutput')
            return false;
          }
        }, zoomlevel);
      },
      success: function () {
        var startTime = new Date().getTime();
        var interval = setInterval(function(){
          if(new Date().getTime() - startTime > 5000){
            hideDebris();
            prepare('1280', '720');
            main();
            clearInterval(interval);
            return;
          }
          console.log('generateFakeOutput')
        }, 1000);
      },
      error: function () {
        var startTime = new Date().getTime();
        var interval = setInterval(function(){
          if(new Date().getTime() - startTime > 5000){
            hideDebris();
            prepare('1280', '720');
            main();
            clearInterval(interval);
            return;
          }
          console.log('generateFakeOutput')
        }, 1000);
      }
    });
  }, "1000");
}

function portalinfoScreen(){
  setTimeout(function() {
    waitFor({
      timeout: 240000,
      check: function () {
        return page.evaluate(function() {
          if (document.querySelector('.map').textContent.indexOf('done') != -1) {
            return true;
          }else{
            console.log('generateFakeOutput')
            return false;
          }
        });
      },
      success: function () {
	var clipRect = page.evaluate(function(){
	  return document.querySelector('#sidebar').getBoundingClientRect();
	});
	page.evaluate(function(){
	  document.querySelector('#playerstat').style.display = 'none';
	  document.querySelector('#searchwrapper').style.display = 'none';
	  document.querySelector('#redeem').style.display = 'none';
	});
        setTimeout(function() {
	  var elementHeight = page.evaluate(function(){
	    return $("#sidebar").height();
	  });

	  page.clipRect = {
	    top:    clipRect.top,
	    left:   clipRect.left,
	    width:  clipRect.width,
	    height: elementHeight
	  }
	  setTimeout(function() {s(filepath)}, "1000");
	}, "2000");
      },
      error: function () {
	var clipRect = page.evaluate(function(){
	  return document.querySelector('#sidebar').getBoundingClientRect();
	});

        setTimeout(function() {
	  var elementHeight = page.evaluate(function(){
	    return $("#sidebar").height();
	  });

	  page.clipRect = {
	    top:    clipRect.top,
	    left:   clipRect.left,
	    width:  clipRect.width,
	    height: elementHeight
	  }
	  setTimeout(function() {s(filepath)}, "1000");
	}, "2000");
      }
    });
  }, "1000");
}

function portalinfoText(){
  setTimeout(function() {
    waitFor({
      timeout: 240000,
      check: function () {
        return page.evaluate(function() {
          if (document.querySelector('.map').textContent.indexOf('done') != -1) {
            return true;
          }else{
            console.log('generateFakeOutput')
            return false;
          }
        });
      },
      success: function () {
	var PortalName = page.evaluate(function(){
	  return document.getElementById("portaldetails").getElementsByClassName("title")[0].innerHTML;
	});
	var reso1 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[0].cells[1].firstElementChild.getAttribute("title");
	});
	var reso2 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[0].cells[2].firstElementChild.getAttribute("title");
	});
	var reso3 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[1].cells[1].firstElementChild.getAttribute("title");
	});
	var reso4 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[1].cells[2].firstElementChild.getAttribute("title");
	});
	var reso5 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[2].cells[1].firstElementChild.getAttribute("title");
	});
	var reso6 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[2].cells[2].firstElementChild.getAttribute("title");
	});
	var reso7 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[3].cells[1].firstElementChild.getAttribute("title");
	});
	var reso8 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[3].cells[2].firstElementChild.getAttribute("title");
	});
	var text = PortalName + "</br></br><b>Resonator 1:</b></br>" + reso1 + "</br><b>Resonator 2:</b></br>" + reso2 + "</br><b>Resonator 3:</b></br>" + reso3 + "</br><b>Resonator 4:</b></br>" + reso4 + "</br><b>Resonator 5:</b></br>" + reso5 + "</br><b>Resonator 6:</b></br>" + reso6 + "</br><b>Resonator 7:</b></br>" + reso7 + "</br><b>Resonator 8:</b></br>" + reso8 
	fs.write(portalinfoResponse, text, 'w');
        var startTime = new Date().getTime();
	var startTime = new Date().getTime();
	var interval = setInterval(function(){
	  if(new Date().getTime() - startTime > 5000){
	    clearInterval(interval);
	    phantom.exit(0);
	    return;
	  }
	  console.log('doSomeOutput')
	}, 1000);
      },
      error: function () {
	var PortalName = page.evaluate(function(){
	  return document.getElementById("portaldetails").getElementsByClassName("title")[0].innerHTML;
	});
	var reso1 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[0].cells[1].firstElementChild.getAttribute("title");
	});
	var reso2 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[0].cells[2].firstElementChild.getAttribute("title");
	});
	var reso3 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[1].cells[1].firstElementChild.getAttribute("title");
	});
	var reso4 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[1].cells[2].firstElementChild.getAttribute("title");
	});
	var reso5 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[2].cells[1].firstElementChild.getAttribute("title");
	});
	var reso6 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[2].cells[2].firstElementChild.getAttribute("title");
	});
	var reso7 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[3].cells[1].firstElementChild.getAttribute("title");
	});
	var reso8 = page.evaluate(function(){
	  return document.getElementById("resodetails").rows[3].cells[2].firstElementChild.getAttribute("title");
	});
	var text = PortalName + "</br></br><b>Resonator 1:</b></br>" + reso1 + "</br><b>Resonator 2:</b></br>" + reso2 + "</br><b>Resonator 3:</b></br>" + reso3 + "</br><b>Resonator 4:</b></br>" + reso4 + "</br><b>Resonator 5:</b></br>" + reso5 + "</br><b>Resonator 6:</b></br>" + reso6 + "</br><b>Resonator 7:</b></br>" + reso7 + "</br><b>Resonator 8:</b></br>" + reso8 
	fs.write(portalinfoResponse, text, 'w');
        var startTime = new Date().getTime();
        var startTime = new Date().getTime();
        var interval = setInterval(function(){
          if(new Date().getTime() - startTime > 5000){
            clearInterval(interval);
            phantom.exit(0);
            return;
          }
          console.log('doSomeOutput')
        }, 1000);
      }
    });
  }, "1000");
}

function afterLogin(url, search, mode) {
  page.viewportSize = { width: '1280', height: '720' };
  page.open(url, function(status) {
    console.log(url)
    if (status !== 'success') {console.log('unable to connect to remote server after Login'); phantom.exit(0);}
    if (!isSignedIn()) {
      if(mode =="cookie"){
        if(fs.exists(cookiespath)) {
          fs.remove(cookiespath);
        }
      }
      console.log("not logged in")
      quit();
    }
    setTimeout(function() {
      if(mode == "plain"){
        storeCookies();
      }
      setupIITC()
      if(screenshotfunction == "map"){
        map(search);
      }else if (screenshotfunction == "portalinfoScreen"){
        portalinfoScreen();
      }else if (screenshotfunction == "portalinfoText"){
        portalinfoText();
      }
    }, "1000");
  });
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

function searchfunc(search){
  page.evaluate(function(search, zoomlevel) {
    if (document.querySelector('#search')){
      window.addHook('search', function(query) {
        var checkExist = setInterval(function() {
          if (query.results.length > 0) {
            map.fitBounds(query.results[0].bounds, {maxZoom: 17})
            clearInterval(checkExist);
          }
          if (typeof zoomlevel !== 'undefined' || zoomlevel !== null) {
            console.log(zoomlevel)
            window.map.setZoom(zoomlevel,animate=false)
          }
        }, 100);
      });
      setTimeout(function() {
        window.search.doSearch(search, true)
      }, 2000);
    }
  }, search, zoomlevel);
}

function setupIITC(){
  loadIitcPlugin('https://static.iitc.me/build/release/plugins/canvas-render.user.js');
  page.evaluate(function(maptype) {
    localStorage['ingress.intelmap.layergroupdisplayed'] = JSON.stringify({
      "Unclaimed Portals": false,
      "Level 1 Portals": true,
      "Level 2 Portals": true,
      "Level 3 Portals": true,
      "Level 4 Portals": true,
      "Level 5 Portals": true,
      "Level 6 Portals": true,
      "Level 7 Portals": true,
      "Level 8 Portals": true,
      "Fields": true,
      "Links": true,
      "Resistance": true,
      "Enlightened": true,
      "DEBUG Data Tiles":false,
      "Artifacts":true,
      "Ornaments":true
    });
    var script = document.createElement('script');
    script.type='text/javascript';
    script.src='https://static.iitc.me/build/test/total-conversion-build.user.js';
    document.head.insertBefore(script, document.head.lastChild);
    if (maptype == "intel") {
      localStorage['iitc-base-map'] = 'Google Default Ingress Map';
    }else {
      localStorage['iitc-base-map'] = 'Google Roads';
    }
  }, maptype);
  if (maptype != "intel") {
    for(var i in plugins){
      var plugin = plugins[i];
      if(plugin.match('(http(s)?:\/\/)')){
        loadIitcPlugin(plugin);
      }else{
        loadLocalIitcPlugin(plugin);
      }
    }
  }
}

function s(file) {
  console.log('SCREENSHOT')
  page.render(file);
  var startTime = new Date().getTime();
  var startTime = new Date().getTime();
  var interval = setInterval(function(){
    if(new Date().getTime() - startTime > 5000){
      clearInterval(interval);
      phantom.exit(0);
      return;
    }
    console.log('doSomeOutput')
  }, 1000);
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
      if (document.querySelector('#portal_highlight_select')) {document.querySelector('#portal_highlight_select').style.display = 'none';}
    });
  }, 200);
}

function prepare(widthz, heightz) {
    window.setTimeout(function() {
        page.evaluate(function(w, h) {
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
    }, 500);
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
  if (search == "nix") {
    if (maptype == "iitc") {
      page.evaluate(function(dateTime, search) {
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
	water.style.fontSize = '30px';
	water.style.opacity = '0.8';
	water.style.fontFamily = 'monospace';
	water.style.textShadow = '0px 1px 8px rgba(150, 150, 150, 1)';
	document.querySelectorAll('body')[0].appendChild(water);
      }, time, search);
    }else {
      page.evaluate(function(dateTime, search) {
        var water = document.createElement('p');
        water.id='watermark-ice';
        water.style.zIndex = '4404';
        water.innerHTML = dateTime;
        water.style.position = 'absolute';
        water.style.color = 'orange';
        water.style.top = '0';
        water.style.left = '0';
        water.style.fontSize = '30px';
        water.style.opacity = '0.8';
        water.style.marginTop = '0';
        water.style.paddingTop = '0';
        water.style.fontFamily = 'monospace';
        water.style.textShadow = '0px 1px 8px rgba(150, 150, 150, 1)';
        document.querySelectorAll('body')[0].appendChild(water);
      }, time, search);
    }
  }else{
    if (maptype == "iitc") {
      page.evaluate(function(dateTime, search) {
        var water = document.createElement('p');
        water.id='watermark-ice';
        water.innerHTML = dateTime + ' - ' + search;
        water.style.position = 'absolute';
        water.style.color = '#3A539B';
        water.style.top = '0';
        water.style.zIndex = '4404';
        water.style.marginTop = '0';
        water.style.paddingTop = '0';
        water.style.left = '0';
        water.style.fontSize = '30px';
        water.style.opacity = '0.8';
        water.style.fontFamily = 'monospace';
        water.style.textShadow = '0px 1px 8px rgba(150, 150, 150, 1)';
        document.querySelectorAll('body')[0].appendChild(water);
      }, time, search);
    }else {
      page.evaluate(function(dateTime, search) {
        var water = document.createElement('p');
        water.id='watermark-ice';
        water.style.zIndex = '4404';
        water.innerHTML = dateTime + ' - ' + search;
        water.style.position = 'absolute';
        water.style.color = 'orange';
        water.style.top = '0';
        water.style.left = '0';
        water.style.fontSize = '30px';
        water.style.opacity = '0.8';
        water.style.marginTop = '0';
        water.style.paddingTop = '0';
        water.style.fontFamily = 'monospace';
        water.style.textShadow = '0px 1px 8px rgba(150, 150, 150, 1)';
        document.querySelectorAll('body')[0].appendChild(water);
      }, time, search);
    }
  }
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
  }, 400);
}
