jBlock
======

Процессор для преобразования BEM-ориентированного JSON или XML в HTML. Умеет работать на клиенте, разворачивая декларации блоков внутри документа в HTML.

## Hello world

Перед подробным описанием сразу простой пример:

Содержимое index.html:
```html
<script src="jblock.js"></script>
<script src="foo.jblock.js"></script>
<b:foo/>
```

Содержимое foo.jblock.js:
```javascript
jBlock.match('foo', function ()
{
    this.tag('h1')
        .append({
            e_wrap: 'Hello, world'
        })
})
```

Результат после загрузки страницы:
```html
<script src="jblock.js"></script>
<script src="foo.jblock.js"></script>
<h1 class="foo"><div class="foo__wrap">Hello, world</div></h1>
```

## Как это работает

После загрузки документа ищутся узлы с префиксом «b:», конвертируются в JSON, который потом изменяется и дополнятеся шаблонами, а конечный JSON преобразуется обратно в HTML.

## BEM-ориентированный JSON
Все ребята знают или давно догадываются, что интерфейс семантически можно поделить на блоки, внутри которых могут  находиться зависимые элементы и другие независимые блоки; вдобавок, у блоков и элементов бывают модификаторы, которые меняют их поведение, внешний вид и т.д.

jBlock умеет переваривать как HTML, так и JSON. Но, очевидно, что основным форматом все-таки является JSON, с него
и начнем:
```javascript
{
    b_button: {e_label:'Найти'}
    m_size:'L'
}
```
Смысл префиксов полей `b_`, `e_`, `m_` — это имя блока, элемента и модификатора соответственно. Внутри поля с префиксом `b_` или `e_` расположены дочерние элементы, которые в свою очередь могут быть как блоками и элементами (в том числе, их массивами), так и простым текстом.

Для ситуаций, когда у блока объемное содержимое, а имя блока не хотелось бы визуально отделять от прочих деклараций (модификаторы, миксы и пр.), предусмотрен параметр `content`:
```javascript
{
    b_button:'', m_size:'L',
    content:[
        {e_label:'Найти'},
        ...
    ]
}
```

Полный список стандартных параметров:
```javascript
{
    b_blockName: Object | Array | String, //имя блока
    e_elemName: Object | Array | String, //либо имя элемента (не встречаются вместе)
    m_modName: String | Boolean, //модификатор

    content: Object | Array | String, //дублирующее поле содержимого
    tag: String, //имя тега
    attr: Object, //атрибуты, которые будут скопированы в html-узел
    mix: Array | String, //классы, которые будут подмешаны к классам блока
    css: Object, //список CSS-свойств html-узла
    js: Boolean, //флаг активного блока (нужно для фреймворка i-bem.js)
    block: Ctx, //явное указание блока, к которому принадлежит элемент (см. this.ctx())
}
```

JSON описанного формата преобразуется в HTML методом `jBlock.json2html(<JSON>):String`.

## BEM-ориентированный HTML
На практике бывает удобно работать напрямую с HTML, если сложность проекта еще не зашкаливает, или стоит задача быстро собрать прототип интерфейса. Если подключить jblock.js к html-документу, начнет происходить следующая магия: узлы с неймспейсом `b:` превратятся в развернутые html-блоки (к ним применится метод `jBlock.json2html`).

В целом BEM-ориентированный HTML во-многом дублирует свойства описанного выше JSON:
```xml
<b:block m:mod="value" tag="span" mix="block2 block3__elem" param="value">
    <elem>Содержимое</elem>
</b:block>
```

равно

```js
{
    b_block:{e_elem:'Содержимое'},
    m_mod:'value',
    tag:'span',
    mix:['block2', 'block3__elem'],
    param:'value'
}
```

Исходное содержимое:
```html
<html>
    <head>
        <meta charset="utf8"/>
        <script src="jblock.js"></script>
    </head>
    <body>
        <h1>Hello, world</h1>
        <b:button>OK</b:button>
    </body>
</html>
```

