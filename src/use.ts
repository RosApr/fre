

const cache = new Set()
let currentIndex = 0
let currentPromise = null

const isFinished = (thenable) => {
    return thenable.status === 'fulfilled' || thenable.status === 'rejected'
}
const noop = () => { }
const isThenable = <T>(p: any): boolean => {
    return p instanceof Promise || (p !== null && typeof p === 'object' && typeof p.then === 'function')
}
const promiseConsumer = (thenable) => {
    switch (thenable.status) {
        case 'fulfilled':
            return thenable.value
        case 'rejected':
            throw thenable.reason
        default: {
            thenable.status = 'loading'
            thenable
                .then((value) => {
                    if (thenable.status === 'loading') {
                        thenable.status = 'fulfilled'
                        thenable.value = value
                    }
                }, (error) => {
                    if (thenable.status === 'loading') {
                        thenable.status = 'rejected'
                        thenable.reason = error
                    }
                })
            throw thenable
            // }
        }
    }
}

export const use = <T>(thenable: T) => {
    if (!isThenable(thenable)) throw new Error('params must be a promise!')
    if (cache.has(thenable) && isFinished(thenable)) {
        return thenable.value
    } else {
        cache.add(thenable)
        return promiseConsumer(thenable)
    }
}