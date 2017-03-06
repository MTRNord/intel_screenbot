from bs4 import BeautifulSoup
import requests
import json
import asyncio, io, logging, os, tempfile
import plugins
import re

logger = logging.getLogger(__name__)


def _initialise(bot):
    plugins.register_user_command(["intel", "iitc", "portalpic", "portalinfo", "active_iitcplugins"])
    plugins.register_admin_command(["setintel", "show_iitcplugins", "set_iitcplugins"])
    _get_iitc_plugins(bot)


@asyncio.coroutine
def _open_file(name, otype):
    return open(name, otype)

@asyncio.coroutine
def readline(f):
    while True:
        data = f.readline()
        if data:
            return data

def _parse_onlineRepos(url, ext=''):
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

def _get_lines(shell_command):
    p = yield from asyncio.create_subprocess_shell(shell_command)
    output = yield from asyncio.wait_for(p.wait(), 240.0)
    return p.returncode, output, True

@asyncio.coroutine
def _screencap(url, args_filepath, filepath, filename, bot, event, arguments):
    os.chmod(filepath, 0o666)
    loop = asyncio.get_event_loop()
    command = 'phantomjs hangupsbot/plugins/intel_screenbot/screencap.js "' + args_filepath + '"'
    task = _get_lines(command)
    task = asyncio.wait_for(task, 420.0)
    exitcode, output, status = yield from task

    # read the resulting file into a byte array
    # yield from asyncio.sleep(10)
    if (arguments['screenshotfunction'] != 'portalinfoText'):
        file_resource = yield from _open_file(filepath, 'rb')
        file_data = yield from loop.run_in_executor(None, file_resource.read)
        image_data = yield from loop.run_in_executor(None, io.BytesIO, file_data)
        if status:
            try:
                image_id = yield from bot._client.upload_image(image_data, filename=filename)
                yield from bot.coro_send_message(event.conv.id_, None, image_id=image_id)
                os.unlink(filepath)
                os.unlink(args_filepath)
            except Exception as e:
                os.unlink(filepath)
                os.unlink(args_filepath)
                logger.exception("upload failed: {}".format(url))
                logger.exception("exception: {}".format(e))
                yield from bot.coro_send_message(event.conv_id, "<i>error uploading screenshot</i>")
    else:
        if status:
            response_file = yield from _open_file(arguments['portalinfoResponse'], 'r')
            response = yield from readline(response_file)
            yield from bot.coro_send_message(event.conv.id_, response.replace("'", ""))
            os.unlink(filepath)
            os.unlink(args_filepath)
            os.unlink(arguments['portalinfoResponse'])

def setintel(bot, event, *args):
    """set url for current converation for the intel or iitc command.
    use /bot clearintel to clear the previous url before setting a new one."""
    
    url = bot.conversation_memory_get(event.conv_id, 'IntelURL')
    if url is None:
        bot.conversation_memory_set(event.conv_id, 'IntelURL', ''.join(args))
        html = "<i><b>{}</b> updated screenshot URL".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    else:
        bot.conversation_memory_set(event.conv_id, 'IntelURL', None)
        bot.conversation_memory_set(event.conv_id, 'IntelURL', ''.join(args))
        html = "<i><b>{}</b> updated screenshot URL".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

def portalpic(bot, event, *args):
    """get a screenshot of the portalInfo by URL."""

    arguments = {}

    if args:
        if len(args) > 1:
            url = ' '.join(str(i) for i in args)
        else:
            url = args[0]
        if '"' in url:
            url = url.replace('"', '')
    else:
        html = "<i><b>{}</b> No Arguments provided".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    if bot.config.exists(["intel_screenbot", "email"]):
        if bot.config.exists(["intel_screenbot", "password"]):
            email = bot.config.get_by_path(["intel_screenbot", "email"])
            password = bot.config.get_by_path(["intel_screenbot", "password"])
            arguments['email'] = email
            arguments['password'] = password
        else:
            html = "<i><b>{}</b> No Intel password has been added to config. Unable to authenticate".format(event.user.full_name)
            yield from bot.coro_send_message(event.conv, html)
    else:
        html = "<i><b>{}</b> No Intel Email/password has been added to config. Unable to authenticate".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    if url is None:
        html = "<i><b>{}</b> No Portal URL has been set for screenshots.".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)
    else:
        if re.match(r'(http(s)?:\/\/)', url):
            yield from bot.coro_send_message(event.conv_id, "<i>Portal Picture requested, please wait...</i>")
            filepath = tempfile.NamedTemporaryFile(suffix=".png", delete=False).name
            filename = filepath.split('/', filepath.count('/'))[-1]
            args_filepath = tempfile.NamedTemporaryFile(prefix="args_{}".format(event.conv_id), suffix=".json", delete=False).name

            arguments['url'] = url
            arguments['filepath'] = filepath
            arguments['screenshotfunction'] = "portalinfoScreen"

            with open(args_filepath, 'w') as out:
                out.write(json.dumps(arguments))

            try:
                loop = asyncio.get_event_loop()
                image_data = yield from _screencap(url, args_filepath, filepath, filename, bot, event, arguments)
            except Exception as e:
                yield from bot.coro_send_message(event.conv_id, "<i>error getting screenshot</i>")
                logger.exception("screencap failed".format(url))
                return
        else:
            html = "<i><b>{}</b> No URL found in Arguments".format(event.user.full_name)
            yield from bot.coro_send_message(event.conv, html)

