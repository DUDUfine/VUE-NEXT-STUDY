import { warn, getCurrentInstance } from '@vue/runtime-core'
import { EMPTY_OBJ } from '@vue/shared'

export function useCssModule(name = '$style'): Record<string, string> {
  /* istanbul ignore else */
  if (!__GLOBAL__) {
    const instance = getCurrentInstance()!
    if (!instance) {
      // __DEV__ && useCssModule必须在setup中调用
      __DEV__ && warn(`useCssModule must be called inside setup()`)
      return EMPTY_OBJ
    }
    const modules = instance.type.__cssModules
    if (!modules) {
      // 当前实例没有CSS模块注入
      __DEV__ && warn(`Current instance does not have CSS modules injected.`)
      return EMPTY_OBJ
    }
    const mod = modules[name]
    if (!mod) {
      __DEV__ &&
        // 当前实例没有 xx CSS模块
        warn(`Current instance does not have CSS module named "${name}".`)
      return EMPTY_OBJ
    }
    return mod as Record<string, string>
  } else {
    if (__DEV__) {
      // 在全局构建中不支持useCssModule()
      warn(`useCssModule() is not supported in the global build.`)
    }
    return EMPTY_OBJ
  }
}
