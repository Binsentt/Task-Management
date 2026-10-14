import { useNavigate } from 'react-router-dom'

function AppLink({ to, onClick, children, ...props }) {
  const navigate = useNavigate()

  function handleClick(event) {
    if (onClick) onClick(event)
    if (event.defaultPrevented) return
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target === '_blank'
    ) {
      return
    }
    event.preventDefault()
    navigate(to)
  }

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}

export default AppLink