def portalinfo(bot, event, *args):
    """get a of the portalInfo by URL."""

    arguments = {}

    if args:
        if len(args) > 1:
            url = ' '.join(str(i) for i in args)
        else:
            url = args[0]
        if '"' in url:
            url = url.replace('"', '')
    else:
        html = "<i><b>{}</b> No Arguments provided".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    if bot.config.exists(["intel_screenbot", "email"]):
        if bot.config.exists(["intel_screenbot", "password"]):
            email = bot.config.get_by_path(["intel_screenbot", "email"])
            password = bot.config.get_by_path(["intel_screenbot", "password"])
            arguments['email'] = email
            arguments['password'] = password
        else:
            html = "<i><b>{}</b> No Intel password has been added to config. Unable to authenticate".format(event.user.full_name)
            yield from bot.coro_send_message(event.conv, html)
    else:
        html = "<i><b>{}</b> No Intel Email/password has been added to config. Unable to authenticate".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    if url is None:
        html = "<i><b>{}</b> No Portal URL has been set for portal Info.".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)
    else:
        if re.match(r'(http(s)?:\/\/)', url):
            yield from bot.coro_send_message(event.conv_id, "<i>Portal Info requested, please wait...</i>")
            filepath = tempfile.NamedTemporaryFile(suffix=".png", delete=False).name
            portalinfoResponse = tempfile.NamedTemporaryFile(prefix="response_{}".format(event.conv_id), delete=False).name
            filename = filepath.split('/', filepath.count('/'))[-1]
            args_filepath = tempfile.NamedTemporaryFile(prefix="args_{}".format(event.conv_id), suffix=".json", delete=False).name

            arguments['url'] = url
            arguments['filepath'] = filepath
            arguments['screenshotfunction'] = "portalinfoText"
            arguments['portalinfoResponse'] = portalinfoResponse

            with open(args_filepath, 'w') as out:
                out.write(json.dumps(arguments))

            try:
                loop = asyncio.get_event_loop()
                image_data = yield from _screencap(url, args_filepath, filepath, filename, bot, event, arguments)
            except Exception as e:
                yield from bot.coro_send_message(event.conv_id, "<i>error getting infos</i>")
                logger.exception("getting infos failed".format(url))
                return
        else:
            html = "<i><b>{}</b> No URL found in Arguments".format(event.user.full_name)
            yield from bot.coro_send_message(event.conv, html)
            
