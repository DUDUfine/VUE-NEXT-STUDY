# @vue/compiler-sfc

> Lower level utilities for compiling Vue Single File Components

This package contains lower level utilities that you can use if you are writing a plugin / transform for a bundler or module system that compiles Vue Single File Components (SFCs) into JavaScript. It is used in [vue-loader](https://github.com/vuejs/vue-loader), [rollup-plugin-vue](https://github.com/vuejs/rollup-plugin-vue) and [vite](https://github.com/vitejs/vite).
这个包包含较低级别的实用程序，你可以使用它来为一个bundle或模块系统编写一个插件/转换器 来将Vue单文件组件(sfc)编译成JavaScript，。

## API

The API is intentionally low-level due to the various considerations when integrating Vue SFCs in a build system:
由于在构建系统中集成Vue SFCs（Vue单文件组件）时需要考虑各种因素，所以有意将API设置为低级API:

- Separate hot-module replacement (HMR) for script, template and styles
  - template updates should not reset component state
  - style updates should be performed without component re-render
- 在热模块替换对脚本、模板和样式分开
  - 模板更新不应该重置组件状态
  - 样式更新应该在不重新渲染组件的情况下执行

- Leveraging the tool's plugin system for pre-processor handling. e.g. `<style lang="scss">` should be processed by the corresponding webpack loader.
- 利用工具的插件系统进行预处理处理 

- In some cases, transformers of each block in an SFC do not share the same execution context. For example, when used with `thread-loader` or other parallelized configurations, the template sub-loader in `vue-loader` may not have access to the full SFC and its descriptor.
- 在某些情况下，在在单文件组件中的每个块的转换器并不共享相同的执行上下文  例如，当与“线程加载器”或其他并行配置一起使用时，“vue-loader”中的模板子加载器可能无法访问完整的SFC(单文件组件)及其描述符。

The general idea is to generate a facade module that imports the individual blocks of the component. The trick is the module imports itself with different query strings so that the build system can handle each request as "virtual" modules:
一般的想法是生成一个门面模块来导入组件的各个块。诀窍是模块本身使用不同的查询字符串导入，以便构建系统可以将每个请求作为“虚拟”模块处理:

```
                                  +--------------------+
                                  |                    |
                                  |  script transform  |
                           +----->+                    |
                           |      +--------------------+
                           |
+--------------------+     |      +--------------------+
|                    |     |      |                    |
|  facade transform  +----------->+ template transform |
|                    |     |      |                    |
+--------------------+     |      +--------------------+
                           |
                           |      +--------------------+
                           +----->+                    |
                                  |  style transform   |
                                  |                    |
                                  +--------------------+
```

Where the facade module looks like this:

```js
// main script
import script from '/project/foo.vue?vue&type=script'
// template compiled to render function
import { render } from '/project/foo.vue?vue&type=template&id=xxxxxx'
// css
import '/project/foo.vue?vue&type=style&index=0&id=xxxxxx'

// attach render function to script
script.render = render

// attach additional metadata
// some of these should be dev only
script.__file = 'example.vue'
script.__scopeId = 'xxxxxx'

// additional tooling-specific HMR handling code
// using __VUE_HMR_API__ global

export default script
```

### High Level Workflow

1. In facade transform, parse the source into descriptor with the `parse` API and generate the above facade module code based on the descriptor;

2. In script transform, use `compileScript` to process the script. This handles features like `<script setup>` and CSS variable injection. Alternatively, this can be done directly in the facade module (with the code inlined instead of imported), but it will require rewriting `export default` to a temp variable (a `rewriteDefault` convenience API is provided for this purpose) so additional options can be attached to the exported object.

3. In template transform, use `compileTemplate` to compile the raw template into render function code.

4. In style transform, use `compileStyle` to compile raw CSS to handle `<style scoped>`, `<style module>` and CSS variable injection.

Options needed for these APIs can be passed via the query string.



For detailed API references and options, check out the source type definitions. For actual usage of these APIs, check out [rollup-plugin-vue](https://github.com/vuejs/rollup-plugin-vue/tree/next) or [vue-loader](https://github.com/vuejs/vue-loader/tree/next).
