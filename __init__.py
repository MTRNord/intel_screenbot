from bs4 import BeautifulSoup
import requests
import json
import asyncio, io, logging, os, re, time, tempfile
import subprocess
import plugins
import re
from asyncio import subprocess
from shutil import move
from os import remove, close

logger = logging.getLogger(__name__)


def _initialise(bot):
    plugins.register_user_command(["intel", "iitc"])
    plugins.register_admin_command(["setintel", "clearintel", "show_iitcplugins", "set_iitcplugins", "clear_iitcplugins"])
    _get_iitc_plugins(bot)


@asyncio.coroutine
def _open_file(name):
    logger.debug("opening screenshot file: {}".format(name))
    return open(name, 'rb')

def _parse_onlineRepos(url, ext=''):
    logger.debug("parsing github or gitlab or http(s)")
    page = requests.get(url).text
    if 'gitlab.com' in url:
        files = []
        for json_page in json.loads(page):
            for attribute, value in json_page.items():
                if attribute == "name":
                    if value.endswith(ext):
                        files.append(url.replace("/tree/", "/blobs/master") + "&filepath="  + value)
        return files
    elif 'github.com' in url:
        files = []
        for attribute, value in json.loads(page).items():
            if attribute == "tree":
                for tree in value:
                    for attribute, value in tree.items():
                        if attribute == "path":
                            if value.endswith(ext) and not 'total-conversion-build.user.js' in value and not 'user-location.user.js' in value and not 'test' in value:
                                files.append(url.replace("https://api.github.com/repos/", "https://raw.githubusercontent.com/").replace("git/trees/",'').replace("master?recursive=1","master/") + value)
        return files
    else:
        soup = BeautifulSoup(page, 'html.parser')
        return [url + '/' + node.get('href') for node in soup.find_all('a') if node.get('href').endswith(ext)]

def _get_iitc_plugins(bot):
    logger.debug("getting availible plugins")
    if bot.config.exists(["intel_screenbot", "gitlab_token"]):
        token = bot.config.get_by_path(["intel_screenbot", "gitlab_token"])
    url_config = bot.config.get_by_path(["intel_screenbot", "plugin_dirs"])
    ext = '.user.js'
    data=[]
    for url in url_config:
        if ext in url:
            item = {"name": url.split('/', url.count('/'))[-1].replace(ext, ''), "url": url}
            data.append(item)
        else:
            if "gitlab.com" in url:
                url = url + '?private_token=' + token
            for file in _parse_onlineRepos(url, ext):
                if "gitlab.com" in url:
                    item = {"name": file.split('=', file.count('='))[-1].replace(ext, ''), "url": file}
                elif 'github.com' in url:
                    item = {"name": file.split('/', file.count('/'))[-1].replace(ext, ''), "url": file}
                else:
                    item = {"name": file.split('/', file.count('/'))[-1].replace(ext, ''), "url": file}
                data.append(item)

    iitc_plugins = data
    if bot.memory.exists(["iitc_plugins"]):
        bot.memory.pop_by_path(["iitc_plugins"])
        bot.memory.set_by_path(["iitc_plugins"], iitc_plugins)
    else:
        bot.memory.set_by_path(["iitc_plugins"], iitc_plugins)

@asyncio.coroutine
def _get_lines(shell_command):
    p = yield from asyncio.create_subprocess_shell(shell_command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    stdout, stderr = yield from p.communicate()
    return p.returncode, stdout

@asyncio.coroutine
def _screencap(maptype, url, filepath, filename, SACSID, CSRF, plugins, search, bot, event):
    loop = asyncio.get_event_loop()
    logger.info("screencapping {} and saving as {}".format(url, filepath))
    if plugins is '':
        if search == False:
            command = 'phantomjs hangupsbot/plugins/intel_screenbot/screencap_' + maptype + '.js "' + SACSID + '" "' + CSRF + '" "' + url + '" "' + filepath + '"'
            task = _get_lines(command)
            task = asyncio.wait_for(task, 240.0, loop=loop)
            exitcode, stdout = loop.run_until_complete(task)
        else:
            command = 'phantomjs hangupsbot/plugins/intel_screenbot/screencap_' + maptype + '.js "' + SACSID + '" "' + CSRF + '" "' + url + '" "' + filepath + '" "' + search + '"'
            task = _get_lines(command)
            task = asyncio.wait_for(task, 240.0, loop=loop)
            exitcode, stdout = yield from task
    else:
        if search == False:
            command = 'phantomjs hangupsbot/plugins/intel_screenbot/screencap_' + maptype + '.js "' + SACSID + '" "' + CSRF + '" "' + url + '" "' + filepath + '" "' + plugins + '"'
            task = _get_lines(command)
            task = asyncio.wait_for(task, 240.0, loop=loop)
            exitcode, stdout = loop.run_until_complete(task)
        else:
            command = 'phantomjs hangupsbot/plugins/intel_screenbot/screencap_' + maptype + '.js "' + SACSID + '" "' + CSRF + '" "' + url + '" "' + filepath + '" "' + search + '" "' + plugins + '"'
            task = _get_lines(command)
            task = asyncio.wait_for(task, 240.0, loop=loop)
            exitcode, stdout = yield from task

    # read the resulting file into a byte array
    yield from asyncio.sleep(3)
    file_resource = yield from _open_file(filepath)
    file_data = yield from loop.run_in_executor(None, file_resource.read)
    image_data = yield from loop.run_in_executor(None, io.BytesIO, file_data)
    try:
        image_id = yield from bot._client.upload_image(image_data, filename=filename)
        yield from bot._client.sendchatmessage(event.conv.id_, None, image_id=image_id)
    except Exception as e:
        yield from bot.coro_send_message(event.conv_id, "<i>error uploading screenshot</i>")
        logger.exception("upload failed".format(url))


def setintel(bot, event, *args):
    """set url for current converation for the intel or iitc command.
    use /bot clearintel to clear the previous url before setting a new one.
    """
    url = bot.conversation_memory_get(event.conv_id, 'IntelURL')
    if url is None:
        bot.conversation_memory_set(event.conv_id, 'IntelURL', ''.join(args))
        html = "<i><b>{}</b> updated screenshot URL".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    else:
        html = "<i><b>{}</b> URL already exists for this conversation!<br /><br />".format(event.user.full_name)
        html += "<i>Clear it first with /bot clearintel before setting a new one."
        yield from bot.coro_send_message(event.conv, html)


def clearintel(bot, event, *args):
    """clear url for current converation for the intel or iitc command.
    """
    url = bot.conversation_memory_get(event.conv_id, 'IntelURL')
    if url is None:
        html = "<i><b>{}</b> nothing to clear for this conversation".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    else:
        bot.conversation_memory_set(event.conv_id, 'IntelURL', None)
        html = "<i><b>{}</b> URL cleared for this conversation!<br />".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)


