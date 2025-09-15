import { render, h, use, Suspense, useMemo, ErrorBoundary } from '../../src/index'

const fetchCartoonCount = () =>
  new Promise((resolve, reject) => {
    setTimeout(() => reject(1), 5000)
  })
function UseDemo() {
    const fetchMemo = useMemo(() => fetchCartoonCount(), [])
  const cartoonCount = use(fetchMemo)
  return <div>{cartoonCount}</div>
}
function App() {
  return (
    <div>
        <ErrorBoundary fallback={<div>occur error!</div>}>
          <Suspense fallback={<div>loading....</div>}>
            <UseDemo />
          </Suspense>
        </ErrorBoundary>
    </div>
  )
}

render(<App />, document.getElementById('app'))
