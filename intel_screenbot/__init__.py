import asyncio, io, logging, os, re, time, tempfile
import subprocess
import plugins
import re


logger = logging.getLogger(__name__)


def _initialise(bot):
    plugins.register_user_command(["intel"])
    plugins.register_admin_command(["setintel", "clearintel"])

@asyncio.coroutine
def _open_file(name):
    logger.debug("opening screenshot file: {}".format(name))
    return open(name, 'rb')


@asyncio.coroutine
def _screencap(url, filename, SACSID, CSRF, search):
    logger.info("screencapping {} and saving as {}".format(url, filename))
    #os.path.realpath(__file__)
    if search == False:
        command = "phantomjs hangupsbot/plugins/intel_screenbot/screencap.js '" + SACSID + "' '" + CSRF + "' '" + url + "' '" +  filename + "'"
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE)
    else:
        command = "phantomjs hangupsbot/plugins/intel_screenbot/screencap.js '" + SACSID + "' '" + CSRF + "' '" + url + "' '" +  filename + "' '" + search + "'"
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE)

    # make sure phantomjs has time to download/process the page
    # but if we get nothing after 30 sec, just move on
    try:
        output, errors = process.communicate(timeout=30)
    except Exception as e:
        logger.debug("Exception: {}".format(e))
        process.kill()
    yield from asyncio.sleep(5)
    loop = asyncio.get_event_loop()
    # read the resulting file into a byte array
    file_resource = yield from _open_file(filename)
    file_data = yield from loop.run_in_executor(None, file_resource.read)
    image_data = yield from loop.run_in_executor(None, io.BytesIO, file_data)
    # yield from loop.run_in_executor(None, os.remove, filename)

    return image_data


def setintel(bot, event, *args):
    """set url for current converation for the screenshot command. 
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
    """clear url for current converation for the screenshot command. 
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
    """get a screenshot of a user provided URL or the default URL of the hangout. 
    """
                                    
    if args:
        if len(args) > 1:
            url = ' '.join(str(i) for i in args)
        else:
            url = args[0]
    else:
        url = bot.conversation_memory_get(event.conv_id, 'IntelURL')
                                    
    if bot.config.exists(["intel_screenbot", "SACSID"]):
        SACSID = bot.config.get_by_path(["intel_screenbot", "SACSID"])
    else:
        html = "<i><b>{}</b> No Intel SACSID Cookie has been added to config. Unable to authenticate".format(event.user.full_name)
        yield from bot.coro_send_message(event.conv, html)
    if bot.config.exists(["intel_screenbot", "CSRF"]):
        CSRF = bot.config.get_by_path(["intel_screenbot", "CSRF"])
    else:
        html = "<i><b>{}</b> No Intel CSRF Cookie has been added to config. Unable to authenticate".format(event.user.full_name)
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
        logger.debug("temporary screenshot file: {}".format(filepath))

        try:
            loop = asyncio.get_event_loop()
            image_data = yield from _screencap(url, filepath, SACSID, CSRF, search)
        except Exception as e:
            yield from bot.coro_send_message(event.conv_id, "<i>error getting screenshot</i>")
            logger.exception("screencap failed".format(url))
            return
            
        try:
            image_id = yield from bot._client.upload_image(image_data, filename=filename)
            yield from bot._client.sendchatmessage(event.conv.id_, None, image_id=image_id)
        except Exception as e:
            yield from bot.coro_send_message(event.conv_id, "<i>error uploading screenshot</i>")
            logger.exception("upload failed".format(url))