После обработки:
```html
<html>
    <head>
        <meta charset="utf8"/>
        <script src="jblock.js"></script>
    </head>
    <body>
        <h1>Hello, world</h1>
        <div class="button">Кнопка</div>
    </body>
</html>
```

Далее можно создать шаблон button.jblock.js (более подробно о шаблонах чуть позже), который правильно раскроет блок button:
```javascript
jBlock.match('button', function ()
{
    this.tag('button')
        .append({
            e_label: this.copy(),
            tag: 'span'
        })
})
```

Этот скрипт следует подключить к html-файлу, который, если лениво, можно упрощать до максимума (браузер стерпит):
```html
<!-- Было: -->
<meta charset="utf8"/>
<script src="jblock.js"></script>
<script src="button.jblock.js"></script>
<h1>Hello, world</h1>
<b:button>OK</b:button>

<!-- Стало: -->
<meta charset="utf8"/>
<script src="jblock.js"></script>
<script src="button.jblock.js"></script>
<h1>Hello, world</h1>
<button class="button">
    <span class="button__label">ОК</span>
</button>
```

По-хорошему, следует вообще уходить от HTML к собственной BEM-семантике:
```html
<meta charset="utf8"/>
<script src="jblock-and-my-blocks.js"></script>

<b:page>
    <b:header>Hello, world</b:header>
    <b:button m:size="L">OK</b:button>
</b:page>
```

**Важно:** внутри узлов с префиксом `b:` уже не может быть HTML-разметки (но если очень надо, для этой функции можно самим написать шаблон).

## Медоты jBlock
* **json2html** *(json:Object):String* — Преобразует BEM-ориентированный JSON в HTML
* **json2xml** *(json:Object, isHtml:Boolean):String* — Преобразует BEM-ориентированный JSON в соответсвующий ему XML (или HTML as is)
* **match** *(selector:String, template:Function):jBlock* — привязывает к селектору шаблон (детали ниже)
* **onLoad** *(handler:Function)* — handler, который будет выполнен после загрузки DOM и всех преобразований

## Шаблоны
Работа метода `jBlock.json2html()` состоит из двух этапов:

1. Дерево обходится в режиме `expand` — это внутренний термин, в этом режиме элементы дерева могут быть модифицированы, дополнены или заменены на новые.
2. Раскрытое дерево обходится во второй раз в режиме `html`, и, согласно описанным выше правилам, преобразуется в HTML.

Шаблоны — это функции, которые применяются к контекстам JSON-дерева во время обхода в режиме `expand`. В теле шаблона могут вызываться методы контекста.

Определение шаблона:
```js
jBlock.match('<СЕЛЕКТОР 1>', '<СЕЛЕКТОР 2>', ..., function () {
    //Тело шаблона
})
```

Селектор имеет формат:

* `block` — применить шаблон к блоку с именем «block»
* `block__elem` — применить к элементу «elem»
* `block_mod_val` — к блоку «block» с модификатором mod со значением val
* `block__elem_mod_val` — аналогичное про элемент
* `block__*` — все элементы блока

К одному экзепляру блока применяется только один шаблон. Это страхует от бесконечной рекурсии, многочисленных холостых обходов дерева, а главное — позволяет переопределять шаблоны уточняющими селекторами.

Приоритет селектора зависит, прежде всего, от его точности, а при прочих равных, от порядка упоминания — последний перекроет предыдущего.

### Методы контекста:

* **append** *([content:Array | Object | String, ...])* — определяет содержимое контекста; без аргумента очищает содержимое
* **attr** *(name:String | list:Object, [value])* — возвращает или устанавливает атрибуты
* **blockMod** *(name:String)* — возвращает значение модификатора родительского блока (для элементов)
* **blockParam** *(name:String)* — возвращает значение параметра родительского блока (для элементов)
* **copy** *(name:String, ...):Ctx* — возвращает копию дочерних элементов ('e_elemName', 'b_blockName')
* **css** *(name:String | list:Object, [value])* — возвращает или устанавливает CSS-свойства
* **ctx** *()* — ссылка на контекст (используется при обертывании элемента, см. ниже)
* **defMod** *(modifiers:Object)* — устанавливает список допустимых модификаторов и их занчений по умолчанию
* **escapeHtml** *()* — преобразует символы содержимого `<` в текстовые
* **has** *([name:String])* — проверяет контекст на наличие элемента или блока ('e_elemName', 'b_blockName'); без аргументов проверяет контекст на наличие какого-либо содержимого
* **index** *()* — позиция контекста среди соседей
* **js** *()* — взводит флаг js
* **mix** *(class:String, ...)* — добавляет классы для смешивания
* **mod** *(name:String | list:Object, [value])* — возвращает или устанавливает модификаторы
* **name** *()* — возвращает имя элемента или блока (без префиксов `b_` или `e_`)
* **param** *(name:String | list:Object, [value])* — возвращает или устанавливает абстрактные параметры (незарезервированные поля контекста)
* **replaceWith** *(content:Object)* — заменить контекст новым содержимым
* **tag** *(name:String)* — устанавливает имя тега
* **text** *([selecor:String])* — возвращает текстовое содержимое контекста или его дочернего элемента

Метды можно связывать в цепочки:

```js
jBlock.match('input', function ()
{
    this.tag('span')
        .defMod({
            size:'M',
            type:'normal',
            state:'release'
        })
        .append({
            e_input:'',
            tag:'input',
            attr: {
                size:1,
                autocomlete:'off',
                placeholder:this.param('hint'),
                value: this.param('value'),
                readonly: this.param('readonly') && 'yes'
            }
        })
})
```

### Управление содержимым контекста

Метод `append()` меняет содержимое контекста, добавляя указанные в аргументах узлы в его конец. Важное замечание: после первого вызова метода, текущее содержимое блока переопределяется. Для того, чтобы частично или полностью сохранить текущее содержимое есть метод `copy()`. Теперь несколько поясняющих примеров.

Добавление элементов к текущему содержимому списка (`copy()` без селектора копирует всё содержимое контекста):

```js
jBlock.match('foo', function ()
{
    this.append(
            {e_before:''}, // до содержимого
            this.copy(),
            {e_after:''} // и после
        )
})
```

Оборачивание элементов:
```js
jBlock.match('foo', function ()
{
    this.append({
            e_wrap: this.copy('foo__bar')
        })
})
```

Обнуление содержимого:
```js
jBlock.match('foo', function ()
{
    this.append()
})
```

Более сложный пример. Стоит задача в блоке «Письмо» зафиксировать положение элементов: сначала заголовок, потом текст с картинками, а потом подпись:

```js
jBlock.match('letter', function ()
{
    this.append(
        this.copy('e_header'),
        this.copy('e_text', 'e_attach'),
        this.copy('e_sign')
    )
})
```

И теперь, вне зависимости от последовательности указанных элементов, в тело письма скопируются только нужные и в нужном порядке.

Или, например, в статье сначала должен идти заголовок, а потом все остальное:

```js
jBlock.match('article', function ()
{
    this.append(
        this.copy('e_header'),
        this.copy('!e_header')
    )
})
```

### Обертывание контекста

Метод `replaceWith()` помещает на место контекста переданный в аргументе объект. Метод `ctx()` внутри этого метода все еще возвращает ссылку на старый контекст:

```js
jBlock.match('page', function ()
{
    this.tag('body')
        .replaceWith({
            e_html:'',
            tag:'html',
            content: [
                {e_head:'', tag:'head'},
                this.ctx()
            ]
        })
})
```

`replaceWith()` нужно вызывать в конце шаблона, так как после него действия над текущим контекстом будут невозможны.

### Примеры шаблонов
* [Селектор block__*](https://github.yandex-team.ru/kovchiy/blocks.common/blob/master/vert/vert.jblock.js)
* [Зачем нужен jBlock.onLoad](https://github.yandex-team.ru/kovchiy/blocks.common/blob/master/page/page.jblock.js)
* [Глобальные константы в свойстве import](https://github.yandex-team.ru/kovchiy/blocks.common/tree/master/import)
* [Исключающие селекторы в has() и copy()](https://github.yandex-team.ru/kovchiy/blocks.common/blob/master/menu/menu.jblock.js)