def intel(bot, event, *args):
    """get a screenshot of a search term or intel URL or the default intel URL of the hangout."""

    arguments = {}

    if args:
        if len(args) > 1:
            url = ' '.join(str(i) for i in args)
        else:
            url = args[0]
        if '"' in url:
            url = url.replace('"', '')
    else:
        try:
            url = bot.conversation_memory_get(event.conv_id, 'IntelURL')
        except:
            url = 'https://www.ingress.com/intel'

    if bot.config.exists(["intel_screenbot", "email"]):
        if bot.config.exists(["intel_screenbot", "password"]):
            email = bot.config.get_by_path(["intel_screenbot", "email"])
            password = bot.config.get_by_path(["intel_screenbot", "password"])
            arguments['email'] = email
            arguments['password'] = password
        else:
            html = "<i><b>{}</b> No Intel password has been added to config. Unable to authenticate".format(event.user.full_name)
            yield from bot.coro_send_message(event.conv, html)
    else:
        html = "<i><b>{}</b> No Intel Email/password has been added to config. Unable to authenticate".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    if url is None:
        html = "<i><b>{}</b> No Intel URL or search term has been set for screenshots.".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    else:
        if re.match(r'(http(s)?:\/\/)', url):
            search = 'nix'
            zoomParameter = re.search(r"(?:&z=)", url, re.IGNORECASE)
            if zoomParameter:
                ZoomSearch = re.finditer(r"(?:&z=).*", url, flags=re.I)
                for matchNum, zoomlevel_raw in enumerate(ZoomSearch):
                    matchNum = matchNum + 1
                zoomlevel_clean = zoomlevel_raw.group()
                zoomlevel = zoomlevel_clean[3:][:2]
                if zoomlevel.isdigit():
                    yield from bot.coro_send_message(event.conv_id, "<i>intel map at zoom level "+ zoomlevel + " requested, please wait...</i>")
            else:
                yield from bot.coro_send_message(event.conv_id, "<i>intel map requested, please wait...</i>")
        else:
            search = url
            zoomParameter = re.search(r"(?<=z=)", url, re.IGNORECASE)
            if zoomParameter:
                ZoomSearch = re.finditer(r"(?<=z=)[^\s]+", url, flags=re.I)
                for matchNum, zoomlevel_raw in enumerate(ZoomSearch):
                    matchNum = matchNum + 1
                zoomlevel = zoomlevel_raw.group()
                search = search.replace("z={}".format(zoomlevel),"")
                if zoomlevel.isdigit():
                    yield from bot.coro_send_message(event.conv_id, "<i>searching " + search + " on intel map and screenshooting at zoom level "+ zoomlevel + " as requested, please wait...</i>")
                    arguments['zoomlevel'] = str(zoomlevel)
            else:
                yield from bot.coro_send_message(event.conv_id, "<i>searching " + search + " on intel map and screenshooting as requested, please wait...</i>")
            url = 'https://www.ingress.com/intel'

        filepath = tempfile.NamedTemporaryFile(suffix=".png", delete=False).name
        filename = filepath.split('/', filepath.count('/'))[-1]
        args_filepath = tempfile.NamedTemporaryFile(prefix="args_{}".format(event.conv_id), suffix=".json", delete=False).name

        arguments['search'] = search
        arguments['url'] = url
        arguments['filepath'] = filepath
        arguments['maptype'] = "intel"
        arguments['screenshotfunction'] = "map"

        with open(args_filepath, 'w') as out:
            out.write(json.dumps(arguments))
            
        try:
            loop = asyncio.get_event_loop()
            image_data = yield from _screencap(url, args_filepath, filepath, filename, bot, event, arguments)
        except Exception as e:
            yield from bot.coro_send_message(event.conv_id, "<i>error getting screenshot</i>")
            logger.exception("screencap failed".format(url))
            return


