"use strict";

/*Author @suntzu8 */
/*global phantom */
/*global page */
/*global scriptArgs */

phantom.injectJs("intelbootstrap.js");

window.addEventListener("auth_completed", function () {
    console.log("Let's do this!");
    page.viewportSize = {width: '1280', height: '720'};

    page.onCallback = function (data) {
        var json = JSON.stringify(data, null, 2);
        console.output(json);
        phantom.exit();
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
        page.evaluate(function () {
            var setup = function () {
                window.addHook('portalDetailsUpdated', function (data) {
                    window.callPhantom(data.portalDetails);
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
        page.includeJs('https://static.iitc.me/build/release/plugins/canvas-render.user.js');
        page.includeJs('https://static.iitc.me/build/test/total-conversion-build.user.js');
    });
}, true);
