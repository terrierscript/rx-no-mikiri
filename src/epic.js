/* eslint-disable */
import Rx from "rxjs"
import { combineEpics } from "redux-observable"
import * as actions from './actions'

// 100ms = 1s
const frame = 10 // 1 / 10 
const openTiming = 300 + Math.ceil(Math.random() * 150) // 3s ~ 18s

const getTime = ( { getState } ) => getState().game.timer
const getLevel = ( { getState } ) => getState().game.level

const keyEventSource = Rx.Observable.fromEvent(document, 'keydown')
const keyStartEpic = (action$, store) =>
  action$
    .switchMap( () => keyEventSource
      .filter( ({key}) => key === "s")
      .mapTo( actions.start() )
    )
const keyResetEpic = (action$, store) =>
  action$
    .switchMap( () => keyEventSource
      .filter( ({key}) => key === "r")
      .mapTo( actions.reset() )
    )

const keyBangEpic = (action$, store) =>
  action$.ofType(actions.start)
    .switchMap( () => keyEventSource
      .filter( ({key}) => key === "a")
      .mapTo( actions.doAttack() )
    )

// 時計進める
const startTimerEpic = (action$, store) =>
  action$.ofType(actions.start)
    .switchMap( () =>
      Rx.Observable.interval(frame)
        .takeUntil(action$.ofType(actions.stop))
        .map( () => actions.incrementTime( getTime(store) + 1 ))
    )

const doOpenEpic = (action$, store) =>
  action$.ofType(actions.incrementTime)
    .map( ({payload}) => payload)
    .filter( (payload) => payload === openTiming)
    .map( () => actions.recordOpen( getTime(store) ) )

const doAttackEpic = (action$, store) =>
  action$.ofType(actions.doAttack)
    .map( () => actions.recordAttack( getTime(store) ) )

const judgeEpic = (action$, store) =>
  action$.ofType(actions.recordAttack, actions.recordOpen)
    .bufferCount(2)
    // .filter( items => items.length > 0 )
    .filter( ([first, second]) =>
      (first.type === actions.recordOpen
      && second.type === actions.recordAttack))
    .map( ([first, second]) => second.payload - first.payload )
    .map( (diff) => (0 < diff && diff < getLevel(store))
        ? actions.judge(true)
        : actions.judge(false) )
    .mergeMap( (judge) => [ actions.stop(), judge ])

const debugEpic = (action$, store) =>
  action$
    .do( () => console.log(store.getState()) )
    .ignoreElements()

export const epics = combineEpics(
  startTimerEpic,
  doOpenEpic,
  doAttackEpic,
  judgeEpic,
  keyBangEpic,
  keyStartEpic,
  keyResetEpic,
  debugEpic
)