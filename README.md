# Ingress Intel Screenbot

Note: Most of the Code in `screencap.js` comes from [ingress-ice](https://github.com/nibogd/ingress-ice) which isn't made by me. So code Credits of it goes in the most parts to `nibogd`. I only modified it for the Bot.

Requires: **PhantomJS** (installation instructions below)
Requires: **[hangoutsbot](https://github.com/hangoutsbot/hangoutsbot)**

Get and post a screenshot of the Intel Map. 

## Install
To install the plugin you need to:

1. Clone this repo into `<yourBotDir>/plugins/`
2. Optional remove `README.md` `LICENSE` and `.gitignore`
3. Follow Configuration.

## Configuration
For using the Intel Screenbot you need to add the following to the config.json:

```
 "intel_screenbot": {
    "SACSID": "YOUR SACSID",
    "CSRF": "YOUR CSRF"
  }
```  

According to the official INSTALL Documention of the hangoutbot you will find the config.json in `/<username>/.local/share/hangupsbot/`
(NOTE! add an comma behind the last element of the config.json and add it befor the outer element closes)

Also you need to add `intel_screenbot` to the plugins.

## How to get SACSID and CSRF
You should look at the Documentation of [ingress-ice](https://github.com/nibogd/ingress-ice/wiki/Cookies-Authentication)

## Admin Commands

`/bot setintel <url>`
* Sets the default Intel URL of a particular hangout.  

`/bot clearintel`  
* Clears the default screenshot URL of a particular hangout.

## User Command

`/bot intel [<url>]`
* Provide an arbitrary `<url>` to take a screenshot
* If no `<url>` is supplied, use the default screenshot URL (or reply with an error if no URL is set)

## PhantomJS Installation  

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
