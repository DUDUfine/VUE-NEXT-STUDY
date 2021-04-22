import { hyphenate, isArray } from '@vue/shared'
import {
  ComponentInternalInstance,
  callWithAsyncErrorHandling
} from '@vue/runtime-core'
import { ErrorCodes } from 'packages/runtime-core/src/errorHandling'

interface Invoker extends EventListener {
  value: EventValue
  attached: number
}

type EventValue = Function | Function[]

// Async edge case fix requires storing an event listener's attach timestamp.
// 异步边缘情况修复需要存储事件侦听器的附加时间戳（如果是低分辨率的时间戳当前方法会被重写覆盖）
let _getNow: () => number = Date.now

let skipTimestampCheck = false

if (typeof window !== 'undefined') {
  // Determine what event timestamp the browser is using. Annoyingly, the
  // timestamp can either be hi-res (relative to page load) or low-res
  // (relative to UNIX epoch), so in order to compare time we have to use the
  // same timestamp type when saving the flush timestamp.
  // 确定浏览器正在使用的时间戳。烦人的是，时间戳可以是高分辨率的(相对于页面加载)，也可以是低分辨率(相对于UNIX纪元)
  // 所以为了比较时间，我们必须使用和保存刷新时间戳相同的时间戳
  if (_getNow() > document.createEvent('Event').timeStamp) {
    // if the low-res timestamp which is bigger than the event timestamp
    // (which is evaluated AFTER) it means the event is using a hi-res timestamp,
    // and we need to use the hi-res version for event listeners as well.
    // 如果低分辨率时间戳大于事件时间戳，这意味着事件使用了高分辨率的时间戳，我们需要为事件监听器使用高分辨率版本。
    _getNow = () => performance.now()
  }
  // #3485: Firefox <= 53 has incorrect Event.timeStamp implementation
  // and does not fire microtasks in between event propagation, so safe to exclude.

  // Firefox <= 53 有错误的时间戳实现
  // 并且在事件分发之间不会触发微服务,所以可以安全执行
  const ffMatch = navigator.userAgent.match(/firefox\/(\d+)/i)
  skipTimestampCheck = !!(ffMatch && Number(ffMatch[1]) <= 53)
}

// To avoid the overhead of repeatedly calling performance.now(), we cache
// and use the same timestamp for all event listeners attached in the same tick.
// 为了避免重复调用performance.now()的开销，我们缓存并且在标记相同的事件监听器使用相同的时间戳
let cachedNow: number = 0
const p = Promise.resolve()
const reset = () => {
  cachedNow = 0
}
// 获取当前时间戳，如果有缓存从缓存拿，如果没有异步（promise）重置0；获取当前时间戳更新缓存时间戳
const getNow = () => cachedNow || (p.then(reset), (cachedNow = _getNow()))

// 添加事件侦听器
export function addEventListener(
  el: Element,
  event: string,
  handler: EventListener,
  options?: EventListenerOptions
) {
  el.addEventListener(event, handler, options)
}

// 移除事件侦听器
export function removeEventListener(
  el: Element,
  event: string,
  handler: EventListener,
  options?: EventListenerOptions
) {
  el.removeEventListener(event, handler, options)
}

// 比对事件侦听器
export function patchEvent(
  el: Element & { _vei?: Record<string, Invoker | undefined> },
  rawName: string,
  prevValue: EventValue | null,
  nextValue: EventValue | null,
  instance: ComponentInternalInstance | null = null
) {
  // vei = vue event invokers
  // vei —— vue事件调用器
  const invokers = el._vei || (el._vei = {})
  const existingInvoker = invokers[rawName]
  if (nextValue && existingInvoker) {
    // 已经存在事件侦听器及设置值，赋值
    // patch
    existingInvoker.value = nextValue
  } else {
    const [name, options] = parseName(rawName)
    if (nextValue) {
      // add
      const invoker = (invokers[rawName] = createInvoker(nextValue, instance))
      addEventListener(el, name, invoker, options)
    } else if (existingInvoker) {
      // remove
      removeEventListener(el, name, existingInvoker, options)
      invokers[rawName] = undefined
    }
  }
}

// Once：点击事件将只会触发一次
// Passive：事件的默认行为将会立即触发，不会等到事件回调完成（修饰符尤其能够提升移动端的性能）
// Capture： 添加事件监听器时使用事件捕获模式，即内部元素触发的事件先在此处理，然后才交由内部元素进行处理
const optionsModifierRE = /(?:Once|Passive|Capture)$/

// 解析返回处理好的事件名
function parseName(name: string): [string, EventListenerOptions | undefined] {
  let options: EventListenerOptions | undefined
  if (optionsModifierRE.test(name)) {
    // 有事件修饰配置
    options = {}
    let m
    while ((m = name.match(optionsModifierRE))) {
      name = name.slice(0, name.length - m[0].length)
      ;(options as any)[m[0].toLowerCase()] = true
      options
    }
  }
  return [hyphenate(name.slice(2)), options]
}

// 创建事件侦听器
function createInvoker(
  initialValue: EventValue,
  instance: ComponentInternalInstance | null
) {
  const invoker: Invoker = (e: Event) => {
    // async edge case #6566: inner click event triggers patch, event handler
    // attached to outer element during patch, and triggered again. This
    // happens because browsers fire microtask ticks between event propagation.
    // the solution is simple: we save the timestamp when a handler is attached,
    // and the handler would only fire if the event passed to it was fired
    // AFTER it was attached.
    // 异步边缘案例： 内部点击事件触发patch事件，事件处理程序在patch时会添加到外部的元素，导致再次触发
    // 原因是因为浏览器事件分发时触发微任务定时器
    // 解决方案很简单，我们添加处理器后保存一下时间戳，这样在它被添加之后，只有在传递给他的事件（用户触发？为了避免初始化事件时被触发？）被触发时才会触发
    const timeStamp = e.timeStamp || _getNow()

    // Firefox <= 53跳过时间戳检测
    if (skipTimestampCheck || timeStamp >= invoker.attached - 1) {
      callWithAsyncErrorHandling(
        patchStopImmediatePropagation(e, invoker.value),
        instance,
        ErrorCodes.NATIVE_EVENT_HANDLER,
        [e]
      )
    }
  }
  invoker.value = initialValue
  invoker.attached = getNow()
  return invoker
}

function patchStopImmediatePropagation(
  e: Event,
  value: EventValue
): EventValue {
  if (isArray(value)) {
    // 事件队列
    const originalStop = e.stopImmediatePropagation
    e.stopImmediatePropagation = () => {
      originalStop.call(e)
      ;(e as any)._stopped = true
    }
    return value.map(fn => (e: Event) => !(e as any)._stopped && fn(e))
  } else {
    return value
  }
}