def intel(bot, event, *args):
    """get a screenshot of a search term or intel URL or the default intel URL of the hangout.
    """

    if args:
        if len(args) > 1:
            url = ' '.join(str(i) for i in args)
        else:
            url = args[0]
        if '"' in url:
            url = url.replace('"', '')
    else:
        url = bot.conversation_memory_get(event.conv_id, 'IntelURL')

    if bot.config.exists(["intel_screenbot", "SACSID"]):
        if bot.config.exists(["intel_screenbot", "CSRF"]):
            SACSID = bot.config.get_by_path(["intel_screenbot", "SACSID"])
            CSRF = bot.config.get_by_path(["intel_screenbot", "CSRF"])
        else:
            html = "<i><b>{}</b> No Intel password has been added to config. Unable to authenticate".format(event.user.full_name)
            yield from bot.coro_send_message(event.conv, html)
    elif bot.config.exists(["intel_screenbot", "email"]):
        if bot.config.exists(["intel_screenbot", "password"]):
            SACSID = bot.config.get_by_path(["intel_screenbot", "email"])
            CSRF = bot.config.get_by_path(["intel_screenbot", "password"])
        else:
            html = "<i><b>{}</b> No Intel password has been added to config. Unable to authenticate".format(event.user.full_name)
            yield from bot.coro_send_message(event.conv, html)
    else:
        html = "<i><b>{}</b> No Intel SACSID Cookie or Email/password has been added to config. Unable to authenticate".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    if url is None:
        html = "<i><b>{}</b> No Intel URL or search term has been set for screenshots.".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    else:
        if re.match(r'^[a-zA-Z]+://', url):
            search = False
            ZoomSearch = re.finditer(r"(?:&z=).*", url)
            for matchNum, zoomlevel_raw in enumerate(ZoomSearch):
                matchNum = matchNum + 1
            zoomlevel_clean = zoomlevel_raw.group()
            zoomlevel = zoomlevel_clean[3:][:2]
            if zoomlevel.isdigit():
                yield from bot.coro_send_message(event.conv_id, "<i>intel map at zoom level "+ zoomlevel + " requested, please wait...</i>")
            else:
                yield from bot.coro_send_message(event.conv_id, "<i>intel map at last zoom level requested, please wait...</i>")
        else:
            search = url
            logger.info(search);
            url = 'https://www.ingress.com/intel'
            yield from bot.coro_send_message(event.conv_id, "<i>intel map is searching " + search + " and screenshooting as requested, please wait...</i>")

        filename = event.conv_id + "." + str(time.time()) +".png"
        filepath = tempfile.NamedTemporaryFile(prefix=event.conv_id, suffix=".png", delete=False).name
        logger.debug("temporary screenshot file: {}".format(filepath))
        try:
            loop = asyncio.get_event_loop()
            image_data = yield from _screencap("intel", url, filepath, filename, SACSID, CSRF, "", search, bot, event)
        except Exception as e:
            yield from bot.coro_send_message(event.conv_id, "<i>error getting screenshot</i>")
            logger.exception("screencap failed".format(url))
            return


