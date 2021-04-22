import { isSpecialBooleanAttr } from '@vue/shared'

export const xlinkNS = 'http://www.w3.org/1999/xlink'

// 比对dom上的属性
export function patchAttr(
  el: Element,
  key: string,
  value: any,
  isSVG: boolean
) {
  if (isSVG && key.startsWith('xlink:')) {
    if (value == null) {
      el.removeAttributeNS(xlinkNS, key.slice(6, key.length))
    } else {
      el.setAttributeNS(xlinkNS, key, value)
    }
  } else {
    // note we are only checking boolean attributes that don't have a
    // corresponding dom prop of the same name here.
    // 注意，这里我们只检查dom上有没有和attr属性相同的prop
    const isBoolean = isSpecialBooleanAttr(key)
    if (value == null || (isBoolean && value === false)) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, isBoolean ? '' : value) // prop上有的属性attr也有时。attr置空
    }
  }
}
