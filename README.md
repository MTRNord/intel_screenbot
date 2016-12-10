# Ingress Intel Screenbot

Note: Most of the Code in `screencap.js` comes from [ingress-ice](https://github.com/nibogd/ingress-ice) which isn't made by me. So code Credits of it goes in the most parts to `nibogd`. I only modified it for the Bot.

Requires: **PhantomJS** (installation instructions below)

Requires: **[hangoutsbot](https://github.com/hangoutsbot/hangoutsbot)**

Get and post a screenshot of the Intel Map.

## Install
To install the plugin you need to:

1. Go into `<yourBotDir>/plugins/`
2. Clone this repo into `intel_screenbot`
3. Optional remove `README.md` `LICENSE` and `.gitignore` from `<yourBotDir>/plugins/intel_screenbot`
4. Run `pip3 install -r requirements.txt`
5. Follow Configuration.

## Configuration with Email Password

**IMPORTANT: DO NOT USE YOUR MAIN ACCOUNT! I AM NOT RESPONSIBLE IF YOU ACCOUNT GETS BANNED! USE AT YOUR OWN RISK**

*Note DON'T set cookies up when using emil/password*
For using the Intel Screenbot you need to add the following to the config.json:

```
 "intel_screenbot": {
   "email": "YOUR EMAIL",
   "password": "YOUR Password",
   "plugin_dirs": [
     "https://api.github.com/repos/iitc-project/iitc-project.github.io/git/trees/master?recursive=1"
   ]
 }
```  

According to the official INSTALL Documention of the hangoutbot you will find the config.json in `/<username>/.local/share/hangupsbot/`
(NOTE! add an comma behind the last element of the config.json and add it befor the outer element closes)

Also you need to add `intel_screenbot` to the plugins.

## How to add gitlab to plugin_dirs

1. Open in browser: `https://gitlab.com/api/v3/projects/search/:REPO_NAME`
2. copy the number in `id`
3. add `http://gitlab.com/api/v3/projects/:ID/repository/tree` to `plugin_dirs`
4. add `"gitlab_token":"YOUR_GITLAB_API_TOKEN"` to `intel_screenbot`

*Note: repos are currently locked to master branch*

## How to add github to plugins_dir

1. add `https://api.github.com/repos/:REPO_USER/:REPO_NAME/git/trees/master?recursive=1`

## How to add local files to plugins_dir

1. just add the absolute path to `plugins_dir` (relative paths are not tested)

*Note: repos are currently locked to master branch*

## How to get SACSID and CSRF
You should look at the Documentation of [ingress-ice](https://github.com/nibogd/ingress-ice/wiki/Cookies-Authentication)

## Admin Commands

`/bot setintel <url>`
* Sets the default Intel URL of a particular hangout.  

`/bot clearintel`  
* Clears the default screenshot URL of a particular hangout.

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

## PhantomJS Installation

*May be outdated*

### Debian-based distros (e.g. Ubuntu 14.04)

`sudo apt-get install phantomjs`

## Building PhantomJS from Source (Advanced)

Note: It is not within the scope of this project to discuss and resolve build problems with
  external libraries.

**Install dependencies**  

On Debian-based distro (tested on Ubuntu 14.04), run:  
```
sudo apt-get install build-essential g++ flex bison gperf ruby perl \
  libsqlite3-dev libfontconfig1-dev libicu-dev libfreetype6 libssl-dev \
  libpng-dev libjpeg-dev
```  

On Fedora-based distro (tested on CentOS 6), run:
```
sudo yum -y install gcc gcc-c++ make flex bison gperf ruby \  
  openssl-devel freetype-devel fontconfig-devel libicu-devel sqlite-devel \  
  libpng-devel libjpeg-devel
```  

**Install PhantomJS from source**

```
git clone git://github.com/ariya/phantomjs.git
cd phantomjs
git checkout 2.0
./build.sh
```