def iitc(bot, event, *args):
    """get a screenshot of a search term or intel URL or the default intel URL of the hangout.
    """

    if args:
        if len(args) > 1:
            url = ' '.join(str(i) for i in args)
        else:
            url = args[0]
        if '"' in url:
            url = url.replace('"', '')
    else:
        url = bot.conversation_memory_get(event.conv_id, 'IntelURL')

    if bot.config.exists(["intel_screenbot", "SACSID"]):
        if bot.config.exists(["intel_screenbot", "CSRF"]):
            SACSID = bot.config.get_by_path(["intel_screenbot", "SACSID"])
            CSRF = bot.config.get_by_path(["intel_screenbot", "CSRF"])
        else:
            html = "<i><b>{}</b> No Intel password has been added to config. Unable to authenticate".format(event.user.full_name)
            yield from bot.coro_send_message(event.conv, html)
    elif bot.config.exists(["intel_screenbot", "email"]):
        if bot.config.exists(["intel_screenbot", "password"]):
            SACSID = bot.config.get_by_path(["intel_screenbot", "email"])
            CSRF = bot.config.get_by_path(["intel_screenbot", "password"])
        else:
            html = "<i><b>{}</b> No Intel password has been added to config. Unable to authenticate".format(event.user.full_name)
            yield from bot.coro_send_message(event.conv, html)
    else:
        html = "<i><b>{}</b> No Intel SACSID Cookie or Email/password has been added to config. Unable to authenticate".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)
        
    if url is None:
        html = "<i><b>{}</b> No Intel URL has been set for screenshots.".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    else:
        if re.match(r'^[a-zA-Z]+://', url):
            search = False
            ZoomSearch = re.finditer(r"(?:&z=).*", url)
            for matchNum, zoomlevel_raw in enumerate(ZoomSearch):
                matchNum = matchNum + 1
            zoomlevel_clean = zoomlevel_raw.group()
            zoomlevel = zoomlevel_clean[3:][:2]
            if zoomlevel.isdigit():
                yield from bot.coro_send_message(event.conv_id, "<i>intel map at zoom level "+ zoomlevel + " requested, please wait...</i>")
            else:
                yield from bot.coro_send_message(event.conv_id, "<i>intel map at last zoom level requested, please wait...</i>")
        else:
            search = url
            logger.info(search);
            url = 'https://www.ingress.com/intel'
            yield from bot.coro_send_message(event.conv_id, "<i>intel map is searching " + search + " and screenshooting as requested, please wait...</i>")

        filename = event.conv_id + "." + str(time.time()) +".png"
        filepath = tempfile.NamedTemporaryFile(prefix=event.conv_id, suffix=".png", delete=False).name
        plugins_filepath = tempfile.NamedTemporaryFile(prefix=event.conv_id, suffix=".json", delete=False).name
        logger.debug("temporary screenshot file: {}".format(filepath))
        if bot.conversation_memory_get(event.conv_id, 'iitc_plugins'):
            plugins = []
            plugin_names = bot.conversation_memory_get(event.conv_id, 'iitc_plugins').split(", ")
            if bot.memory.exists(["iitc_plugins"]):
                for plugin_objects in bot.memory.get_by_path(["iitc_plugins"]):
                    for plugin_name in plugin_names:
                        if plugin_objects["name"]  == plugin_name:
                            plugins.append(plugin_objects["url"])
        else:
             plugins = ''

        with open(plugins_filepath, 'w') as out:
            out.write(json.dumps(plugins))

        try:
            loop = asyncio.get_event_loop()
            image_data = yield from _screencap("iitc", url, filepath, filename, SACSID, CSRF, plugins_filepath, search, bot, event)
        except Exception as e:
            yield from bot.coro_send_message(event.conv_id, "<i>error getting screenshot</i>")
            logger.exception("screencap failed".format(url))
            return

def show_iitcplugins(bot, event, *args):
    if bot.memory.exists(["iitc_plugins"]):
        plugin_names = []
        for plugin_objects in bot.memory.get_by_path(["iitc_plugins"]):
            for attribute, value in plugin_objects.items():
                if attribute == "name":
                    plugin_names.append(value)
        yield from bot.coro_send_to_user_and_conversation(event.user.id_.chat_id, event.conv_id, "<i><b>IITC Plugins:</b><br> {}</i>".format(', <br>'.join(str(i) for i in plugin_names)), _("<i><b>{}</b>, I've sent you the plugins ;)</i>").format(event.user.full_name))

def set_iitcplugins(bot, event, *args):
    if not bot.conversation_memory_get(event.conv_id, 'iitc_plugins') is None:
        html = "<i><b>{}</b> plugins already set for this conversation!<br /><br />".format(event.user.full_name)
        html += "<i>Clear them first with /bot clear_iitcplugins before setting new ones."
        yield from bot.coro_send_message(event.conv, html)
    else:
        bot.conversation_memory_set(event.conv_id, 'iitc_plugins', ', '.join(args))
        html = "<i><b>{}</b> updated plugins".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

def clear_iitcplugins(bot, event, *args):
    if bot.conversation_memory_get(event.conv_id, 'iitc_plugins') is None:
        html = "<i><b>{}</b> nothing to clear for this conversation".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    else:
        bot.conversation_memory_set(event.conv_id, 'iitc_plugins', None)
        html = "<i><b>{}</b> plugins cleared for this conversation!<br />".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)
