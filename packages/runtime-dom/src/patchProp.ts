import { patchClass } from './modules/class'
import { patchStyle } from './modules/style'
import { patchAttr } from './modules/attrs'
import { patchDOMProp } from './modules/props'
import { patchEvent } from './modules/events'
import { isOn, isString, isFunction, isModelListener } from '@vue/shared'
import { RendererOptions } from '@vue/runtime-core'

const nativeOnRE = /^on[a-z]/

type DOMRendererOptions = RendererOptions<Node, Element>

// key为value时强制设置为prop
export const forcePatchProp: DOMRendererOptions['forcePatchProp'] = (_, key) =>
  key === 'value'

// 对DOM上的各种属性（class、style、事件、attribute、property）进行解析处理
export const patchProp: DOMRendererOptions['patchProp'] = (
  el,
  key,
  prevValue,
  nextValue,
  isSVG = false,
  prevChildren,
  parentComponent,
  parentSuspense,
  unmountChildren
) => {
  switch (key) {
    // special
    case 'class':
      patchClass(el, nextValue, isSVG)
      break
    case 'style':
      patchStyle(el, prevValue, nextValue)
      break
    default:
      if (isOn(key)) {
        // ignore v-model listeners
        if (!isModelListener(key)) {
          patchEvent(el, key, prevValue, nextValue, parentComponent)
        }
      } else if (shouldSetAsProp(el, key, nextValue, isSVG)) {
        patchDOMProp(
          el,
          key,
          nextValue,
          prevChildren,
          parentComponent,
          parentSuspense,
          unmountChildren
        )
      } else {
        // special case for <input v-model type="checkbox"> with
        // :true-value & :false-value
        // store value as dom properties since non-string values will be
        // stringified.
        // 对于<input v-model type="checkbox">这种特殊情况，绑定的为 true 或 false值 将存储为dom属性，因为非字符串值将被字符串化
        if (key === 'true-value') {
          ;(el as any)._trueValue = nextValue
        } else if (key === 'false-value') {
          ;(el as any)._falseValue = nextValue
        }
        patchAttr(el, key, nextValue, isSVG)
      }
      break
  }
}

// 设置为prop属性
function shouldSetAsProp(
  el: Element,
  key: string,
  value: unknown,
  isSVG: boolean
) {
  if (isSVG) {
    // most keys must be set as attribute on svg elements to work
    // ...except innerHTML
    // 大多属性需要设置为SVG元素的attribute 属性才能正常，除了innerHTML
    if (key === 'innerHTML') {
      return true
    }
    // or native onclick with function values
    // 本地点击函数
    if (key in el && nativeOnRE.test(key) && isFunction(value)) {
      return true
    }
    return false
  }

  // spellcheck and draggable are numerated attrs, however their
  // corresponding DOM properties are actually booleans - this leads to
  // setting it with a string "false" value leading it to be coerced to
  // `true`, so we need to always treat them as attributes.
  // Note that `contentEditable` doesn't have this problem: its DOM
  // property is also enumerated string values.
  // 拼写检查和拖拽时用 attrs 来表示的，然而他们对应的DOM属性实际上是布尔值，这会导致设置字符串‘false’的时候被强制转为 true,
  // 所以还需要把他们多为属性对待，
  // 要注意的是 ‘contentEditable’ 没有这个问题，他的DOM属性也是枚举字符串值
  if (key === 'spellcheck' || key === 'draggable') {
    return false
  }

  // #1787, #2840 form property on form elements is readonly and must be set as
  // attribute.
  // 表单元素上的表单属性是只读的，必须设置为attribute属性
  if (key === 'form') {
    return false
  }

  // #1526 <input list> must be set as attribute
  // input 标签上 的list属性必须设置为attribute属性
  if (key === 'list' && el.tagName === 'INPUT') {
    return false
  }

  // #2766 <textarea type> must be set as attribute
  // textarea 标签上 的type属性必须设置为attribute属性
  if (key === 'type' && el.tagName === 'TEXTAREA') {
    return false
  }

  // native onclick with string value, must be set as attribute
  // 本地点击事件的字符串值，必须设置为属性
  if (nativeOnRE.test(key) && isString(value)) {
    return false
  }

  return key in el
}
