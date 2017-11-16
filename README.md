# Ingress Intel Screenbot

Note: Most of the Code in `screencap.js` comes from [ingress-ice](https://github.com/nibogd/ingress-ice) which isn't made by me. So code Credits of it goes in the most parts to `nibogd`. I only modified it for the Bot.

Requires: **PhantomJS** (installation instructions below)

Requires: **[hangoutsbot](https://github.com/hangoutsbot/hangoutsbot)**

Get and post a screenshot of the Intel Map.

## Known Bugs
- Currently portalinfo seems to be 50% of the times broken. It will be fixed in the ongoing rewrite.

## Install
To install the plugin you need to:

1. Go into `<yourBotDir>/plugins/`
2. Clone this repo into `intel_screenbot`
3. Optional remove `README.md` `LICENSE` and `.gitignore` from `<yourBotDir>/plugins/intel_screenbot`
4. Run `pip3 install -r requirements.txt`
5. Follow Configuration.

## Configuration with Email Password

**IMPORTANT: DO NOT USE YOUR MAIN ACCOUNT! I AM NOT RESPONSIBLE IF YOUR ACCOUNT GETS BANNED! USE AT YOUR OWN RISK**

*Note: DON'T set cookies up when using email/password*<br \><br \>
For using the Intel Screenbot you need to add the following json-code to the config.json:

```
 "intel_screenbot": {
   "email": "YOUR EMAIL",
   "password": "YOUR Password",
   "plugin_dirs": [
     "https://api.github.com/repos/iitc-project/iitc-project.github.io/git/trees/master?recursive=1"
   ]
 }
```  

According to the official INSTALL Documention of the hangoutbot you will find the config.json in `/<username>/.local/share/hangupsbot/` <br \>
(NOTE! add an comma behind the last element of the config.json and add it before the outer element closes)

Also you need to add `intel_screenbot` to the plugins.

## How to add gitlab to plugin_dirs

1. Open in browser: `https://gitlab.com/api/v3/projects/search/:REPO_NAME`
2. copy the number in `id`
3. add `http://gitlab.com/api/v3/projects/:ID/repository/tree` to `plugin_dirs`
4. add `"gitlab_token":"YOUR_GITLAB_API_TOKEN"` to `intel_screenbot`

*Note: repos are currently locked to master branch*

## How to add github to plugins_dir

1. add `https://api.github.com/repos/:REPO_USER/:REPO_NAME/git/trees/master?recursive=1`

*Note: repos are currently locked to master branch*

## How to add local files to plugins_dir

1. just add the absolute path to `plugins_dir` (relative paths are not tested)

## Admin Commands

`/bot setintel [url]`
* Sets the default Intel URL of a particular hangout.  
* If no url provided it will be cleared

`/bot show_iitcplugins`  
* Shows every availible IITC-plugin.

`/bot set_iitcplugins <plugin names devided by whitespace>`  
* Sets the plugins to use with IITC per hangout.

`/bot clear_iitcplugins`  
* Clear the plugins to use with IITC per hangout.


## User Command

`/bot intel [[url] or [searchTerm]] [z=zoomlevel]`
* Provide an arbitrary `<url>` to take a screenshot
* If no `<url>` is supplied, use the default screenshot URL (or reply with an error if no URL is set)
* `z=` lets you change the zoomlevel of the map

`/bot iitc [[url] or [searchTerm]] [z=zoomlevel]`
* Provide an arbitrary `<url>` to take a screenshot
* If no `<url>` is supplied, use the default screenshot URL (or reply with an error if no URL is set)
* `z=` lets you change the zoomlevel of the map

`/portalpic <url>`
* Makes a screenshot of the Portalinfo of the defined portal.

`/portalinfo <url>`
* Gives you a text version of the most important Portal Information. (Pretty long!)

## PhantomJS Installation

Only tested way to install:

```
wget https://cnpmjs.org/downloads/phantomjs-2.1.1-linux-x86_64.tar.bz2
tar xvjf phantomjs-2.1.1-linux-x86_64.tar.bz2
mv phantomjs-2.1.1-linux-x86_64 /usr/local/share
ln -sf /usr/local/share/phantomjs-2.1.1-linux-x86_64/bin/phantomjs /usr/local/bin
```

# Sponsoring
<a target='_blank' rel='nofollow' href='https://app.codesponsor.io/link/pc1YAZAnXxNRhLY8PX5qJ9P3/MTRNord/intel_screenbot'>
  <img alt='Sponsor' width='888' height='68' src='https://app.codesponsor.io/embed/pc1YAZAnXxNRhLY8PX5qJ9P3/MTRNord/intel_screenbot.svg' />
</a>
