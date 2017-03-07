"use strict";

/*Author @suntzu8 */
/*Modified by @mtrnord */
/* global require */

var fs = require('fs'),
    system = require('system'),
    page = require('webpage').create(),
    os = system.os,
    phantomArgs = system.args,
    authCompletedEvent = new Event('auth_completed'),
    scriptArgs = {},
    loginTimeout = 5000,
    cookiesLoaded = false,

    log = (function (original_console) {
        var padLeft = function (str) {
                var toReturn = '' + str, length = 2;
                while (toReturn.length < length) {
                    toReturn = '0' + toReturn;
                }
                return toReturn;
            },
            timestamp = function () {
                var time = new Date();
                return padLeft(time.getHours()) + ":" + padLeft(time.getMinutes()) + ':' + padLeft(time.getSeconds()) + ": ";
            },
            self = {
                logEnabled: false,
                log: function (message) {
                    if (self.logEnabled) {
                        self.timedLog(message);
                    }
                },
                timedLog: function(message) {
                    self.output(timestamp() + message);
                },
                output: function (message) {
                    original_console.log(message);
                }
            };
        return self;
    })(console),

    loadScriptArguments = function (argumentsFileName) {
        var args = JSON.parse(fs.read(argumentsFileName));
        if (!args) {
            console.log("Invalid script args file");
            return false;
        }
        if (!args.hasOwnProperty("email")) {
            console.log("Script args file missing email");
            return false;
        }
        if (!args.hasOwnProperty("password")) {
            console.log("Script args file missing password");
            return false;
        }
        if (!args.hasOwnProperty("cookie_file")) {
            console.log("Script args file missing cookie_file");
            return false;
        }
        scriptArgs = args;
        return true;
    },

    login = function (email, password, cookieFileName) {
        if (!loadCookies(cookieFileName)) {
            doCleanLogin(email, password, cookieFileName)
        }
    },

    doCleanLogin = function (email, password, cookieFileName) {
        if (fs.exists(cookieFileName)) {
            fs.remove(cookieFileName);
        }
        console.log("Loading intel to clean local storage");
        page.open('https://www.ingress.com/intel', function (status) {
            if (status !== 'success') {
                console.log("Intel is down");
                phantom.exit();
            }
            page.evaluate(function () {
                localStorage.clear();
            });
            console.log("Loading google login page");
            page.open('https://www.google.com/accounts/ServiceLogin?service=ah&passive=true&continue=https://appengine.google.com/_ah/conflogin%3Fcontinue%3Dhttps://www.ingress.com/intel&ltmpl=', function () {
                googleLoginStep1(email, password, cookieFileName);
            });
        });
    },

    googleLoginStep1 = function (email, password, cookieFileName) {
        console.log("Google login loaded");
        if (document.querySelector('#timeoutError')) {
            console.log("Timeout error. Trying again.");
            window.setTimeout(doCleanLogin(email, password, cookieFileName), 100);
            return;
        }
        waitFor({
            timeout: loginTimeout * 2,
            interval: 500,
            check: function () {
                return page.evaluate(function () {
                    return !!(document.querySelector('#gaia_loginform'));
                });
            },
            error: function () {
                phantom.exit();
            },
            success: function () {
                googleLoginStep2(email, password, cookieFileName);
            }
        })
    },

    googleLoginStep2 = function (email, password, cookieFileName) {
        page.evaluate(function (l) {
            document.getElementById('Email').value = l;
        }, email);
        page.evaluate(function () {
            document.querySelector("#next").click();
        });
        console.log("Sent email to google");
        waitFor({
            timeout: loginTimeout * 2,
            interval: 500,
            check: function () {
                return page.evaluate(function () {
                    return !!(document.getElementById('Passwd'));
                });
            },
            error: function () {
                phantom.exit();
            },
            success: function () {
                googleLoginStep3(email, password, cookieFileName);
            }
        });
    },

    googleLoginStep3 = function (email, password, cookieFileName) {
        var currentUrl = page.url;
        page.evaluate(function (p) {
            document.getElementById('Passwd').value = p;
        }, password);
        if (document.querySelector("#next")) {
            page.evaluate(function () {
                document.querySelector("#next").click();
            });
        } else {
            page.evaluate(function () {
                document.querySelector("#signIn").click();
            });
        }
        console.log("Sent password to google");
        waitFor({
            timeout: loginTimeout * 2,
            interval: 500,
            check: function () {
                return page.url != currentUrl;
            },
            error: function () {
                phantom.exit();
            },
            success: function () {
                googleLoginStep4(email, password, cookieFileName);
            }
        });
    },

    googleLoginStep4 = function (email, password, cookieFileName) {
        if (page.url.substring(0, 40) === 'https://accounts.google.com/ServiceLogin') {
            console.log("login failed: wrong email and/or password");
            phantom.exit();
        }

        if (page.url.substring(0, 40) === 'https://appengine.google.com/_ah/loginfo') {
            console.log("Gotta submit this form.");
            page.evaluate(function () {
                document.getElementById('persist_checkbox').checked = true;
                document.getElementsByTagName('form').submit();
            });
        }

        if (page.url.substring(0, 44) === 'https://accounts.google.com/signin/challenge') {
            console.log("login failed: challenge issued");
            phantom.exit();
        }

        waitFor({
            timeout: loginTimeout * 2,
            interval: 500,
            check: function () {
                var expected = 'https://www.ingress.com/intel';
                return page.url.substring(0, expected.length) === expected;
            },
            error: function () {
                console.log("Error waiting for redirect: " + page.url);
                phantom.exit();
            },
            success: function () {
                afterLogin(cookieFileName);
            }
        });
    },

    afterLogin = function (cookieFileName) {
        console.log("Storing cookies for future activities");
        console.output(storeCookies(cookieFileName));
        console.output('eof bug here');
        loadCookies(cookieFileName);
    },

    storeCookies = function (cookieFileName) {
        fs.write(cookieFileName, JSON.stringify(page.cookies, null, 2), 'w');
    },

    loadCookies = function (cookieFileName) {
        var json, cookies, i, sacsid, csrftoken;
        if (!fs.exists(cookieFileName)) {
            return false;
        }
        json = fs.read(cookieFileName);
        cookies = JSON.parse(json);
        for (i = 0; i < cookies.length; i++) {
            switch (cookies[i].name.toLowerCase()) {
                case "sacsid":
                    sacsid = cookies[i].value;
                    break;
                case "csrftoken":
                    csrftoken = cookies[i].value;
                    break;
            }
        }

        if (!sacsid || !csrftoken) {
            return false;
        }

        addCookies(sacsid, csrftoken);
        cookiesLoaded = true;

        return true;
    },

    addCookies = function (sacsid, csrf) {
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
    },

    waitFor = function ($config) {
        $config._start = $config._start || new Date();
        if ($config.timeout && new Date - $config._start > $config.timeout) {
            if ($config.error) $config.error();
            return;
        }
        if ($config.check()) {
            return $config.success();
        }
        setTimeout(waitFor, $config.interval || 0, $config);
    },

    isSignedIn = function () {
        return page.evaluate(function () {
            return document.getElementsByTagName('a')[0].innerText.trim() !== 'Sign in';
        });
    },

    hideDebris = function() {
      /*Todo check if it worked */
      page.evaluate(function() {
        var chat = document.querySelector('#chat');
        var chatcontrols = document.querySelector('#chatcontrols');
        var chatinput = document.querySelector('#chatinput');
        var updatestatus = document.querySelector('#updatestatus');
        var sidebartoggle = document.querySelector('#sidebartoggle');
        var scrollwrapper = document.querySelector('#scrollwrapper');
        var controlContainer = document.querySelector('.leaflet-control-container');
        var highlight_select = document.querySelector('#portal_highlight_select');
        var chat = document.querySelector('#chat');

        if (chat)         {chat.style.display = 'none';}
        if (chatcontrols) {chatcontrols.tyle.display = 'none';}
        if (chatinput)    {chatinput.style.display = 'none';}
        if (updatestatus) {updatestatus.style.display = 'none';}
        if (sidebartoggle){sidebartoggle.style.display = 'none';}
        if (scrollwrapper){scrollwrapper.style.display = 'none';}
        if (controlContainer) {controlContainer.style.display = 'none';}
        if (highlight_select) {highlight_select.style.display = 'none';}
        if (chat) {chat.style.display = 'none';}
      });
    },
    loadIitcPlugin = function(src) {
      page.evaluate(function(src) {
        var script = document.createElement('script');
        script.type='text/javascript';
        script.src=src;
        document.head.insertBefore(script, document.head.lastChild);
      }, src);
    },
    loadLocalIitcPlugin = function(src) {
        page.injectJs(src)
    },
    prepare = function (widthz, heightz) {
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
    };

if (phantomArgs.length === 1) {
    console.log("usage: phantomjs " + phantomArgs[0] + " <<script args filename>>");
    phantom.exit();
}

setTimeout(function () {
    window.console = log;

    if (phantomArgs.hasOwnProperty("debug") && phantomArgs.debug) {
        console.logEnabled = true;

        page.onConsoleMessage = function (msg) {
            console.timedLog(msg);
        };
    }

    loadScriptArguments(phantomArgs[1]);

    login(scriptArgs.email, scriptArgs.password, scriptArgs.cookie_file);

    waitFor({
        timeout: 30000,
        interval: 1000,
        check: function () {
            return cookiesLoaded;
        },
        success: function () {
            console.log("Good to go!");
            window.dispatchEvent(authCompletedEvent);
        },
        error: function () {
            console.log("Crap...");
        }
    });
}, 10);