def iitc(bot, event, *args):
    """get a screenshot of a search term or intel URL or the default intel URL of the hangout."""

    arguments = {}

    if args:
        if len(args) > 1:
            url = ' '.join(str(i) for i in args)
        else:
            url = args[0]
        if '"' in url:
            url = url.replace('"', '')
    else:
        url = bot.conversation_memory_get(event.conv_id, 'IntelURL')

    if bot.config.exists(["intel_screenbot", "email"]):
        if bot.config.exists(["intel_screenbot", "password"]):
            email = bot.config.get_by_path(["intel_screenbot", "email"])
            password = bot.config.get_by_path(["intel_screenbot", "password"])
            arguments['email'] = email
            arguments['password'] = password
        else:
            html = "<i><b>{}</b> No Intel password has been added to config. Unable to authenticate".format(event.user.full_name)
            yield from bot.coro_send_message(event.conv, html)
    else:
        html = "<i><b>{}</b> No Intel Email/password has been added to config. Unable to authenticate".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    if url is None:
        html = "<i><b>{}</b> No Intel URL has been set for screenshots.".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

    else:
        if re.match(r'(http(s)?:\/\/)', url):
            search = 'nix'
            zoomParameter = re.search(r"(?:&z=)", url, re.IGNORECASE)
            if zoomParameter:
                ZoomSearch = re.finditer(r"(?:&z=).*", url, flags=re.I)
                for matchNum, zoomlevel_raw in enumerate(ZoomSearch):
                    matchNum = matchNum + 1
                zoomlevel_clean = zoomlevel_raw.group()
                zoomlevel = zoomlevel_clean[3:][:2]
                if zoomlevel.isdigit():
                    yield from bot.coro_send_message(event.conv_id, "<i>iitc map at zoom level "+ zoomlevel + " requested, please wait...</i>")
            else:
                yield from bot.coro_send_message(event.conv_id, "<i>iitc map requested, please wait...</i>")
        else:
            search = url
            zoomParameter = re.search(r"(?<=z=)", url, re.IGNORECASE)
            if zoomParameter:
                ZoomSearch = re.finditer(r"(?<=z=)[^\s]+", url, flags=re.I)
                for matchNum, zoomlevel_raw in enumerate(ZoomSearch):
                    matchNum = matchNum + 1
                zoomlevel = zoomlevel_raw.group()
                search = search.replace("z={}".format(zoomlevel),"")
                if zoomlevel.isdigit():
                    yield from bot.coro_send_message(event.conv_id, "<i>searching " + search + " on iitc map and screenshooting it at zoom level "+ zoomlevel + " as requested, please wait...</i>")
                    arguments['zoomlevel'] = str(zoomlevel)
            else:
                yield from bot.coro_send_message(event.conv_id, "<i>searching " + search + " on iitc map and and screenshooting it as requested, please wait...</i>")
            url = 'https://www.ingress.com/intel'

        filepath = tempfile.NamedTemporaryFile(suffix=".png", delete=False).name
        filename = filepath.split('/', filepath.count('/'))[-1]
        args_filepath = tempfile.NamedTemporaryFile(prefix="args_{}".format(event.conv_id), suffix=".json", delete=False).name
        logger.debug("temporary screenshot file: {}".format(filepath))
        logger.debug("temporary args file: {}".format(args_filepath))
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

        arguments['plugins'] = plugins
        arguments['search'] = search
        arguments['url'] = url
        arguments['filepath'] = filepath
        arguments['maptype'] = "iitc"
        arguments['screenshotfunction'] = "map"

        with open(args_filepath, 'w') as out:
            out.write(json.dumps(arguments))

        try:
            loop = asyncio.get_event_loop()
            image_data = yield from _screencap(url, args_filepath, filepath, filename, bot, event, arguments)
        except Exception as e:
            yield from bot.coro_send_message(event.conv_id, "<i>error getting screenshot</i>")
            logger.exception("screencap failed".format(url))
            return

def show_iitcplugins(bot, event, *args):
    """Shows all available iitc Plugins."""
    if bot.memory.exists(["iitc_plugins"]):
        plugin_names = []
        for plugin_objects in bot.memory.get_by_path(["iitc_plugins"]):
            for attribute, value in plugin_objects.items():
                if attribute == "name":
                    plugin_names.append(value)
        yield from bot.coro_send_to_user_and_conversation(event.user.id_.chat_id, event.conv_id, "<i><b>IITC Plugins:</b><br> {}</i>".format(', <br>'.join(str(i) for i in plugin_names)), _("<i><b>{}</b>, I've sent you the plugins ;)</i>").format(event.user.full_name))

def set_iitcplugins(bot, event, *args):
    """sets the activated iitc plugins for a hangout."""
    if not bot.conversation_memory_get(event.conv_id, 'iitc_plugins') is None:
        bot.conversation_memory_set(event.conv_id, 'iitc_plugins', None)
        bot.conversation_memory_set(event.conv_id, 'iitc_plugins', ', '.join(args))
        html = "<i><b>{}</b> updated plugins".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)
    else:
        bot.conversation_memory_set(event.conv_id, 'iitc_plugins', ', '.join(args))
        html = "<i><b>{}</b> updated plugins".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)

def active_iitcplugins(bot, event, *args):
    """shows the activated iitc plugins for a hangout."""
    if bot.conversation_memory_get(event.conv_id, 'iitc_plugins') is None:
        html = "<i><b>{}</b> no active IITC Plugins for this conversation".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)
    else:
        plugins = bot.conversation_memory_get(event.conv_id, 'iitc_plugins')
        html = "<i><b>{}</b> plugins for this conversation: {}<br />".format(event.user.full_name, plugins)
        yield from bot.coro_send_message(event.conv, html)
