import {coordsToId} from '../utility-functions'

const LINE_ICON = 'icon LINE_OPTION line_option' // TODO NI/SI?
const EXIT_ICON = 'icon LINE_EXIT line_exit'

let dialogList = {}

export function addDialogToDialogList(npcId, npcNick, dialog)
{
    dialogList[npcId] = {
        npcNick: npcNick,
        dialog: dialog
    }
}

export function openDialog(npcId, index)
{
    const npcNick = dialogList[npcId].npcNick
    const dialog = dialogList[npcId].dialog
    const npcMessage = parsePlaceholders(dialog[index][0])
    const playerReplies = parseReplies(dialog[index], npcId)

    displayDialog(npcId, npcNick, npcMessage, playerReplies)

    if (INTERFACE === 'NI')
    {
        Engine.lock.add('nerthus-dialog')
    }
    else
    {
        g.lock.add('nerthus-dialog')

        map.resizeView(512, 192)
    }
}

function parseReplies(dialogInstance, npcId)
{
    const replies = []

    for (let i = 1; i < dialogInstance.length; i++)
        replies.push(parseReply(dialogInstance[i], npcId))
    return replies

}


function parseReply(replyRow, npcId)
{
    const reply = parseReplyRow(replyRow)
    if (reply.to === 'END')
    {
        reply.click = closeDialog
        reply.icon = EXIT_ICON
    }
    else if (reply.to)
    {
        reply.click = function ()
        {
            removeScroll()
            openDialog(npcId, reply.to)
            addScroll()
            $('#dlgin').scrollTop(0)
        }
        reply.icon = LINE_ICON
    }
    return reply
}

function parseReplyRow(reply)
{
    const replyArr = reply.split('->')
    return {text: parsePlaceholders(replyArr[0]), to: replyArr[1]}
}

function parsePlaceholders(text)
{
    if (INTERFACE === 'NI')
        return text.replace('#NAME', Engine.hero.d.nick)
    else
        return text.replace('#NAME', hero.nick)
}

function addScroll()
{
    clearInterval(g.talk.scrollCheckInterval)
    const $dlgin = $('#dlgin')
    g.talk.scrollCheckInterval = setInterval(function ()
    {
        if ($('#talkscroll').length) return
        if ($dlgin.height() < ($('#dlgin .message').innerHeight() + $('#dlgin .replies').innerHeight()))
        {
            $('#dlgin').css({'margin-right': 20})
            addScrollbar('dlgin', 490, 'talkscroll')
        }
    }, 100)
    if ($dlgin.height() < ($('#dlgin .message').innerHeight() + $('#dlgin .replies').innerHeight()))
    {
        $dlgin.css({'margin-right': 20})
        addScrollbar('dlgin', 490, 'talkscroll')
    }
}

function removeScroll()
{
    removeScrollbar('dlgin', 'talkscroll')
}

function parseInnerDialog(npcMessage, playerReplies)
{
    let innerDial = '<ul class="answers">'
    const repliesLen = playerReplies.length
    for (let i = 0; i < repliesLen; i++)
    {
        let iconClass = LINE_ICON
        if (playerReplies[i].to === 'END') iconClass = EXIT_ICON

        innerDial +=
            '<li class="answer dialogue-window-answer ' + iconClass + '">' +
            '<div class="' + iconClass + '"></div>' +
            '<span class="answer-text">' + (i + 1) + '. ' + playerReplies[i].text + '</span>' +
            '</li>'
    }
    innerDial += '</ul>'
    return innerDial
}


function addEventToAnswer(answer, $dialWin, replies, index, id)
{
    if (replies[index])
        $(answer).click(function ()
        {
            if (replies[index].to === 'END')
                closeDialog()
            else
                openDialog(id, replies[index].to)
            $('.scroll-wrapper', $dialWin).trigger('update')
        })
}

function displayDialog(npcId, npcNick, npcMessage, playerReplies)//(message, replies, npc)
{
    if (INTERFACE === 'NI')
    {
        // create fake dialog that we can then modify
        Engine.communication.dispatcher.on_d(
            ['0', npcNick, '-1', '1', npcMessage, '', '2', 'Option', '-1']
        )

        const innerDial = parseInnerDialog(npcMessage, playerReplies)
        const $dialWin = $('.dialogue-window')
        $('.npc-message', $dialWin).html(npcMessage)
        $('.content .inner.scroll-wrapper .scroll-pane', $dialWin).html(innerDial)

        $('.content .inner.scroll-wrapper .scroll-pane .answers .answer', $dialWin)
            .each(function (index) {addEventToAnswer(this, $dialWin, playerReplies, index, npcId)})
    }
    else
    {
        $('#dlgin .message').empty().append('<h4><b>' + npcNick + '</b></h4>' + npcMessage)
        const $replies = $('#dlgin .replies').empty()
        $replies.append(...playerReplies.map(composeReply))
        addScroll()
        $('#dialog').show()
    }
}

function closeDialog()
{
    if (INTERFACE === 'NI')
    {
        //$('.dialogue-window').removeClass('is-open')
        Engine.dialogue.finish()
        Engine.lock.remove('nerthus-dialog')
    }
    else
    {
        $('#dialog').hide()
        g.lock.remove('nerthus-dialog')
        map.resizeView()
        removeScroll()
    }
}

function composeReply(reply)
{
    return $('<li>')
        .addClass(reply.icon)
        .append('<div class="' + reply.icon + '">')
        .append(reply.text)
        .click(reply.click)
}

function checkDialog(command)
{
    const match = command.match(/^talk.*id=(\d+)/)
    if (match)
    {
        const id = match[1]
        if (id >= coordsToId(0, 0) &&
            dialogList[id] !== undefined)
        {
            return id
        }
    }
    return false
}

export function initNpcDialog()
{
    if (INTERFACE === 'NI')
    {
        const __g = _g
        window._g = function (task, callback, payload)
        {
            const id = checkDialog(task)
            if (id) return openDialog(id, 0)
            __g(task, callback, payload)
        }
    }
}
