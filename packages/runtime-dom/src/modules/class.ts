import { ElementWithTransition } from '../components/Transition'

// 比对dom上的class

// compiler should normalize class + :class bindings on the same element
// into a single binding ['staticClass', dynamic]
// 编译需要将同一个元素上的class 和动态绑定的class规范化为['staticClass', dynamic]
export function patchClass(el: Element, value: string | null, isSVG: boolean) {
  if (value == null) {
    value = ''
  }
  if (isSVG) {
    el.setAttribute('class', value)
  } else {
    // directly setting className should be faster than setAttribute in theory
    // if this is an element during a transition, take the temporary transition
    // classes into account.
    // 理论上，直接设置className应该比setAttribute快
    // 如果这是过渡变化的一个元素，则考虑使用临时过渡类。
    // _vtc 是vue的状态过渡动画
    const transitionClasses = (el as ElementWithTransition)._vtc
    if (transitionClasses) {
      value = (value
        ? [value, ...transitionClasses]
        : [...transitionClasses]
      ).join(' ')
    }
    el.className = value
  }
}
