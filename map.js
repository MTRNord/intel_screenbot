"use strict";

/*Idea @suntzu8 */
/*Author @mtrnord */
/*global phantom */
/*global page */
/*global scriptArgs */

phantom.injectJs("intelbootstrap.js");

window.addEventListener("auth_completed", function () {
    console.log("Let's do this!");
    page.viewportSize = {width: '1280', height: '720'};

    page.onCallback = function () {
        page.render(scriptArgs.Outputfile);

        /* Prevent Python bug */
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
    };

    page.open(scriptArgs.search, function (status) {
        if (status !== 'success') {
            console.output("Unable to connect to intel");
            phantom.exit();
        }
        if (!isSignedIn()) {
            console.output("Sign on not working");
            phantom.exit();
        }
        hideDebris();
        page.evaluate(function (maptype) {
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
            if (maptype == "intel") {
              localStorage['iitc-base-map'] = 'Google Default Ingress Map';
            }else {
              localStorage['iitc-base-map'] = 'Google Roads';
            }
        }, scriptArgs.maptype)
        page.evaluate(function () {
            var setup = function () {
                window.addHook('mapDataRefreshEnd', function (data) {
                    window.callPhantom();
                });
            };
            if (!window.bootPlugins) {
                window.bootPlugins = [];
            }
            window.bootPlugins.push(setup);
            if (window.iitcLoaded && typeof setup === 'function') {
                console.log("IITC already loaded");
                setup();
            }
        });
        loadIitcPlugin('https://static.iitc.me/build/release/plugins/canvas-render.user.js');
        loadIitcPlugin('https://static.iitc.me/build/test/total-conversion-build.user.js');
        for(var i in scriptArgs.plugins){
          var plugin = scriptArgs.plugins[i];
          if(plugin.match('(http(s)?:\/\/)')){
            loadIitcPlugin(plugin);
          }else{
            loadLocalIitcPlugin(plugin);
          }
        }
        hideDebris()
    });
}, true);
