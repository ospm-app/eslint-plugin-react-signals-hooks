export function NoImportsNoSemi() {
  const [x, setX] = useState(0)
  setX(x + 1)
  return <div>{x}</div>
}
