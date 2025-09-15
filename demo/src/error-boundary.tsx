import { render, ErrorBoundary, h } from '../../src/index'

function errorFn(props) {
  return <div>{props.error.message}</div>
}

function App() {
  return (
    <ErrorBoundary fallback={errorFn}>
      <A />
    </ErrorBoundary>
  )
}

function A() {
  throw new Error('error from A')
}

render(<App />, document.getElementById('app'))
