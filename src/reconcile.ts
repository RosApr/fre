import {
  IFiber,
  FreElement,
  FC,
  Attributes,
  HTMLElementEx,
  FreNode,
  HookEffect,
} from './type'
import { createElement } from './dom'
import { resetCursor } from './hook'
import { schedule, shouldYield } from './schedule'
import { isArr, createText } from './h'
import { commit, removeElement } from './commit'

let currentFiber: IFiber = null
let rootFiber = null

export const enum TAG {
  UPDATE = 1 << 1,
  INSERT = 1 << 2,
  REMOVE = 1 << 3,
  SVG = 1 << 4,
  DIRTY = 1 << 5,
  MOVE = 1 << 6,
  REPLACE = 1 << 7
}

export const render = (vnode: FreElement, node: Node): void => {
  rootFiber = {
    node,
    props: { children: vnode },
  } as IFiber
  update(rootFiber)
}

export const update = (fiber?: IFiber) => {
  if (!fiber.dirty) {
    fiber.dirty = true
    schedule(() => reconcile(fiber))
  }
}

const reconcile = (fiber?: IFiber): boolean => {
  while (fiber && !shouldYield()) fiber = capture(fiber)
  if (fiber) return reconcile.bind(null, fiber)
  return null
}

const memo = (fiber) => {
  if ((fiber.type as FC).memo && fiber.old?.props) {
    let scu = (fiber.type as FC).shouldUpdate || shouldUpdate
    if (!scu(fiber.props, fiber.old.props)) { // fast-fix
      return getSibling(fiber)
    }
  }
  return null
}

const capture = (fiber: IFiber): IFiber | undefined => {
  fiber.isComp = isFn(fiber.type)
  if (fiber.isComp) {
    const memoFiber = memo(fiber)
    if (memoFiber) {
      return memoFiber
    }
    updateHook(fiber)
  } else {
    updateHost(fiber)
  }
  if (fiber.child) return fiber.child
  const sibling = getSibling(fiber)
  return sibling
}

const getSibling = (fiber) => {
  while (fiber) {
    bubble(fiber)
    if (fiber.dirty) {
      fiber.dirty = false
      commit(fiber)
      return null
    }
    if (fiber.sibling) return fiber.sibling
    fiber = fiber.parent
  }
  return null
}

const bubble = fiber => {
  if (fiber.isComp) {
    if (fiber.hooks) {
      side(fiber.hooks.layout)
      schedule(() => side(fiber.hooks.effect))
    }
  }
}


const shouldUpdate = (a, b) => {
  for (let i in a) if (!(i in b)) return true
  for (let i in b) if (a[i] !== b[i]) return true
}

const updateHook = <P = Attributes>(fiber: IFiber): any => {
  resetCursor()
  currentFiber = fiber
  let children = (fiber.type as FC<P>)(fiber.props)
  reconcileChidren(fiber, simpleVnode(children))
}

const updateHost = (fiber: IFiber): void => {
  fiber.parentNode = (getParentNode(fiber) as any) || {}
  if (!fiber.node) {
    if (fiber.type === 'svg') fiber.lane |= TAG.SVG
    fiber.node = createElement(fiber) as HTMLElementEx
  }
  reconcileChidren(fiber, fiber.props.children)
}

const simpleVnode = (type: any) =>
  isStr(type) ? createText(type as string) : type

const getParentNode = (fiber: IFiber): HTMLElement | undefined => {
  while ((fiber = fiber.parent)) {
    if (!fiber.isComp) return fiber.node
  }
}

const reconcileChidren = (fiber: any, children: FreNode): void => {
  let aCh = fiber.kids || [],
    bCh = (fiber.kids = arrayfy(children) as any)
  const actions = diff(aCh, bCh)

  for (let i = 0, prev = null, len = bCh.length; i < len; i++) {
    const child = bCh[i]
    child.action = actions[i]
    if (fiber.lane & TAG.SVG) {
      child.lane |= TAG.SVG
    }
    child.parent = fiber
    if (i > 0) {
      prev.sibling = child
    } else {
      fiber.child = child
    }
    prev = child
  }
}

function clone(a, b) {
  b.hooks = a.hooks
  b.ref = a.ref
  b.node = a.node // 临时修复
  b.kids = a.kids
  b.old = a
}

export const arrayfy = arr => (!arr ? [] : isArr(arr) ? arr : [arr])

const side = (effects: HookEffect[]): void => {
  effects.forEach(e => e[2] && e[2]())
  effects.forEach(e => (e[2] = e[0]()))
  effects.length = 0
}

const diff = function (a, b) {
  var actions = [],
    aIdx = {},
    bIdx = {},
    key = v => v.key + v.type,
    i, j;
  for (i = 0; i < a.length; i++) {
    aIdx[key(a[i])] = i;
  }
  for (i = 0; i < b.length; i++) {
    bIdx[key(b[i])] = i;
  }
  for (i = j = 0; i !== a.length || j !== b.length;) {
    var aElm = a[i], bElm = b[j];
    if (aElm === null) {
      i++;
    } else if (b.length <= j) {
      removeElement(a[i])
      i++;
    } else if (a.length <= i) {
      actions.push({ op: TAG.INSERT, elm: bElm, before: a[i] })
      j++;
    } else if (key(aElm) === key(bElm)) {
      clone(aElm, bElm)
      actions.push({ op: TAG.UPDATE })
      i++; j++;
    } else {
      var curElmInNew = bIdx[key(aElm)]
      var wantedElmInOld = aIdx[key(bElm)]
      if (curElmInNew === undefined) {
        removeElement(a[i])
        i++;
      } else if (wantedElmInOld === undefined) {
        actions.push({ op: TAG.INSERT, elm: bElm, before: a[i] })
        j++
      } else {
        clone(a[wantedElmInOld], bElm)
        actions.push({ op: TAG.MOVE, elm: a[wantedElmInOld], before: a[i] })
        a[wantedElmInOld] = null
        j++
      }
    }
  }
  return actions
}

export const getCurrentFiber = () => currentFiber || null
export const isFn = (x: any): x is Function => typeof x === 'function'
export const isStr = (s: any): s is number | string =>
  typeof s === 'number' || typeof s === 'string'