var jBlock

;(function () {

jBlock =
{
    /*
     * public
     */
    json2html: function (data)
    {
        var expandedData = this._apply(data)

        function htmlForCtx (ctx)
        {
            if (Array.isArray(ctx))
            {
                var content = ''

                for (var i = 0, ii = ctx.length; i < ii; i++)
                    content += htmlForCtx(ctx[i])

                return content
            }
            else if (typeof ctx === 'string')
            {
                return ctx.replace(/\s+/,'') !== '' ? ctx : ''
            }
            else if (typeof ctx !== 'object')
            {
                return ''
            }

            var tag = ctx.tag || 'div',
                name = ctx._block || ctx._layout || ctx._parentBlock._block + '__' + ctx._elem,
                classes = name,
                content = ctx._content ? htmlForCtx(ctx._content) : '',
                attr = '',
                css = ''

            for (modName in ctx._mod)
            {
                var modVal = ctx._mod[modName]

                if (typeof modVal !== 'undefined' && modVal !== '' && modVal !== false)
                    classes += ' ' + name + '_' + modName + (modVal === true ? '' : '_' + modVal)
            }

            for (var i = 0, ii = ctx.mix.length; i < ii; i++)
                classes += ' ' + ctx.mix[i]

            classes = ' class="'+ classes +'"'

            for (attrName in ctx.attr)
            {
                var attrVal = ctx.attr[attrName]

                if (typeof attrVal !== 'undefined' && attrVal !== '')
                    attr += ' '+ attrName +'="'+ attrVal +'"'
            }

            for (property in ctx.css)
                if (ctx.css[property])
                {
                    if (property === 'background-image' && ctx.css[property].substr(0,4) !== 'url(')
                        ctx.css[property] = 'url(' + ctx.css[property] + ')'

                    css += property + ':'+ ctx.css[property]

                    if (typeof ctx.css[property] === 'number' && cssPxProp[property])
                        css += 'px'

                    css += ';'
                }

            if (ctx.style)
                css += ctx.style

            if (css)
                css = ' style="'+ css +'"'

            return '<'+ tag
                        + classes
                        + attr
                        + css
                        + (ctx.js ? ' onclick="return {\''+ name +'\':{}}"' : '')
                        + (singleTag[tag] ? '/>' : '>' + content + '</'+ tag +'>')
        }

        return htmlForCtx(expandedData)
    },

    json2xml: function (data, isHtml)
    {
        function xmlForCtx (ctx, tab)
        {
            if (!tab) tab = ''

            if (Array.isArray(ctx))
            {
                var content = ''

                for (var i = 0, ii = ctx.length; i < ii; i++)
                    content += xmlForCtx(ctx[i], tab)

                return content
            }
            else if (typeof ctx === 'string')
            {
                return ctx.replace(/\s+/,'') !== '' ? ctx : ''
            }
            else if (typeof ctx !== 'object')
            {
                return ''
            }

            var name,
                mods = '',
                modsBoolean = '',
                params = '',
                content

            for (param in ctx)
            {
                if (param.substr(0,1) === '_')
                    continue

                var pref = param.substr(0,2)

                if (pref === 'b_' || pref === 'e_' || pref === 'l_')
                {
                    name = param
                }
                else if (pref == 'm_')
                {
                    if (ctx[param] === false)
                        continue
                    else if (ctx[param] === true)
                        modsBoolean += ' '+ param
                    else
                        mods += ' m:'+ param.substr(2) +'="'+ ctx[param] +'"'
                }
                else if (param === 'content')
                {
                    content = ctx[param]
                }
                else if (typeof ctx[param] === 'string')
                {
                    params += ' '+ param +'="'+ ctx[param] +'"'
                }
            }

            if (!content)
                content = ctx[name]

            var text = typeof content === 'string' || Array.isArray(content) && typeof content[0] === 'string'

            name = isHtml ? name.substr(2) : name.replace('_', ':')

            if (modsBoolean)
                modsBoolean = ' m="'+ modsBoolean.substr(1) +'"'

            return tab + '<'+ name
                        + mods
                        + modsBoolean
                        + params
                        + (isHtml && singleTag[name]
                            ? '/>'
                            : '>' + (text ? '' : '\n') + xmlForCtx(content, tab + '    ') + (text ? '' : tab) + '</'+ name +'>\n'
                        )
        }

        return xmlForCtx(data)
    },

    dom2json: function (node)
    {
        if (typeof node.length !== 'undefined')
        {
            var objects = []

            for (var i = 0, ii = node.length; i < ii; i++)
            {
                if (node[i].nodeType == Node.ELEMENT_NODE)
                    objects.push(this.dom2json(node[i]))
                else
                if (node[i].nodeType == Node.TEXT_NODE)
                    objects.push(node[i].textContent)
            }

            return objects
        }

        var obj = {},
            name = node.localName.replace(':', '_')

        if (name.substr(1,1) !== '_')
            name = 'e_' + name

        if (node.attributes.length)
            for (var i = 0, ii = node.attributes.length; i < ii; i++)
            {
                var attr = node.attributes[i]

                if (attr.localName === 'm')
                {
                    var mods = attr.value.split(' ')

                    for (var j = 0, jj = mods.length; j < jj; j++)
                        obj['m_' + mods[j]] = true
                }
                else
                {
                    obj[attr.localName.replace(':', '_')] = attr.value
                }
            }

        obj[name] = node.childNodes
                ? this.dom2json(node.childNodes)
                : ''

        return obj
    },

    match: function ()
    {
        var template,
            domDecl

        while (arguments.length && typeof arguments[arguments.length-1] !== 'string')
        {
            var arg = Array.prototype.pop.call(arguments)

            if (typeof arg === 'function')
                template = arg
            else
                domDecl = arg
        }

        for (var i = 0, ii = arguments.length; i < ii; i++)
        {
            if (template)
                this._templates[arguments[i]] = template

            if (domDecl && arguments[i].indexOf('__') < 0)
            {
                var bem = arguments[i].split('_'),
                    selector = {
                        name: bem[0],
                        modName: bem[1],
                        modVal: bem[2]
                    }

                if (domDecl.init)
                {
                    if (!domDecl.onSetMod)
                        domDecl.onSetMod = {}

                    domDecl.onSetMod.js = {inited:domDecl.init}
                }

                var domDeclCopy = {}
                for (prop in domDecl)
                    domDeclCopy[prop] = domDecl[prop]

                this._domDecl.push([selector, domDeclCopy])
            }
        }

        return this
    },

    onLoad: function (fn)
    {
        this._onLoad.push(fn)
        return this
    },

    import: {}, //custom data

    domInit: function (domElem)
    {
        if (this._domDecl)
            for (var i = 0, ii = this._domDecl.length; i < ii; i++)
                BEM.DOM.decl(this._domDecl[i][0], this._domDecl[i][1])

        this._domDecl = null

        if (typeof BEM !== 'undefined')
            BEM.DOM.init(domElem)
    },

    /*
     * private
     */
    _templates: {}, // templates from match() method stored here
    _domDecl: [],   // i-bem declarations
    _onLoad: [],    // handlers from onLoad() method

    /*
     * Traverse data and return expanded version of it
     * 1. Walk though data until object appeared
     * 2. Define and convert ctx params
     * 3. Apply templates for ctx
     */
    _apply: function (data, parentBlock, parentCtx, ctxIndex)
    {
        var ctx = data

        while (ctx)
        {
            if (Array.isArray(ctx))
            {
                for (var i = 0, ii = ctx.length; i < ii; i++)
                    this._apply(ctx[i], parentBlock, ctx, i)

                ctx = false
            }
            else if (typeof ctx === 'object')
            {
                if (ctx._expanded)
                    return

                this._public2private(ctx)

                if (parentCtx)
                {
                    ctx._parentCtx = parentCtx
                    if (Array.isArray(parentCtx))
                        ctx._ctxIndex = ctxIndex
                }

                if (ctx._elem && !ctx._parentBlock)
                    ctx._parentBlock = parentBlock

                if (ctx._block)
                    parentBlock = ctx

                var expandedCtx = this._expand(ctx)

                if (!parentCtx && ctx !== expandedCtx) // if root was replaced
                    data = expandedCtx                 // set new root

                parentCtx = ctx
                ctx = ctx._content || false
            }
            else
            {
                ctx = false
            }
        }

        return data
    },

    /*
     * Expand ctx with templates by selectors matching
     */
    _expand: function (ctx)
    {
        ctx._expanded = true
        jBlockNode.setCtx(ctx)

        var selectors = this._getCtxSelectors(ctx),
            template,
            prevSelector,
            prevPriority

        for (var i = 0, ii = selectors.length; i < ii; i++)
        {
            var selector = selectors[i],
                priority = selector.split('_').length

            if (!template || (priority >= prevPriority && this._templates[selector]))
            {
                template = this._templates[selector]
                prevSelector = selector
                prevPriority = priority
            }
        }

        if (!template && ctx._elem)
            template = this._templates[ctx._parentBlock._block +'__*']

        if (template)
        {
            template.call(jBlockNode)
            jBlockNode.onComplete()
            ctx = jBlockNode.ctx()
        }

        return ctx
    },

    _getCtxSelectors: function (ctx)
    {
        if (ctx._selectors)
            return ctx._selectors

        var selectors = []

        function pushModSelectors (name)
        {
            if (!ctx._mod) return

            for (i in ctx._mod)
                if (ctx._mod[i] !== false)
                    selectors.push(
                        name + '_' + i + (ctx._mod[i] === true ? '' : '_' + ctx._mod[i])
                    )
        }

        if (ctx._block)
        {
            selectors.push(ctx._block)
            pushModSelectors(ctx._block)
        }
        else if (ctx._layout)
        {
            selectors.push(ctx._layout)
            pushModSelectors(ctx._layout)
        }
        else
        {
            var parentBlockSelectors =  ctx._parentBlock._selectors

            for (var i = 0, l = parentBlockSelectors.length; i < l; i++)
            {
                var elemName = parentBlockSelectors[i] + '__' + ctx._elem
                selectors.push(elemName)
                pushModSelectors(elemName)
            }
        }

        ctx._selectors = selectors
        return selectors
    },

    /*
     * Ctx params convertion: human to machine format
     */
    _public2private: function (ctx)
    {
        /* Ctx params
         *
         * for human:
         *      b_blockName :String - block name
         *      e_elemName :String - element name
         *      m_modName :String|Boolean - modifier name
         *      content :String|Array|Object - node content
         *      tag :String - html tag name
         *      attr :Object - html attributes
         *      mix :String|Array - extra html classes
         *      css :Object - css properties for html instance
         *      js :Boolean - flag if block is an active (for i-jBlock.js init)
         *      block :Boolean - pointer to block (only for elem)
         *
         * for machine:
         *      _block :String - block name (if node is block)
         *      _elem :String - element name (if node is element)
         *      _mod :Object - modifiers list
         *      _content :String|Object|Array - node content
         *      _newContent :String|Object|Array - content from ctx.append() instead of _content
         *      _parentBlock :Object - pointer to block (if node is element)
         *      _parentCtx :Object - pointer to parent context in data
         *      _ctxIndex :Object - index in array of siblings if parentCtx is array
         *      _selectors :Array - selectors list for node
         *      _copy :Object - cached copy() results
         *      _converted :Boolean - if node was coverted to machine format
         *      _expanded :Boolean - if node was expanded
         */

        if (ctx._converted)
            return ctx

        ctx._converted = true
        ctx._mod = {}
        ctx._copy = {}

        if (ctx.block)
            ctx._parentBlock = ctx.block

        if (!ctx.attr)
            ctx.attr = {}

        if (!ctx.css)
            ctx.css = {}

        if (!ctx.mix)
            ctx.mix = []

        if (!Array.isArray(ctx.mix))
            ctx.mix = [ctx.mix]

        for (param in ctx)
        {
            var pref = param.substr(0,2),
                name = param.substr(2)

            if (pref === 'b_' || pref === 'e_' || pref === 'l_')
            {
                ctx[pref === 'b_' ? '_block' : pref === 'e_' ? '_elem' : '_layout'] = name

                if (ctx.content)
                {
                    ctx._content =  ctx.content
                    ctx.content = ''
                }
                else
                {
                    ctx._content = ctx[param]
                    ctx[param] = ''
                }
            }
            else if (pref == 'm_')
            {
                ctx._mod[name] = ctx[param]
            }
        }

        var content = []

        if (Array.isArray(ctx._content))
            ctx._content = content.concat.apply(content, ctx._content) // flatten
        else if (ctx._content !== '' && typeof ctx._content !== 'undefined')
            ctx._content = [ctx._content]

        return ctx
    },

    /*
     * Find b:* and l:* nodes and treat it like XML for blocks
     */
    _onDomReady: function ()
    {
        var elems = document.getElementsByTagName('*'),
            blocks = []

        for (var i = 0, ii = elems.length; i < ii; i++)
        {
            var pref = elems[i].localName.substr(0,2)

            if (pref == 'b:' || pref == 'l:')
                blocks.push(elems[i])
        }

        for (var i = 0, ii = blocks.length; i < ii; i++)
        {
            var block = blocks[i]

            if (!document.contains(block))
                continue

            var json = jBlock.dom2json(block),
                html = jBlock.json2html(json),
                domElem = document.createElement('html')

            domElem.innerHTML = html

            var body = domElem.childNodes[1]

            if (body.className) // new body starts new story
                document
                    .getElementsByTagName('html')[0]
                    .replaceChild(body, document.body)
            else
                block
                    .parentNode
                    .replaceChild(body.childNodes[0], block)
        }

        for (var i = 0, ii = this._onLoad.length; i < ii; i++)
            this._onLoad[i]()

        this.domInit()
    }
}

/*
 * Ctx methods, using inside match templates
 */
var jBlockNode =
{
    _ctx: null,

    setCtx: function (ctx)
    {
        this._ctx = ctx

        return this
    },

    ctx: function ()
    {
        return this._ctx
    },
    js: function ()
    {
        this._ctx.js = true
        return this
    },
    html: function ()
    {
        this._ctx.html = true
        return this
    },
    tag: function (name)
    {
        this._ctx.tag = name
        return this
    },
    mix: function ()
    {
        for (var i = 0, ii = arguments.length; i < ii; i++)
            this._ctx.mix.push(arguments[i])

        return this
    },
    index: function () {
        return this._ctx._ctxIndex || 0
    },
    defMod: function (defaultMod)
    {
        var actualMod = this._ctx._mod

        this._ctx._mod = {}

        for (name in defaultMod)
            this._ctx._mod[name] = typeof actualMod[name] !== 'undefined' && actualMod[name] !== ''
                ? actualMod[name]
                : defaultMod[name]

        return this
    },
    setOrGet: function (param, nameOrObj, value)
    {
        var target = param ? this._ctx[param] : this._ctx

        if (typeof nameOrObj === 'object')
        {
            for (name in nameOrObj)
                target[name] = nameOrObj[name]
        }
        else if (typeof value !== 'undefined')
        {
            target[nameOrObj] = value
        }
        else
        {
            return target[nameOrObj]
        }

        return this
    },
    mod: function (nameOrObj, value)    {return this.setOrGet('_mod', nameOrObj, value)},
    attr: function (nameOrObj, value)   {return this.setOrGet('attr', nameOrObj, value)},
    css: function (nameOrObj, value)    {return this.setOrGet('css', nameOrObj, value)},
    param: function (nameOrObj, value)  {return this.setOrGet(null, nameOrObj, value)},
    selector: function ()
    {
        return this._ctx._selectors[0]
    },
    name: function ()
    {
        return this._ctx._block || this._ctx._elem
    },
    blockMod: function (name)
    {
        return this._ctx._parentBlock ? this._ctx._parentBlock._mod[name] : ''
    },
    blockParam: function (name)
    {
        return this._ctx._parentBlock ? this._ctx._parentBlock[name] : ''
    },
    append: function ()
    {
        if (!this._ctx._newContent)
            this._ctx._newContent = []

        for (var i = 0, ii = arguments.length; i < ii; i++)
        {
            var content = arguments[i]

            if (content)
            {
                if (Array.isArray(content))
                    for (var j = 0, jj = content.length; j < jj; j++)
                        this._ctx._newContent.push(content[j])
                else
                    this._ctx._newContent.push(content)
            }
        }

        return this
    },
    replaceWith: function (newContent)
    {
        this.onComplete()

        var parentCtx = this._ctx._parentCtx,
            ctxIndex = this._ctx._ctxIndex,
            parentBlock = this._ctx._parentBlock || this._ctx

        if (Array.isArray(this._ctx._parentCtx))
            this._ctx._parentCtx[this._ctx._ctxIndex] = newContent
        else if (this._ctx._parentCtx)
            this._ctx._parentCtx._content = newContent
        else
            this._ctx = newContent

        var currentCtx = this._ctx
        jBlock._apply(newContent, parentBlock, parentCtx, ctxIndex)
        this._ctx = currentCtx
    },
    copy: function ()
    {
        if (!arguments.length)
            return Array.isArray(this._ctx._content)
                ? this._ctx._content
                : typeof this._ctx._content !== 'undefined' && this._ctx._content !== ''
                    ? [this._ctx._content]
                    : []

        var selectors = Array.prototype.join.call(arguments, ',')

        if (this._ctx._copy[selectors])
            return this._ctx._copy[selectors]

        var result = []

        for (var i = 0, ii = arguments.length; i < ii; i++)
        {
            var selector = arguments[i],
                not = selector.substr(0,1) === '!'

            if (not)
                selector = selector.substr(1)

            for (var j = 0, jj = this._ctx._content.length; j < jj; j++)
            {
                var child = this._ctx._content[j]

                if (typeof child === 'string')
                    continue

                if (typeof child[selector] !== 'undefined' && !not ||
                    typeof child[selector] === 'undefined' && not
                )
                    result.push(child)
            }
        }

        this._ctx._copy[selectors] = result
        return result
    },
    text: function ()
    {
        var content = this.copy.apply(this, arguments)[0],
            result = ''

        if (typeof content === 'undefined')
            return ''
        else if (typeof content === 'string')
            result = content
        else if (arguments.length)
            for (var i = 0, ii = arguments.length; i < ii; i++)
            {
                if (typeof content[arguments[i]] === 'undefined')
                    continue

                var ci = content[arguments[i]]

                if (Array.isArray(ci))
                    ci = ci[0]

                if (typeof ci === 'string')
                {
                    result = ci
                    break
                }
            }

        return result.replace(/^\s+|\s+$/g, '')
    },
    escapeHtml: function ()
    {
        var content = this._ctx._newContent || this._ctx._content

        for (var i = 0, ii = content.length; i < ii; i++)
            if (typeof content[i] === 'string')
                content[i] = content[i].replace(/</g, '&lt;')

        this._ctx._newContent = content

        return this
    },
    has: function ()
    {
        return this.copy.apply(this, arguments).length > 0
    },
    onComplete: function ()
    {
        if (this._ctx._newContent)
        {
            this._ctx._content = this._ctx._newContent
            this._ctx._newContent = undefined
        }

        if (this._ctx.js)
            this._ctx.mix.push('i-bem')
    }
}

var singleTag = {
    area:1,
    base:1,
    br:1,
    col:1,
    command:1,
    embed:1,
    hr:1,
    img:1,
    input:1,
    keygen:1,
    link:1,
    meta:1,
    param:1,
    source:1,
    wbr:1
}

var cssPxProp = {
    height:1,
    width:1,
    left:1,
    right:1,
    bottom:1,
    top:1,
    'line-height':1,
    'font-size':1
}

document.addEventListener('DOMContentLoaded', function ()
{
    jBlock._onDomReady()
})

})();

if (typeof module !== 'undefined')
    module.exports = jBlock;
