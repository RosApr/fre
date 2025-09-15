import { render, lazy, Suspense, h, ErrorBoundary } from '../../src/index'

const Lazy = lazy(() => {
  return new Promise(resolve =>
    setTimeout(
      () =>
        resolve({
          default: () => <div>load success</div>,
        }),
      3000
    )
  )
})

function errorFn(props) {
  return <div>{props.error.message}</div>
}

const LazyError = lazy(() => {
  return new Promise((resolve, reject) =>
    setTimeout(() => reject(new Error('load error')), 4000)
  )
})
const ErrorCompCallback = ({ value }) => (
  <div>{value || 'occur err...with default behavior'}</div>
)

export function App() {
  return (
    <ErrorBoundary fallback={errorFn}>
      <Suspense fallback={<div>try loading, will occur an error...</div>}>
        <LazyError />
      </Suspense>
      <Suspense fallback={<div>loading...</div>}>
        <Lazy />
      </Suspense>
    </ErrorBoundary>
  )
}

render(<App />, document.getElementById('app'))
