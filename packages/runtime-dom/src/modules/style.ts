import { isString, hyphenate, capitalize, isArray } from '@vue/shared'
import { camelize } from '@vue/runtime-core'

// Record是typescript中用来拷贝属性，并不需要输入类型就可以将属性拷贝到对象上
type Style = string | Record<string, string | string[]> | null

// 对dom上的style新旧样式进行patch
export function patchStyle(el: Element, prev: Style, next: Style) {
  const style = (el as HTMLElement).style
  if (!next) {
    // 新的节点没有style样式，把节点上的style属性移除
    el.removeAttribute('style')
  } else if (isString(next)) {
    // 当前的样式是string
    if (prev !== next) {
      // 旧样式和新样式不一样
      const current = style.display
      style.cssText = next
      // indicates that the `display` of the element is controlled by `v-show`,
      // 这里说明下，元素是否'display'展示'是由“v-show”控制的，
      // so we always keep the current `display` value regardless of the `style` value,
      // 所以我们总是保持当前的display值而不需要管style里面display值，
      // thus handing over control to `v-show`.
      // 这样就把控制权交给了“v-show”。
      // '_vod' vue 的v-show关联的原始display值，
      if ('_vod' in el) {
        // el上有的v-show属性,保持当前的display值
        style.display = current
      }
    }
  } else {
    // 将style属性设置到当前dom上
    for (const key in next) {
      setStyle(style, key, next[key])
    }
    // 之前有样式且不是string，会将原来dom上有的样式，而新的样式没有的样式属性清除
    if (prev && !isString(prev)) {
      for (const key in prev) {
        if (next[key] == null) {
          setStyle(style, key, '')
        }
      }
    }
  }
}

const importantRE = /\s*!important$/

// 给dom设置style
function setStyle(
  style: CSSStyleDeclaration,
  name: string,
  val: string | string[]
) {
  if (isArray(val)) {
    // 值是数组，遍历设置，如font-familly
    val.forEach(v => setStyle(style, name, v))
  } else {
    if (name.startsWith('--')) {
      // 自定义属性 (--*)：CSS变量
      // custom property definition
      style.setProperty(name, val)
    } else {
      const prefixed = autoPrefix(style, name)
      if (importantRE.test(val)) {
        // !important
        style.setProperty(
          hyphenate(prefixed),
          val.replace(importantRE, ''),
          'important'
        )
      } else {
        style[prefixed as any] = val
      }
    }
  }
}

const prefixes = ['Webkit', 'Moz', 'ms']
const prefixCache: Record<string, string> = {}

// 处理styls前缀
function autoPrefix(style: CSSStyleDeclaration, rawName: string): string {
  const cached = prefixCache[rawName]
  if (cached) {
    return cached
  }
  let name = camelize(rawName) // 属性名先转为驼峰
  if (name !== 'filter' && name in style) {
    return (prefixCache[rawName] = name)
  }
  name = capitalize(name) // 属性名转为大写
  for (let i = 0; i < prefixes.length; i++) {
    const prefixed = prefixes[i] + name
    if (prefixed in style) {
      return (prefixCache[rawName] = prefixed)
    }
  }
  return rawName
}
