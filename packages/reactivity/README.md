# @vue/reactivity

## Usage Note

This package is inlined into Global & Browser ESM builds of user-facing renderers (e.g. `@vue/runtime-dom`), but also published as a package that can be used standalone. The standalone build should not be used alongside a pre-bundled build of a user-facing renderer, as they will have different internal storage for reactivity connections. A user-facing renderer should re-export all APIs from this package.
这个包被内联到面向用户的渲染器的全局和浏览器ESM构建中(例如。' @vue/runtime-dom ')，但也可以作为一个包发布，可以单独使用。独立构建不应该与面向用户的渲染器的预绑定构建一起使用，因为它们将有不同的内部存储用于响应性连接。面向用户的渲染器应该从这个包中重新导出所有api。
For full exposed APIs, see `src/index.ts`. You can also run `yarn build reactivity --types` from repo root, which will generate an API report at `temp/reactivity.api.md`.

## Credits

The implementation of this module is inspired by the following prior art in the JavaScript ecosystem:
这个模块的实现受到了JavaScript生态系统中现有技术的启发

- [Meteor Tracker](https://docs.meteor.com/api/tracker.html)
- [nx-js/observer-util](https://github.com/nx-js/observer-util)
- [salesforce/observable-membrane](https://github.com/salesforce/observable-membrane)

## Caveats

- Built-in objects are not observed except for `Array`, `Map`, `WeakMap`, `Set` and `WeakSet`.
内置对象除了 `Array`, `Map`, `WeakMap`, `Set`,`WeakSet`不被监听之外，其他的被监听。
