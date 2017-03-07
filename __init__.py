from bs4 import BeautifulSoup
import requests
import json
import asyncio, io, logging, os, tempfile
import plugins
import re
from commands import command

logger = logging.getLogger(__name__)

class plugins(object):
    """Prepares plugins."""

    def _parse_onlineRepos(url, ext=''):
        """Downloads links to the iitcplugins."""
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

    def get(bot):
        """Get the iitcplugins."""
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

class Screenshots(object):
    """Handle screenshot requests"""

    def _open_file(this, name, otype):
        return open(name, otype)

    def readline(this, f):
        while True:
            data = f.readline()
            if data:
                return data

    def _get_lines(this, shell_command):
        p = yield from asyncio.create_subprocess_shell(shell_command)
        output = yield from asyncio.wait_for(p.wait(), 240.0)
        return p.returncode, output, True

    def run(this):
        """Run screenshot."""
        os.chmod(this.filepath, 0o666)
        loop = asyncio.get_event_loop()

        if (this.arguments['screenshotfunction'] == 'portalinfoText'):
            command = 'phantomjs hangupsbot/plugins/intel_screenbot/portalinfo.js "' + this.args_filepath + '"'
            task = this._get_lines(command)
            task = asyncio.wait_for(task, 420.0)
            exitcode, output, status = yield from task
            if status:
                response_file = yield from this._open_file(this.arguments['portalinfoResponse'], 'r')
                response = yield from readline(response_file)
                yield from this.bot.coro_send_message(this.event.conv.id_, response.replace("'", ""))
                os.unlink(this.filepath)
                os.unlink(this.args_filepath)
                os.unlink(this.arguments['portalinfoResponse'])
                return response

        if this.arguments['screenshotfunction'] == 'portalinfoScreen':
            command = 'phantomjs hangupsbot/plugins/intel_screenbot/screencap.js "' + this.args_filepath + '"'
            task = this._get_lines(command)
            task = asyncio.wait_for(task, 420.0)
            exitcode, output, status = yield from task
            if status:
                try:
                    file_resource = yield from this._open_file(this.filepath, 'rb')
                    file_data = yield from loop.run_in_executor(None, file_resource.read)
                    image_data = yield from loop.run_in_executor(None, io.BytesIO, file_data)
                    image_id = yield from this.bot._client.upload_image(image_data, filename=this.filename)
                    yield from this.bot.coro_send_message(this.event.conv.id_, None, image_id=image_id)
                    os.unlink(this.filepath)
                    os.unlink(this.args_filepath)
                    return image_data
                except Exception as e:
                    os.unlink(this.filepath)
                    os.unlink(this.args_filepath)
                    logger.exception("upload failed: {}".format(this.url))
                    logger.exception("exception: {}".format(e))
                    yield from this.bot.coro_send_message(this.event.conv_id, "<i>error uploading screenshot</i>")

        if this.arguments['screenshotfunction'] == 'map':
            command = 'phantomjs hangupsbot/plugins/intel_screenbot/map.js "' + this.args_filepath + '"'
            task = this._get_lines(command)
            task = asyncio.wait_for(task, 420.0)
            exitcode, output, status = yield from task
            if status:
                try:
                    file_resource = yield from this._open_file(this.filepath, 'rb')
                    file_data = yield from loop.run_in_executor(None, file_resource.read)
                    image_data = yield from loop.run_in_executor(None, io.BytesIO, file_data)
                    image_id = yield from this.bot._client.upload_image(image_data, filename=this.filename)
                    yield from bot.coro_send_message(event.conv.id_, None, image_id=image_id)
                    os.unlink(this.filepath)
                    os.unlink(this.args_filepath)
                    return image_data
                except Exception as e:
                    os.unlink(filepath)
                    os.unlink(args_filepath)
                    logger.exception("upload failed: {}".format(this.url))
                    logger.exception("exception: {}".format(e))
                    yield from this.bot.coro_send_message(this.event.conv_id, "<i>error uploading screenshot</i>")

@command.register(admin=True)
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
