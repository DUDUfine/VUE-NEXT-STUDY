// **文件作用：对dom上的属性赋值进行处理（v-text、v-html、string、boolean、number值处理）**
// __UNSAFE__
// Reason: potentially setting innerHTML.
// 不安全，因为设置innerHTML有潜在风险
// This can come from explicit usage of v-html or innerHTML as a prop in render
// 这可以通过在渲染中显式地使用v-html或innerHTML来实现

import { warn } from '@vue/runtime-core'

// functions. The user is responsible for using them with only trusted content.
// 用户需要保证使用可信的内容
// 处理DOM节点上的属性，包括v-text和v-html 指令插入内容，value值传递
export function patchDOMProp(
  el: any,
  key: string,
  value: any,
  // the following args are passed only due to potential innerHTML/textContent
  // 下面的参数只是由于潜在的innerHTML/textContent而传递的
  // overriding existing VNodes, in which case the old tree must be properly
  // 重写现有的vnode，在这种情况下，旧树必须正确
  // unmounted.
  // 卸载子节点
  prevChildren: any,
  parentComponent: any,
  parentSuspense: any,
  unmountChildren: any
) {
  // 插入html或text内容
  if (key === 'innerHTML' || key === 'textContent') {
    // 原来有子节点，卸载子节点
    if (prevChildren) {
      unmountChildren(prevChildren, parentComponent, parentSuspense)
    }
    el[key] = value == null ? '' : value
    return
  }
  // 处理DOM上的值
  if (key === 'value' && el.tagName !== 'PROGRESS') {
    // store value as _value as well since
    // 将当前新原始的value保存为_value
    // non-string values will be stringified.
    // 非字符串值将被字符串化。
    el._value = value
    const newValue = value == null ? '' : value
    // el节点上旧值和新值不一致，用新值重新赋值
    if (el.value !== newValue) {
      el.value = newValue
    }
    return
  }

  if (value === '' || value == null) {
    const type = typeof el[key]
    // 如果当前属性是boolean类型且没有值，默认值为true
    if (value === '' && type === 'boolean') {
      // e.g. <select multiple> compiles to { multiple: '' }
      el[key] = true
      return
    } else if (value == null && type === 'string') {
      // 如果当前属性是string类型字段，默认值为''
      // e.g. <div :id="null">
      el[key] = ''
      el.removeAttribute(key)
      return
    } else if (type === 'number') {
      //  如果当前属性是number类型字段，默认值为0
      // e.g. <img :width="null">
      el[key] = 0
      el.removeAttribute(key)
      return
    }
  }

  // some properties perform value validation and throw
  // 一些属性赋值进行无效验证，并抛出错误提示
  try {
    el[key] = value
  } catch (e) {
    if (__DEV__) {
      warn(
        `Failed setting prop "${key}" on <${el.tagName.toLowerCase()}>: ` +
          `value ${value} is invalid.`,
        e
      )
    }
  }
}
